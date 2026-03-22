import { pgTable, uuid, varchar, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';
import { coupons } from './coupons';

// Gacha campaign settings
export const gachaCampaigns = pgTable('gacha_campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  // max draws per user (0 = unlimited)
  maxDrawsPerUser: integer('max_draws_per_user').notNull().default(1),
  totalDraws: integer('total_draws').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  // Visual style: "slot" | "roulette" | "scratch" | "capsule"
  style: varchar('style', { length: 30 }).notNull().default('capsule'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Prize items for gacha
export const gachaPrizes = pgTable('gacha_prizes', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => gachaCampaigns.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Probability weight (relative, not percentage)
  weight: integer('weight').notNull().default(1),
  // What the prize gives: "coupon" | "message" | "nothing"
  prizeType: varchar('prize_type', { length: 30 }).notNull().default('message'),
  // If coupon, link to coupon
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  // Custom message sent when winning
  winMessage: varchar('win_message', { length: 500 }),
  // Max number of this prize available (0 = unlimited)
  maxQuantity: integer('max_quantity').notNull().default(0),
  wonCount: integer('won_count').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Draw history
export const gachaDraws = pgTable('gacha_draws', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => gachaCampaigns.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id').references(() => friends.id, { onDelete: 'set null' }),
  prizeId: uuid('prize_id').references(() => gachaPrizes.id, { onDelete: 'set null' }),
  drawnAt: timestamp('drawn_at', { withTimezone: true }).defaultNow().notNull(),
});
