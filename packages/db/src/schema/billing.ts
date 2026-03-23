import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp, uniqueIndex, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  priceMonthly: integer('price_monthly').notNull(),
  priceYearly: integer('price_yearly').notNull(),
  messageLimit: integer('message_limit').notNull(),
  friendLimit: integer('friend_limit').notNull(),
  aiTokenLimit: integer('ai_token_limit').notNull(),
  features: jsonb('features').default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('trialing'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    period: varchar('period', { length: 7 }).notNull(),
    messagesSent: integer('messages_sent').notNull().default(0),
    aiTokensUsed: integer('ai_tokens_used').notNull().default(0),
    friendsCount: integer('friends_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('usage_records_tenant_period_idx').on(table.tenantId, table.period)],
);

// --- Agency margin management ---

/** Per-client margin settings for agencies */
export const agencyMargins = pgTable(
  'agency_margins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agencyTenantId: uuid('agency_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientTenantId: uuid('client_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    marginType: varchar('margin_type', { length: 20 }).notNull().default('percentage'),
    marginValue: numeric('margin_value', { precision: 10, scale: 2 }).notNull().default('20'),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('agency_margins_agency_client_idx').on(table.agencyTenantId, table.clientTenantId),
  ],
);

/** Monthly revenue/commission records per client */
export const agencyCommissions = pgTable(
  'agency_commissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agencyTenantId: uuid('agency_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientTenantId: uuid('client_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    period: varchar('period', { length: 7 }).notNull(),
    clientRevenue: integer('client_revenue').notNull().default(0),
    commissionAmount: integer('commission_amount').notNull().default(0),
    marginType: varchar('margin_type', { length: 20 }).notNull(),
    marginValue: numeric('margin_value', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('agency_commissions_period_idx').on(table.agencyTenantId, table.clientTenantId, table.period),
  ],
);
