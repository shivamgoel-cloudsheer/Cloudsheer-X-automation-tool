import { count, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, postLog, styleProfiles, importedTweets } from "@/db/schema";

// All analytics come from our own DB. The X free tier is write-only, so we
// cannot read engagement (likes, impressions, replies) - these metrics are
// about posting activity and free-tier usage.
export async function GET() {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const since = new Date(dayStart);
  since.setUTCDate(since.getUTCDate() - 13);

  const [todayRow, monthRow, totalRow, statusRows, dailyRows, voiceRows, profs] =
    await Promise.all([
      db
        .select({ v: count() })
        .from(postLog)
        .where(sql`${postLog.postedAt} >= ${dayStart}`),
      db
        .select({ v: count() })
        .from(postLog)
        .where(sql`${postLog.postedAt} >= ${monthStart}`),
      db.select({ v: count() }).from(postLog),
      db
        .select({ status: posts.status, n: count() })
        .from(posts)
        .groupBy(posts.status),
      db.execute<{ day: string; n: string }>(sql`
        SELECT to_char(${postLog.postedAt}, 'YYYY-MM-DD') AS day, count(*)::text AS n
        FROM post_log
        WHERE ${postLog.postedAt} >= ${since}
        GROUP BY 1
      `),
      db
        .select({
          pid: posts.styleProfileId,
          status: posts.status,
          n: count(),
        })
        .from(posts)
        .groupBy(posts.styleProfileId, posts.status),
      db
        .select({ id: styleProfiles.id, name: styleProfiles.name })
        .from(styleProfiles),
    ]);

  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = Number(r.n);

  // Fill a 14-day series (UTC), zero for days with no posts.
  const dailyMap = new Map(dailyRows.rows.map((r) => [r.day, Number(r.n)]));
  const daily: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(dayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ day: key, count: dailyMap.get(key) ?? 0 });
  }

  // Per-voice aggregation.
  type Agg = { posted: number; scheduled: number; drafts: number; failed: number; total: number };
  const empty = (): Agg => ({ posted: 0, scheduled: 0, drafts: 0, failed: 0, total: 0 });
  const aggByPid = new Map<string, Agg>();
  for (const r of voiceRows) {
    if (!r.pid) continue;
    const a = aggByPid.get(r.pid) ?? empty();
    const n = Number(r.n);
    a.total += n;
    if (r.status === "posted") a.posted += n;
    else if (r.status === "scheduled") a.scheduled += n;
    else if (r.status === "draft" || r.status === "approved") a.drafts += n;
    else if (r.status === "failed") a.failed += n;
    aggByPid.set(r.pid, a);
  }
  const voices = profs.map((p) => ({ name: p.name, ...(aggByPid.get(p.id) ?? empty()) }));

  // Imported account history (from the X archive). Engagement = likes + RTs.
  const [histAggRows, topPosts, monthlyRows] = await Promise.all([
    db.execute<{ n: string; likes: string; retweets: string }>(sql`
      SELECT count(*)::text n, coalesce(sum(likes),0)::text likes, coalesce(sum(retweets),0)::text retweets
      FROM imported_tweet
    `),
    db
      .select({
        text: importedTweets.text,
        likes: importedTweets.likes,
        retweets: importedTweets.retweets,
        createdAt: importedTweets.createdAt,
      })
      .from(importedTweets)
      .orderBy(desc(importedTweets.likes))
      .limit(5),
    db.execute<{ m: string; n: string; likes: string }>(sql`
      SELECT to_char(created_at,'YYYY-MM') m, count(*)::text n, coalesce(sum(likes),0)::text likes
      FROM imported_tweet GROUP BY 1 ORDER BY 1
    `),
  ]);
  const h = histAggRows.rows[0] ?? { n: "0", likes: "0", retweets: "0" };
  const history = {
    count: Number(h.n),
    likes: Number(h.likes),
    retweets: Number(h.retweets),
    top: topPosts,
    monthly: monthlyRows.rows.map((r) => ({
      month: r.m,
      count: Number(r.n),
      likes: Number(r.likes),
    })),
  };

  return Response.json({
    usage: {
      today: Number(todayRow[0].v),
      dailyCap: 17,
      month: Number(monthRow[0].v),
      monthlyCap: 500,
      total: Number(totalRow[0].v),
    },
    byStatus,
    daily,
    voices,
    history,
  });
}
