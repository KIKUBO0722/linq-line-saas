-- Migration: Add agency support columns to tenants table
-- Run this on Supabase SQL Editor: https://supabase.com/dashboard/project/xukshmqcfsqtubfaduii/sql

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

-- Index for fast agency → client lookups
CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant_id ON tenants(parent_tenant_id) WHERE parent_tenant_id IS NOT NULL;
