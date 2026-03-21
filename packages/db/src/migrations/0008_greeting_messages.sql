CREATE TABLE IF NOT EXISTS "greeting_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "name" varchar(100) NOT NULL,
  "messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "greeting_messages_tenant_type_idx" ON "greeting_messages" ("tenant_id", "type");
