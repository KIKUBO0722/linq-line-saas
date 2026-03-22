import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }),
  messageType: varchar('message_type', { length: 20 }).notNull().default('text'),
  // messageType: text | buttons | carousel | image | flex
  messageData: jsonb('message_data'),
  // For buttons: { thumbnailUrl?, title?, text, actions: [{ type, label, uri/data/text }] }
  // For carousel: { columns: [{ thumbnailUrl?, title?, text, actions: [...] }] }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
