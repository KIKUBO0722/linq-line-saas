import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { lineAccounts } from './line-accounts';

export const friends = pgTable(
  'friends',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    lineAccountId: uuid('line_account_id')
      .notNull()
      .references(() => lineAccounts.id, { onDelete: 'cascade' }),
    lineUserId: varchar('line_user_id', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    pictureUrl: varchar('picture_url', { length: 512 }),
    statusMessage: varchar('status_message', { length: 500 }),
    language: varchar('language', { length: 10 }),
    isFollowing: boolean('is_following').notNull().default(true),
    score: integer('score').notNull().default(0),
    customFields: jsonb('custom_fields').default({}),
    followedAt: timestamp('followed_at', { withTimezone: true }),
    unfollowedAt: timestamp('unfollowed_at', { withTimezone: true }),
    trafficSourceId: uuid('traffic_source_id'),
    acquisitionSource: varchar('acquisition_source', { length: 50 }),
    profileSyncedAt: timestamp('profile_synced_at', { withTimezone: true }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    chatStatus: varchar('chat_status', { length: 20 }).notNull().default('unread'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('friends_account_user_idx').on(table.lineAccountId, table.lineUserId),
    index('friends_tenant_idx').on(table.tenantId),
  ],
);
