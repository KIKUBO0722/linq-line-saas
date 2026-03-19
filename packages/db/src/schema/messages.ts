import { pgTable, uuid, varchar, jsonb, boolean, timestamp, bigserial, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { lineAccounts } from './line-accounts';
import { friends } from './friends';

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    lineAccountId: uuid('line_account_id')
      .notNull()
      .references(() => lineAccounts.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    lineEventId: varchar('line_event_id', { length: 255 }),
    sourceUserId: varchar('source_user_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('webhook_events_tenant_created_idx').on(table.tenantId, table.createdAt),
    index('webhook_events_line_event_idx').on(table.lineEventId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    lineAccountId: uuid('line_account_id')
      .notNull()
      .references(() => lineAccounts.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id').references(() => friends.id, { onDelete: 'set null' }),
    direction: varchar('direction', { length: 10 }).notNull(),
    messageType: varchar('message_type', { length: 20 }).notNull(),
    content: jsonb('content').notNull(),
    lineMessageId: varchar('line_message_id', { length: 255 }),
    sendType: varchar('send_type', { length: 20 }),
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    error: jsonb('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_tenant_friend_created_idx').on(
      table.tenantId,
      table.friendId,
      table.createdAt,
    ),
  ],
);

export const richMenus = pgTable('rich_menus', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  lineAccountId: uuid('line_account_id')
    .notNull()
    .references(() => lineAccounts.id, { onDelete: 'cascade' }),
  lineRichMenuId: varchar('line_rich_menu_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  chatBarText: varchar('chat_bar_text', { length: 255 }),
  size: jsonb('size'),
  areas: jsonb('areas'),
  imageUrl: varchar('image_url', { length: 512 }),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
