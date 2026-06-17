import { desc } from "drizzle-orm";
import { db } from "@/db";
import { styleProfiles } from "@/db/schema";
import { buildStyleProfile } from "@/lib/generate";
import { GENERATION_MODEL } from "@/lib/anthropic";

export const maxDuration = 120;

export async function GET() {
  const rows = await db
    .select()
    .from(styleProfiles)
    .orderBy(desc(styleProfiles.createdAt));
  return Response.json({ profiles: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.niche || !body?.corpus) {
    return Response.json(
      { error: "name, niche, and corpus are required" },
      { status: 400 }
    );
  }

  const model = body.model || GENERATION_MODEL;

  let profile;
  try {
    profile = await buildStyleProfile(body.corpus, model);
  } catch (err) {
    return Response.json(
      {
        error: `Style analysis failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 502 }
    );
  }

  const [row] = await db
    .insert(styleProfiles)
    .values({
      name: body.name,
      niche: body.niche,
      sourceCorpus: body.corpus,
      profile,
      model,
      autonomous: typeof body.autonomous === "boolean" ? body.autonomous : true,
      postsPerDay:
        typeof body.postsPerDay === "number" ? body.postsPerDay : 3,
    })
    .returning();

  return Response.json({ profile: row });
}
