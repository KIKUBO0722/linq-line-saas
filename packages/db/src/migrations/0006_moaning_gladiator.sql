CREATE TABLE "tracked_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"original_url" varchar(2000) NOT NULL,
	"short_code" varchar(50) NOT NULL,
	"message_id" uuid,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_urls_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "url_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracked_url_id" uuid NOT NULL,
	"friend_id" uuid,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" varchar(500)
);
--> statement-breakpoint
ALTER TABLE "step_messages" ADD COLUMN "branch_true" integer;--> statement-breakpoint
ALTER TABLE "step_messages" ADD COLUMN "branch_false" integer;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "match_type" varchar(10) DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "exclude_tag_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_urls" ADD CONSTRAINT "tracked_urls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_clicks" ADD CONSTRAINT "url_clicks_tracked_url_id_tracked_urls_id_fk" FOREIGN KEY ("tracked_url_id") REFERENCES "public"."tracked_urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_clicks" ADD CONSTRAINT "url_clicks_friend_id_friends_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."friends"("id") ON DELETE set null ON UPDATE no action;