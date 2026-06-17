import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, type PostStatus } from "@/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PostStatus | null;

  const rows = await db
    .select()
    .from(posts)
    .where(status ? eq(posts.status, status) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(200);

  return Response.json({ posts: rows });
}

// Create a manual post: a draft, or scheduled when scheduledFor is given.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.body || typeof body.body !== "string") {
    return Response.json({ error: "body is required" }, { status: 400 });
  }

  const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  const [row] = await db
    .insert(posts)
    .values({
      body: body.body,
      styleProfileId: body.styleProfileId ?? null,
      scheduledFor,
      status: scheduledFor ? "scheduled" : "draft",
    })
    .returning();

  return Response.json({ post: row });
}
