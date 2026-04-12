-- ============================================================================
-- Agency Margins & Commissions Tables
-- ============================================================================
-- Purpose: Track per-client margin settings and monthly commission records
-- for agency-managed LINE accounts.
-- ============================================================================

-- Agency margin settings per client
CREATE TABLE IF NOT EXISTS "agency_margins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "margin_type" varchar(20) DEFAULT 'percentage' NOT NULL,
  "margin_value" numeric(10, 2) DEFAULT '20' NOT NULL,
  "notes" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_margins_agency_client_idx"
  ON "agency_margins" ("agency_tenant_id", "client_tenant_id");

-- Monthly commission records
CREATE TABLE IF NOT EXISTS "agency_commissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "period" varchar(7) NOT NULL,
  "client_revenue" integer DEFAULT 0 NOT NULL,
  "commission_amount" integer DEFAULT 0 NOT NULL,
  "margin_type" varchar(20) NOT NULL,
  "margin_value" numeric(10, 2) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_commissions_period_idx"
  ON "agency_commissions" ("agency_tenant_id", "client_tenant_id", "period");

-- RLS for agency tables
ALTER TABLE "agency_margins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_margins" FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON "agency_margins"
  FOR ALL TO postgres, service_role
  USING (true) WITH CHECK (true);

ALTER TABLE "agency_commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_commissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON "agency_commissions"
  FOR ALL TO postgres, service_role
  USING (true) WITH CHECK (true);
