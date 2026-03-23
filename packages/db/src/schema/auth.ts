import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  invitedBy: uuid('invited_by'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  lineId: varchar('line_id', { length: 255 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  authProvider: varchar('auth_provider', { length: 20 }).notNull().default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
