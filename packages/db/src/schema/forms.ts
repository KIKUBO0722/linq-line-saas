import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';
import { tags } from './tags';

export const forms = pgTable('forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  fields: jsonb('fields').notNull().default([]),
  thankYouMessage: varchar('thank_you_message', { length: 1000 }),
  tagOnSubmitId: uuid('tag_on_submit_id').references(() => tags.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const formResponses = pgTable('form_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id').references(() => friends.id, { onDelete: 'set null' }),
  answers: jsonb('answers').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});
