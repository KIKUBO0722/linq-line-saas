CREATE TABLE IF NOT EXISTS "exit_popups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "target_type" varchar(30) NOT NULL DEFAULT 'all',
  "target_id" uuid,
  "title" varchar(255) NOT NULL DEFAULT 'ちょっと待ってください！',
  "message" varchar(500),
  "coupon_code" varchar(100),
  "coupon_label" varchar(255),
  "cta_text" varchar(100) NOT NULL DEFAULT '特典を受け取る',
  "cta_url" varchar(2000),
  "trigger_type" varchar(30) NOT NULL DEFAULT 'exit_intent',
  "delay_seconds" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "show_count" integer NOT NULL DEFAULT 0,
  "click_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
