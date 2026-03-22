import { pgTable, uuid, varchar, integer, jsonb, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';
import { trackedUrls } from './messages';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    friendId: uuid('friend_id').references(() => friends.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('analytics_events_tenant_name_idx').on(table.tenantId, table.eventName, table.createdAt),
  ],
);

// Conversion goals (e.g., "フォーム回答", "予約完了", "クーポン利用", "URL経由購入")
export const conversionGoals = pgTable('conversion_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Type: form_response | reservation_complete | coupon_used | url_click | custom
  type: varchar('type', { length: 50 }).notNull(),
  // Optional: link to specific resource (form ID, coupon ID, tracked URL ID, etc.)
  targetId: uuid('target_id'),
  isActive: boolean('is_active').notNull().default(true),
  conversionCount: integer('conversion_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Individual conversion events
export const conversionEvents = pgTable(
  'conversion_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => conversionGoals.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id').references(() => friends.id, { onDelete: 'set null' }),
    // Optional: which tracked URL led to this conversion
    trackedUrlId: uuid('tracked_url_id').references(() => trackedUrls.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').default({}),
    convertedAt: timestamp('converted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('conversion_events_goal_idx').on(table.goalId, table.convertedAt),
  ],
);

export const trafficSources = pgTable('traffic_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  utmParams: jsonb('utm_params').default({}),
  qrCodeData: varchar('qr_code_data', { length: 2000 }),
  friendCount: integer('friend_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
