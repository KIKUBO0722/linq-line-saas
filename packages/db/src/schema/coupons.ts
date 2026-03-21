import { pgTable, uuid, varchar, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(),
  discountValue: integer('discount_value').notNull(),
  description: text('description'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
