import { pgTable, uuid, varchar, timestamp, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('tags_tenant_name_idx').on(table.tenantId, table.name)],
);

export const friendTags = pgTable(
  'friend_tags',
  {
    friendId: uuid('friend_id')
      .notNull()
      .references(() => friends.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.friendId, table.tagId] })],
);
