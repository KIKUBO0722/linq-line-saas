import { pgTable, uuid, varchar, text, json, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const segments = pgTable('segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  tagIds: json('tag_ids').$type<string[]>().notNull().default([]),
  matchType: varchar('match_type', { length: 10 }).notNull().default('any'),
  excludeTagIds: json('exclude_tag_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const segmentBroadcasts = pgTable('segment_broadcasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => segments.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  recipientCount: integer('recipient_count').notNull().default(0),
});
