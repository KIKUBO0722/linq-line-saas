import { pgTable, uuid, varchar, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const exitPopups = pgTable('exit_popups', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Where to show: "form" | "all" | specific form ID
  targetType: varchar('target_type', { length: 30 }).notNull().default('all'),
  targetId: uuid('target_id'), // specific form/page ID
  // Popup content
  title: varchar('title', { length: 255 }).notNull().default('ちょっと待ってください！'),
  message: varchar('message', { length: 500 }),
  // Optional coupon to show
  couponCode: varchar('coupon_code', { length: 100 }),
  couponLabel: varchar('coupon_label', { length: 255 }),
  // CTA button
  ctaText: varchar('cta_text', { length: 100 }).notNull().default('特典を受け取る'),
  ctaUrl: varchar('cta_url', { length: 2000 }),
  // Behavior
  triggerType: varchar('trigger_type', { length: 30 }).notNull().default('exit_intent'),
  // delay in seconds before showing (for time-based trigger)
  delaySeconds: integer('delay_seconds').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  // Stats
  showCount: integer('show_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
