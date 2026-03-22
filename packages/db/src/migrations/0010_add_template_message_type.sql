ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "message_type" varchar(20) NOT NULL DEFAULT 'text';
ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "message_data" jsonb;
