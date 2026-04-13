import { pgTable, uuid, varchar, integer, numeric, jsonb, text, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';
import { trackedUrls } from './messages';
import { segments } from './segments';
import { tags } from './tags';

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

// Unified broadcasts table — tracks all broadcast types (segment, all, scheduled)
export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'segment', 'all', 'scheduled'
    segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }),
    contentPreview: text('content_preview'),
    messageType: varchar('message_type', { length: 20 }),
    recipientCount: integer('recipient_count').notNull().default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    autoTagOnResponse: uuid('auto_tag_on_response').references(() => tags.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_broadcasts_tenant').on(table.tenantId, table.sentAt),
  ],
);

// Cached broadcast performance stats — updated asynchronously after send
export const broadcastStats = pgTable('broadcast_stats', {
  broadcastId: uuid('broadcast_id')
    .primaryKey()
    .references(() => broadcasts.id, { onDelete: 'cascade' }),
  recipientCount: integer('recipient_count').notNull().default(0),
  responseCount: integer('response_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  clickerCount: integer('clicker_count').notNull().default(0),
  blockCount: integer('block_count').notNull().default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 2 }).default('0'),
  blockRate: numeric('block_rate', { precision: 5, scale: 2 }).default('0'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
});

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
