ALTER TABLE "friends" ADD COLUMN IF NOT EXISTS "chat_status" varchar(20) NOT NULL DEFAULT 'unread';
