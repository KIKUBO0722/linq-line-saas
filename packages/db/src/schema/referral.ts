import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';
import { adminUsers } from './auth';

// Tenant-level referral programs (for LINE friends)
export const referralPrograms = pgTable('referral_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  rewardType: varchar('reward_type', { length: 20 }).notNull(),
  rewardConfig: jsonb('reward_config').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const referralCodes = pgTable('referral_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id')
    .notNull()
    .references(() => referralPrograms.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id')
    .notNull()
    .references(() => friends.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(),
  referralCount: integer('referral_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const referralConversions = pgTable('referral_conversions', {
  id: uuid('id').defaultRandom().primaryKey(),
  codeId: uuid('code_id')
    .notNull()
    .references(() => referralCodes.id, { onDelete: 'cascade' }),
  referredFriendId: uuid('referred_friend_id')
    .notNull()
    .references(() => friends.id, { onDelete: 'cascade' }),
  rewardDelivered: boolean('reward_delivered').notNull().default(false),
  convertedAt: timestamp('converted_at', { withTimezone: true }).defaultNow().notNull(),
});

// SaaS-level affiliate (for platform growth)
export const affiliatePartners = pgTable('affiliate_partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  affiliateCode: varchar('affiliate_code', { length: 50 }).notNull().unique(),
  tier: varchar('tier', { length: 20 }).notNull().default('standard'),
  totalEarned: integer('total_earned').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const affiliateReferrals = pgTable('affiliate_referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerId: uuid('partner_id')
    .notNull()
    .references(() => affiliatePartners.id, { onDelete: 'cascade' }),
  referredTenantId: uuid('referred_tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('registered'),
  oneTimePaid: boolean('one_time_paid').notNull().default(false),
  monthlyAmount: integer('monthly_amount').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
