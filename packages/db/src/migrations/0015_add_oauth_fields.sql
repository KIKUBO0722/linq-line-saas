-- Add OAuth fields to admin_users for Google/LINE SSO support
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS line_id VARCHAR(255) UNIQUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'email';
