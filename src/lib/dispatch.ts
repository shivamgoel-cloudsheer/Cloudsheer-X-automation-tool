import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, postLog } from "@/db/schema";
import { postTweet, XPostError } from "@/lib/x-post";
import { getValidXAccessToken, refreshXToken } from "@/lib/x-auth";

// X API free tier: 17 posts/day (and 500/month). The quota guard enforces the
// daily cap before anything is claimed.
export const DAILY_CAP = 17;

export type DispatchResult = {
  claimed: number;
  posted: number;
  failed: number;
  skippedQuota: number;
  errors: string[];
};

type Post = typeof posts.$inferSelect;

/** Small human-ish pause between posts. */
function jitter(): Promise<void> {
  return new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
}

function utcDayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** How many tweets have already gone out in the current UTC day. */
async function postsToday(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(postLog)
    .where(gte(postLog.postedAt, utcDayStart()));
  return Number(value);
}

async function releaseClaims(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(posts)
    .set({ dispatchClaimedAt: null })
    .where(and(inArray(posts.id, ids), eq(posts.status, "scheduled")));
}

/**
 * Publishes every claimed-and-due post via the connected X account, never
 * exceeding the free-tier daily cap.
 *
 * Rows are claimed with a single-statement UPDATE (one transaction on
 * neon-http) so overlapping cron pings can't double-post; a claim older than
 * 15 minutes is reclaimable since function maxDuration is 300s.
 */
export async function dispatchDue(maxPerRun = DAILY_CAP): Promise<DispatchResult> {
  const result: DispatchResult = {
    claimed: 0,
    posted: 0,
    failed: 0,
    skippedQuota: 0,
    errors: [],
  };

  // Quota guard: stop before claiming if today's cap is already spent.
  const used = await postsToday();
  const remaining = DAILY_CAP - used;
  if (remaining <= 0) {
    result.skippedQuota = -1; // signal: cap reached, nothing attempted
    return result;
  }
  const limit = Math.min(maxPerRun, remaining);

  const claimedRows = await db.execute<{ id: string }>(sql`
    UPDATE post SET dispatch_claimed_at = now()
    WHERE id IN (
      SELECT id FROM post
      WHERE status = 'scheduled'
        AND scheduled_for IS NOT NULL
        AND scheduled_for <= now()
        AND (dispatch_claimed_at IS NULL
             OR dispatch_claimed_at < now() - interval '15 minutes')
      ORDER BY scheduled_for
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    AND status = 'scheduled'
    AND (dispatch_claimed_at IS NULL
         OR dispatch_claimed_at < now() - interval '15 minutes')
    RETURNING id
  `);

  const claimedIds = claimedRows.rows.map((r) => r.id);
  result.claimed = claimedIds.length;
  if (claimedIds.length === 0) return result;

  const rows = await db
    .select()
    .from(posts)
    .where(inArray(posts.id, claimedIds));

  // Post thread heads before their replies so reply targets exist.
  rows.sort(
    (a, b) =>
      (a.threadParentId ? 1 : 0) - (b.threadParentId ? 1 : 0) ||
      a.threadOrder - b.threadOrder
  );

  let accessToken: string;
  try {
    accessToken = await getValidXAccessToken();
  } catch (err) {
    // Not connected / refresh failed: release claims, retry after a human fix.
    await releaseClaims(claimedIds);
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }

  let tokenRetried = false;

  for (let i = 0; i < rows.length; i++) {
    const p: Post = rows[i];

    // Respect the daily cap mid-run.
    if (result.posted >= remaining) {
      await releaseClaims([p.id]);
      result.skippedQuota++;
      continue;
    }

    // Resolve a reply target for thread members.
    let inReplyToTweetId: string | undefined;
    if (p.threadParentId) {
      const [parent] = await db
        .select({ tweetId: posts.tweetId })
        .from(posts)
        .where(eq(posts.id, p.threadParentId));
      if (!parent?.tweetId) {
        // Head hasn't posted yet; leave this reply for a later run.
        await releaseClaims([p.id]);
        continue;
      }
      inReplyToTweetId = parent.tweetId;
    }

    try {
      const { tweetId } = await postTweet({
        accessToken,
        text: p.body,
        inReplyToTweetId,
      });

      // Guarded by status: if the row was cancelled mid-flight, don't revive it.
      const updated = await db
        .update(posts)
        .set({
          status: "posted",
          tweetId,
          postedAt: new Date(),
          dispatchClaimedAt: null,
          error: null,
        })
        .where(and(eq(posts.id, p.id), eq(posts.status, "scheduled")))
        .returning({ id: posts.id });

      if (updated.length > 0) {
        await db.insert(postLog).values({ tweetId });
        result.posted++;
      }
    } catch (err) {
      if (err instanceof XPostError && err.tokenProblem && !tokenRetried) {
        // One forced refresh, then retry this post from the top.
        tokenRetried = true;
        try {
          accessToken = await refreshXToken();
          i--;
          continue;
        } catch {
          // fall through to abort below
        }
      }

      if (
        err instanceof XPostError &&
        !err.retryable &&
        !err.tokenProblem
      ) {
        // Post-level rejection (duplicate, policy, bad payload): fail just this one.
        await db
          .update(posts)
          .set({ status: "failed", error: err.message, dispatchClaimedAt: null })
          .where(eq(posts.id, p.id));
        result.failed++;
        continue;
      }

      // Token dead, rate limited, or persistent server error: stop the run,
      // release remaining claims, retry on a later ping.
      const remainingIds = rows.slice(i).map((x) => x.id);
      await releaseClaims(remainingIds);
      result.errors.push(err instanceof Error ? err.message : String(err));
      break;
    }

    if (i < rows.length - 1) await jitter();
  }

  return result;
}
