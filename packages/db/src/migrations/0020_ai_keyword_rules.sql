-- Add keyword_rules column to ai_configs
ALTER TABLE ai_configs ADD COLUMN IF NOT EXISTS keyword_rules JSONB DEFAULT '[]';
