-- Block events: captures attribution context when a friend unfollows
CREATE TABLE IF NOT EXISTS block_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES friends(id) ON DELETE SET NULL,
  line_user_id VARCHAR(255) NOT NULL,
  last_broadcast_id UUID REFERENCES broadcasts(id) ON DELETE SET NULL,
  hours_since_last_message NUMERIC(8,2),
  friend_age_days INTEGER,
  total_messages_received INTEGER NOT NULL DEFAULT 0,
  blocked_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_block_events_tenant ON block_events(tenant_id, blocked_at DESC);

ALTER TABLE block_events ENABLE ROW LEVEL SECURITY;
