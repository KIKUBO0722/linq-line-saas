CREATE TABLE IF NOT EXISTS "conversion_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "target_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "conversion_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "conversion_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "goal_id" uuid NOT NULL REFERENCES "conversion_goals"("id") ON DELETE cascade,
  "friend_id" uuid REFERENCES "friends"("id") ON DELETE SET NULL,
  "tracked_url_id" uuid REFERENCES "tracked_urls"("id") ON DELETE SET NULL,
  "metadata" jsonb DEFAULT '{}',
  "converted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "conversion_events_goal_idx" ON "conversion_events" ("goal_id", "converted_at");
