import { sql } from "drizzle-orm";
import { db } from "@/db";
import { importedTweets } from "@/db/schema";

export const maxDuration = 60;

type IncomingTweet = {
  id?: string;
  text?: string;
  createdAt?: string;
  likes?: number;
  retweets?: number;
  isReply?: boolean;
};

// Receives a chunk of parsed tweets from the client-side archive parser and
// upserts them (keyed by X tweet id, so re-imports refresh engagement counts).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const incoming: IncomingTweet[] = Array.isArray(body?.tweets) ? body.tweets : [];
  if (incoming.length === 0) {
    return Response.json({ error: "No tweets provided." }, { status: 400 });
  }
  if (incoming.length > 2000) {
    return Response.json(
      { error: "Chunk too large; send 2000 or fewer per request." },
      { status: 413 }
    );
  }

  const rows = [];
  for (const t of incoming) {
    if (!t.id || typeof t.id !== "string") continue;
    const created = t.createdAt ? new Date(t.createdAt) : null;
    if (!created || isNaN(created.getTime())) continue;
    rows.push({
      id: t.id,
      text: String(t.text ?? ""),
      createdAt: created,
      likes: Number.isFinite(t.likes) ? Math.max(0, Math.trunc(t.likes!)) : 0,
      retweets: Number.isFinite(t.retweets)
        ? Math.max(0, Math.trunc(t.retweets!))
        : 0,
      isReply: !!t.isReply,
    });
  }

  if (rows.length === 0) {
    return Response.json({ inserted: 0 });
  }

  await db
    .insert(importedTweets)
    .values(rows)
    .onConflictDoUpdate({
      target: importedTweets.id,
      set: {
        text: sql`excluded.text`,
        likes: sql`excluded.likes`,
        retweets: sql`excluded.retweets`,
        isReply: sql`excluded.is_reply`,
        importedAt: new Date(),
      },
    });

  return Response.json({ inserted: rows.length });
}
