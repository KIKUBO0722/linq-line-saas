-- ============================================================================
-- LinQ RLS (Row Level Security) Migration
-- ============================================================================
--
-- Purpose: Enable RLS on all tables as a defense-in-depth security measure.
--
-- Architecture Context:
--   LinQ uses a NestJS API as the sole database client. The API connects via
--   a service role (postgres) and enforces tenant isolation at the application
--   layer using Drizzle ORM with tenantId filters on every query.
--
-- Current Approach (Phase 1 - Defense in Depth):
--   - Enable RLS + FORCE on all tables
--   - Grant full access to `postgres` and `service_role` (used by the API)
--   - Grant limited SELECT/INSERT to `anon` for public-facing endpoints
--     (form submissions, public booking pages)
--   - This prevents any accidental direct access via Supabase client libraries
--     or REST API from bypassing tenant isolation
--
-- Future Tightening (Phase 2 - Full Tenant Isolation):
--   - Replace permissive service_role policies with tenant-scoped policies
--   - Use SET LOCAL app.tenant_id = '<id>' before each request
--   - Policies would then check: tenant_id = current_setting('app.tenant_id')::uuid
--
-- IMPORTANT: Run this in Supabase SQL Editor. Do NOT run via Drizzle migrate.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Tables WITH tenant_id (tenant-scoped)
-- ============================================================================

-- --- tenants ---
-- Note: tenants table itself has no tenant_id FK but IS tenant data
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tenants
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: limited SELECT for public pages (branding info only)
CREATE POLICY "anon_select_tenant_branding" ON tenants
  FOR SELECT
  TO anon
  USING (true);


-- --- tenant_invitations ---
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tenant_invitations
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- admin_users ---
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON admin_users
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- admin_sessions ---
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON admin_sessions
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- line_accounts ---
ALTER TABLE line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_accounts FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON line_accounts
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- friends ---
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON friends
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- tags ---
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tags
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- friend_tags ---
-- Junction table (no tenant_id directly, but FK to friends/tags which have it)
ALTER TABLE friend_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_tags FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON friend_tags
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- webhook_events ---
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON webhook_events
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- messages ---
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON messages
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- rich_menu_groups ---
ALTER TABLE rich_menu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rich_menu_groups FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON rich_menu_groups
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- rich_menus ---
ALTER TABLE rich_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE rich_menus FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON rich_menus
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- tracked_urls ---
ALTER TABLE tracked_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_urls FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tracked_urls
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- url_clicks ---
-- No tenant_id directly, but FK to tracked_urls which has it
ALTER TABLE url_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_clicks FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON url_clicks
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- step_scenarios ---
ALTER TABLE step_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_scenarios FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON step_scenarios
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- step_messages ---
-- No tenant_id directly, FK to step_scenarios which has it
ALTER TABLE step_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON step_messages
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- step_enrollments ---
-- No tenant_id directly, FK to friends/step_scenarios which have it
ALTER TABLE step_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_enrollments FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON step_enrollments
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- forms ---
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON forms
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: SELECT for public form viewing
CREATE POLICY "anon_select_forms" ON forms
  FOR SELECT
  TO anon
  USING (is_active = true);


-- --- form_responses ---
-- No tenant_id directly, FK to forms which has it
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON form_responses
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: INSERT for public form submissions
CREATE POLICY "anon_insert_form_responses" ON form_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);


-- --- ai_configs ---
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON ai_configs
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- ai_conversations ---
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON ai_conversations
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- analytics_events ---
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON analytics_events
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- conversion_goals ---
ALTER TABLE conversion_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_goals FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON conversion_goals
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- conversion_events ---
-- No tenant_id directly, FK to conversion_goals which has it
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON conversion_events
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- traffic_sources ---
ALTER TABLE traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_sources FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON traffic_sources
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- subscriptions ---
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON subscriptions
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- usage_records ---
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON usage_records
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- agency_margins ---
ALTER TABLE agency_margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_margins FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON agency_margins
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- agency_commissions ---
ALTER TABLE agency_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_commissions FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON agency_commissions
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- referral_programs ---
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON referral_programs
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- referral_codes ---
-- No tenant_id directly, FK to referral_programs which has it
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON referral_codes
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- referral_conversions ---
-- No tenant_id directly, FK chain via referral_codes
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON referral_conversions
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- affiliate_partners ---
-- No tenant_id, FK to admin_users
ALTER TABLE affiliate_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_partners FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON affiliate_partners
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- affiliate_referrals ---
-- Has referred_tenant_id but not a standard tenant_id pattern
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON affiliate_referrals
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- message_templates ---
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON message_templates
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- segments ---
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON segments
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- segment_broadcasts ---
-- No tenant_id directly, FK to segments which has it
ALTER TABLE segment_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_broadcasts FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON segment_broadcasts
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- coupons ---
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON coupons
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- reservation_slots ---
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON reservation_slots
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: SELECT for public booking page
CREATE POLICY "anon_select_reservation_slots" ON reservation_slots
  FOR SELECT
  TO anon
  USING (is_active = true);


-- --- reservations ---
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON reservations
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: INSERT for public booking submissions
CREATE POLICY "anon_insert_reservations" ON reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);


-- --- calendar_integrations ---
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON calendar_integrations
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- greeting_messages ---
ALTER TABLE greeting_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE greeting_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON greeting_messages
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- gacha_campaigns ---
ALTER TABLE gacha_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_campaigns FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON gacha_campaigns
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- gacha_prizes ---
-- No tenant_id directly, FK to gacha_campaigns which has it
ALTER TABLE gacha_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_prizes FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON gacha_prizes
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- gacha_draws ---
-- No tenant_id directly, FK to gacha_campaigns which has it
ALTER TABLE gacha_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_draws FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON gacha_draws
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- --- exit_popups ---
ALTER TABLE exit_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_popups FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON exit_popups
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- SECTION 2: Tables WITHOUT tenant_id (global/shared data)
-- ============================================================================

-- --- plans ---
-- Global pricing plans, no tenant scope
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON plans
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);

-- Anon: SELECT so pricing page can read plans
CREATE POLICY "anon_select_plans" ON plans
  FOR SELECT
  TO anon
  USING (is_active = true);


-- --- ai_knowledge ---
-- Global knowledge base, no tenant scope
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON ai_knowledge
  FOR ALL
  TO postgres, service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- SECTION 3: Verification query (run after applying to confirm)
-- ============================================================================
-- Uncomment and run to verify all tables have RLS enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Expected: all rows should show rowsecurity = true
-- ============================================================================
