import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';

export const aiConfigs = pgTable('ai_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  systemPrompt: varchar('system_prompt', { length: 5000 }),
  model: varchar('model', { length: 50 }).notNull().default('claude-haiku-4-5-20251001'),
  temperature: integer('temperature').notNull().default(7),
  maxTokens: integer('max_tokens').notNull().default(1024),
  knowledgeBase: jsonb('knowledge_base').default([]),
  welcomeMessage: varchar('welcome_message', { length: 2000 }),
  autoReplyEnabled: boolean('auto_reply_enabled').notNull().default(false),
  handoffKeywords: jsonb('handoff_keywords').default([]),
  keywordRules: jsonb('keyword_rules').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id')
    .notNull()
    .references(() => friends.id, { onDelete: 'cascade' }),
  messages: jsonb('messages').notNull().default([]),
  totalTokensUsed: integer('total_tokens_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
