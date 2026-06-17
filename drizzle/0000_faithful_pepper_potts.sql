CREATE TABLE "post_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tweet_id" text,
	"posted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_profile_id" uuid,
	"body" text NOT NULL,
	"media_urls" jsonb,
	"thread_parent_id" uuid,
	"thread_order" integer DEFAULT 0 NOT NULL,
	"source_topic" text,
	"source_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp,
	"dispatch_claimed_at" timestamp,
	"tweet_id" text,
	"posted_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"niche" text NOT NULL,
	"source_corpus" text NOT NULL,
	"profile" jsonb,
	"model" text DEFAULT 'claude-haiku-4-5' NOT NULL,
	"autonomous" boolean DEFAULT true NOT NULL,
	"posts_per_day" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "x_account" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"x_user_id" text,
	"x_username" text,
	"access_token" text,
	"refresh_token" text,
	"expires_at" integer,
	"scope" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_style_profile_id_style_profile_id_fk" FOREIGN KEY ("style_profile_id") REFERENCES "public"."style_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_log_posted_idx" ON "post_log" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "post_dispatch_idx" ON "post" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "post_profile_idx" ON "post" USING btree ("style_profile_id");--> statement-breakpoint
CREATE INDEX "style_profile_created_idx" ON "style_profile" USING btree ("created_at");