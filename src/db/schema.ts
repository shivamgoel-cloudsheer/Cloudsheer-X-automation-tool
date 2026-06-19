import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Team members. Shared workspace: everyone who signs up sees the same voices,
// posts, and the single connected X account. Signup is gated by an invite code
// (SIGNUP_CODE), so this table only ever holds approved teammates.
// ---------------------------------------------------------------------------
export const users = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  // scrypt hash, stored as "salt:hash"
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Single connected X (Twitter) account. Exactly one row, id = "default".
// Holds the OAuth 2.0 user-context tokens; refreshed in place by x-auth.ts.
// ---------------------------------------------------------------------------
export const xAccount = pgTable("x_account", {
  id: text("id").primaryKey().default("default"),
  xUserId: text("x_user_id"),
  xUsername: text("x_username"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  // Unix seconds (mirrors the OAuth `expires_at` convention). X access tokens
  // live ~2h; the refresh token is rotated on every refresh.
  expiresAt: integer("expires_at"),
  scope: text("scope"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Style profile: a reusable "voice" built once from pasted example posts.
// Injected into every generation so posts sound like the chosen influencer.
// ---------------------------------------------------------------------------
export type StoredStyleProfile = {
  voice: string; // overall voice/tone in a sentence or two
  sentenceStyle: string; // length + punctuation/rhythm habits
  emojiUse: string; // none | sparing | frequent, which kinds
  hashtagUse: string; // none | sparing | frequent, which kinds
  openingPatterns: string[]; // how posts typically open / hook
  closingPatterns: string[]; // how posts typically land / CTA
  vocabulary: string[]; // characteristic words, phrases, slang
  topics: string[]; // recurring subject matter
  avoid: string[]; // things this voice never does
  examplePosts: string[]; // 3-5 verbatim posts for few-shot calibration
};

export const styleProfiles = pgTable(
  "style_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    niche: text("niche").notNull(),
    // Raw pasted corpus the profile was distilled from (kept for re-analysis)
    sourceCorpus: text("source_corpus").notNull(),
    profile: jsonb("profile").$type<StoredStyleProfile>(),
    // Generation model id; configurable per profile, defaults to Haiku
    model: text("model").notNull().default("claude-haiku-4-5"),
    // When true the daily job generates AND schedules without human review
    autonomous: boolean("autonomous").notNull().default(true),
    // Target posts/day this profile aims to publish (within the 17/day cap)
    postsPerDay: integer("posts_per_day").notNull().default(3),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("style_profile_created_idx").on(t.createdAt)]
);

// ---------------------------------------------------------------------------
// Post: one tweet (or one tweet in a thread) moving through the state machine
//   draft -> approved -> scheduled -> posting -> posted
//                              \-> failed / cancelled
// ---------------------------------------------------------------------------
export type PostStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "posting"
  | "posted"
  | "failed"
  | "cancelled";

export const posts = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    styleProfileId: uuid("style_profile_id").references(
      () => styleProfiles.id,
      { onDelete: "set null" }
    ),
    body: text("body").notNull(),
    mediaUrls: jsonb("media_urls").$type<string[]>(),
    // Thread support: the head post has a null parent; reply rows point at the
    // head and post in `threadOrder`.
    threadParentId: uuid("thread_parent_id"),
    threadOrder: integer("thread_order").notNull().default(0),
    // Provenance for traceability + the dashboard
    sourceTopic: text("source_topic"),
    sourceUrl: text("source_url"),
    status: text("status").$type<PostStatus>().notNull().default("draft"),
    // When this post is due to publish (DB-backed scheduling; a cron-pinged
    // dispatcher publishes due rows since X has no server-side scheduling).
    scheduledFor: timestamp("scheduled_for"),
    // Dispatcher mutex: claimed rows are skipped by concurrent runs; a claim
    // older than 15 min is reclaimable since function maxDuration is 300s.
    dispatchClaimedAt: timestamp("dispatch_claimed_at"),
    tweetId: text("tweet_id"),
    postedAt: timestamp("posted_at"),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Hot path for the dispatcher: status='scheduled' AND scheduled_for <= now()
    index("post_dispatch_idx").on(t.status, t.scheduledFor),
    index("post_profile_idx").on(t.styleProfileId),
  ]
);

// ---------------------------------------------------------------------------
// Append-only log of published tweets. The free-tier quota guard counts rows
// for the current UTC day here, cheaply, instead of scanning `post`.
// ---------------------------------------------------------------------------
export const postLog = pgTable(
  "post_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tweetId: text("tweet_id"),
    postedAt: timestamp("posted_at").notNull().defaultNow(),
  },
  (t) => [index("post_log_posted_idx").on(t.postedAt)]
);

// ---------------------------------------------------------------------------
// Historical tweets imported from the user's X data archive (tweets.js). The
// free X API is write-only, so this is the only way to bring in past posts and
// their engagement. Keyed by the X tweet id so re-imports upsert (no dupes).
// Engagement = likes + retweets (replies/impressions are not in the archive).
// ---------------------------------------------------------------------------
export const importedTweets = pgTable(
  "imported_tweet",
  {
    id: text("id").primaryKey(), // X tweet id_str
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull(),
    likes: integer("likes").notNull().default(0),
    retweets: integer("retweets").notNull().default(0),
    isReply: boolean("is_reply").notNull().default(false),
    importedAt: timestamp("imported_at").notNull().defaultNow(),
  },
  (t) => [index("imported_tweet_created_idx").on(t.createdAt)]
);
