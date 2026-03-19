import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const lineAccounts = pgTable('line_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  channelId: varchar('channel_id', { length: 255 }).notNull().unique(),
  channelSecret: varchar('channel_secret', { length: 512 }).notNull(),
  channelAccessToken: varchar('channel_access_token', { length: 512 }).notNull(),
  botName: varchar('bot_name', { length: 255 }),
  webhookUrl: varchar('webhook_url', { length: 512 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
