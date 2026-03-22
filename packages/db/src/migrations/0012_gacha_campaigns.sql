CREATE TABLE IF NOT EXISTS "gacha_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "description" varchar(1000),
  "max_draws_per_user" integer NOT NULL DEFAULT 1,
  "total_draws" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "start_at" timestamp with time zone,
  "end_at" timestamp with time zone,
  "style" varchar(30) NOT NULL DEFAULT 'capsule',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gacha_prizes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "gacha_campaigns"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "weight" integer NOT NULL DEFAULT 1,
  "prize_type" varchar(30) NOT NULL DEFAULT 'message',
  "coupon_id" uuid REFERENCES "coupons"("id") ON DELETE SET NULL,
  "win_message" varchar(500),
  "max_quantity" integer NOT NULL DEFAULT 0,
  "won_count" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "gacha_draws" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "gacha_campaigns"("id") ON DELETE cascade,
  "friend_id" uuid REFERENCES "friends"("id") ON DELETE SET NULL,
  "prize_id" uuid REFERENCES "gacha_prizes"("id") ON DELETE SET NULL,
  "drawn_at" timestamp with time zone DEFAULT now() NOT NULL
);
