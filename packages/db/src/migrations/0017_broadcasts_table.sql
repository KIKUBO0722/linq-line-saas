-- Unified broadcasts table for all broadcast types (segment, all, scheduled)
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  title VARCHAR(255),
  content_preview TEXT,
  message_type VARCHAR(20),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  auto_tag_on_response UUID REFERENCES tags(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant ON broadcasts(tenant_id, sent_at DESC);

-- Cached broadcast performance stats
CREATE TABLE IF NOT EXISTS broadcast_stats (
  broadcast_id UUID PRIMARY KEY REFERENCES broadcasts(id) ON DELETE CASCADE,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  clicker_count INTEGER NOT NULL DEFAULT 0,
  block_count INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  block_rate NUMERIC(5,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link messages to broadcasts
ALTER TABLE messages ADD COLUMN IF NOT EXISTS broadcast_id UUID REFERENCES broadcasts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_broadcast ON messages(broadcast_id) WHERE broadcast_id IS NOT NULL;

-- Fix: segment_broadcasts missing tenant_id (multi-tenant violation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'segment_broadcasts' AND column_name = 'tenant_id') THEN
    ALTER TABLE segment_broadcasts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE segment_broadcasts sb SET tenant_id = s.tenant_id FROM segments s WHERE sb.segment_id = s.id;
  END IF;
END $$;

-- RLS policies for new tables
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_stats ENABLE ROW LEVEL SECURITY;
