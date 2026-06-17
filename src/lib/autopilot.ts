import { eq } from "drizzle-orm";
import { db } from "@/db";
import { styleProfiles, posts, type StoredStyleProfile } from "@/db/schema";
import { getTrends } from "@/lib/trends";
import { generatePost } from "@/lib/generate";
import { DAILY_CAP } from "@/lib/dispatch";

export type ProcessSummary = {
  profiles: number;
  generated: number;
  scheduled: number;
  drafted: number;
  errors: string[];
};

/**
 * Spread `count` posts across roughly the next 12 hours, first one ~5 min out,
 * at least a few minutes apart, with jitter so they don't look robotic.
 */
export function scheduleTimes(count: number, fromMs = Date.now()): Date[] {
  if (count <= 0) return [];
  const windowMs = 12 * 60 * 60 * 1000;
  const gap = count > 1 ? Math.min(windowMs / count, 3 * 60 * 60 * 1000) : 0;
  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    const base = fromMs + 5 * 60 * 1000 + i * gap;
    const spread = Math.min(gap, 20 * 60 * 1000);
    const j = (Math.random() - 0.5) * spread;
    times.push(new Date(base + j));
  }
  return times;
}

/**
 * Generate posts for one profile from current trends. When `schedule` is true
 * they go straight to `scheduled` (autonomous); otherwise they land as `draft`
 * for human review. Returns the number created.
 */
async function generateForProfile(
  profile: typeof styleProfiles.$inferSelect,
  count: number,
  schedule: boolean
): Promise<number> {
  if (count <= 0 || !profile.profile) return 0;
  const trends = await getTrends(profile.niche, {
    limit: Math.max(count, 3),
    model: profile.model,
  });
  if (trends.length === 0) return 0;

  const n = Math.min(count, trends.length);
  const times = schedule ? scheduleTimes(n) : [];
  let created = 0;

  for (let i = 0; i < n; i++) {
    const t = trends[i];
    const body = await generatePost({
      profile: profile.profile as StoredStyleProfile,
      topic: t.topic,
      whyNow: t.whyNow,
      niche: profile.niche,
      model: profile.model,
    });
    await db.insert(posts).values({
      styleProfileId: profile.id,
      body,
      sourceTopic: t.topic,
      sourceUrl: t.sourceUrl,
      status: schedule ? "scheduled" : "draft",
      scheduledFor: schedule ? times[i] : null,
    });
    created++;
  }
  return created;
}

/**
 * Daily job: for every analyzed profile, pull trends and generate posts.
 * Autonomous profiles schedule directly; the rest produce drafts to review.
 * Total scheduled across all profiles is capped at the free-tier daily limit.
 */
export async function runDailyProcess(): Promise<ProcessSummary> {
  const summary: ProcessSummary = {
    profiles: 0,
    generated: 0,
    scheduled: 0,
    drafted: 0,
    errors: [],
  };

  const profs = await db.select().from(styleProfiles);
  let budget = DAILY_CAP; // shared scheduling budget across profiles this run

  for (const prof of profs) {
    if (!prof.profile) continue; // not analyzed yet
    summary.profiles++;
    try {
      if (prof.autonomous) {
        const want = Math.max(0, Math.min(prof.postsPerDay, budget));
        const created = await generateForProfile(prof, want, true);
        summary.generated += created;
        summary.scheduled += created;
        budget -= created;
      } else {
        const created = await generateForProfile(prof, prof.postsPerDay, false);
        summary.generated += created;
        summary.drafted += created;
      }
    } catch (err) {
      summary.errors.push(
        `${prof.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return summary;
}

/** Used by the "Generate draft now" action: makes `count` drafts to review. */
export async function generateDrafts(
  profileId: string,
  count = 1
): Promise<number> {
  const [prof] = await db
    .select()
    .from(styleProfiles)
    .where(eq(styleProfiles.id, profileId));
  if (!prof) throw new Error("Profile not found.");
  if (!prof.profile) throw new Error("Profile has not been analyzed yet.");
  return generateForProfile(prof, count, false);
}
