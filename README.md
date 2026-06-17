# Cloudsheer X

Autonomous X (Twitter) posting. It learns an influencer's writing voice from
pasted examples, pulls trending topics for your niche each day, writes posts in
that voice with Claude, and publishes them to a single X account on a schedule -
all on free infrastructure.

## How it works

```
Daily (Vercel cron) -> /api/process
  trends.ts   pull fresh headlines (Google News RSS + Hacker News), Claude ranks them
  generate.ts Claude (Haiku by default) writes posts in the stored style profile
  autopilot   autonomous voices get scheduled across the day, within the daily cap

Every ~10 min (cron-job.org) -> /api/dispatch
  quota guard (<= 17 posts / UTC day)
  atomic claim of due posts, publish via the X API, store the tweet id
```

Everything in the "analyze" half is sourced outside the X API, because the X
**free tier is write-only** (no timeline reads, search, or trends). Trends come
from public RSS/JSON feeds; an influencer's voice comes from posts you paste in
once and Claude distils into a reusable style profile.

## Stack (all free tiers)

- **Next.js 16** (App Router) on **Vercel Hobby**
- **Neon** Postgres + **Drizzle ORM**
- **X API free tier** - OAuth 2.0 user context, `POST /2/tweets` only
- **Anthropic (Claude)** - writes posts and ranks trends (pay-per-token, cents)
- A single shared **password gate** is the only auth (one X account, internal tool)

## Free-tier limits and how they are respected

- **17 posts/day, 500/month**: a quota guard counts `post_log` rows for the
  current UTC day and refuses to claim once the cap is hit. The autonomous
  scheduler spreads posts across the day within the cap.
- **Vercel Hobby cron is daily-only**: an external cron-job.org GET pings
  `/api/dispatch` every ~10 minutes so scheduled posts go out on time; Vercel's
  one daily cron runs `/api/process`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in:
   - `AUTH_SECRET`, `ACCESS_PASSWORD` - the gate
   - `DATABASE_URL` - a Neon free project
   - `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_CALLBACK_URL` - an X app with OAuth 2.0
     enabled (scopes: tweet.read, tweet.write, users.read, offline.access)
   - `ANTHROPIC_API_KEY`, optional `GENERATION_MODEL` (default `claude-haiku-4-5`)
   - `CRON_SECRET` - shared bearer for the cron endpoints
3. `npm run db:push` to create the tables
4. `npm run dev`, open the app, enter the access password
5. Connect the X account (one-time consent), then create a voice

## Deploy

- Push to GitHub; import to Vercel (Hobby); set the env vars (use the production
  `X_CALLBACK_URL`).
- `vercel.json` already declares the daily `/api/process` cron.
- Add a free cron-job.org job: `GET https://<app>/api/dispatch` every 10 minutes
  with header `Authorization: Bearer <CRON_SECRET>`.

## Routes

| Route | Purpose |
|---|---|
| `GET /api/x/connect` / `callback` / `status` | one-time X OAuth + status |
| `GET /api/dispatch` | cron: publish due posts (Bearer `CRON_SECRET`) |
| `GET /api/process` | daily cron: generate + schedule, then dispatch |
| `POST /api/run` | manual trigger from the dashboard (behind the gate) |
| `/api/profiles`, `/api/profiles/[id]`, `/[id]/generate` | voices |
| `/api/posts`, `/api/posts/[id]`, `/api/posts/status` | the post queue |

## Notes

- Mimic style, never identity. The generator is told to match the voice, not
  impersonate or name the author.
- No em-dashes in generated copy (Cloudsheer convention) - it uses hyphens.
