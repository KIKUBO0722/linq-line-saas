import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * greeting_messages — あいさつメッセージ設定
 * type:
 *   - new_follow: 新規友だち追加時
 *   - re_follow:  再フォロー（ブロック解除後）時
 *   - unblock:    ブロック解除時（≒ re_follow、将来の拡張用）
 */
export const greetingMessages = pgTable('greeting_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // new_follow | re_follow | unblock
  name: varchar('name', { length: 100 }).notNull(),
  messages: jsonb('messages').notNull().default([]),
  // messages format: [{ type: 'text', text: '...' }, { type: 'image', originalContentUrl: '...', previewImageUrl: '...' }]
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
