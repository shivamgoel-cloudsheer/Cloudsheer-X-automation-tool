import { count, desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { posts, postLog } from "@/db/schema";

// Polled by the queue UI every few seconds: status counts, today's published
// count (against the 17/day cap), and the most recent posts.
export async function GET() {
  const grouped = await db
    .select({ status: posts.status, n: count() })
    .from(posts)
    .groupBy(posts.status);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = Number(g.n);

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [{ value: postedToday }] = await db
    .select({ value: count() })
    .from(postLog)
    .where(gte(postLog.postedAt, dayStart));

  const recent = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(50);

  return Response.json({
    counts,
    postedToday: Number(postedToday),
    dailyCap: 17,
    posts: recent,
  });
}
