import { pgTable, uuid, varchar, integer, text, boolean, date, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';

export const reservationSlots = pgTable(
  'reservation_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    duration: integer('duration').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reservation_slots_tenant_idx').on(table.tenantId),
  ],
);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => reservationSlots.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id').references(() => friends.id),
    guestName: varchar('guest_name', { length: 200 }),
    date: date('date').notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('confirmed'),
    note: text('note'),
    reminderMinutesBefore: integer('reminder_minutes_before'),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    googleCalendarEventId: varchar('google_calendar_event_id', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reservations_slot_idx').on(table.slotId),
    index('reservations_date_idx').on(table.date),
  ],
);

export const calendarIntegrations = pgTable('calendar_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })
    .unique(),
  provider: varchar('provider', { length: 50 }).notNull().default('google'),
  calendarId: varchar('calendar_id', { length: 500 }),
  credentials: jsonb('credentials').default({}),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
