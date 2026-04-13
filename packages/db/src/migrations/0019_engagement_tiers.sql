-- Engagement tier columns on friends table
ALTER TABLE friends ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE friends ADD COLUMN IF NOT EXISTS engagement_tier VARCHAR(10) NOT NULL DEFAULT 'unknown';
CREATE INDEX IF NOT EXISTS friends_tenant_tier_idx ON friends(tenant_id, engagement_tier);

-- Backfill last_interaction_at from inbound messages
UPDATE friends SET last_interaction_at = sub.last_msg
FROM (
  SELECT friend_id, MAX(created_at) AS last_msg
  FROM messages
  WHERE direction = 'inbound' AND friend_id IS NOT NULL
  GROUP BY friend_id
) sub
WHERE friends.id = sub.friend_id AND friends.last_interaction_at IS NULL;

-- Backfill from url_clicks (if newer than existing value)
UPDATE friends SET last_interaction_at = sub.last_click
FROM (
  SELECT friend_id, MAX(clicked_at) AS last_click
  FROM url_clicks
  WHERE friend_id IS NOT NULL
  GROUP BY friend_id
) sub
WHERE friends.id = sub.friend_id
  AND (friends.last_interaction_at IS NULL OR sub.last_click > friends.last_interaction_at);

-- Initial tier computation
UPDATE friends SET engagement_tier = CASE
  WHEN last_interaction_at >= NOW() - INTERVAL '7 days' THEN 'active'
  WHEN last_interaction_at >= NOW() - INTERVAL '30 days' THEN 'warm'
  WHEN last_interaction_at >= NOW() - INTERVAL '90 days' THEN 'cold'
  WHEN last_interaction_at IS NOT NULL THEN 'dormant'
  WHEN followed_at IS NOT NULL AND followed_at < NOW() - INTERVAL '90 days' THEN 'dormant'
  ELSE 'unknown'
END;
