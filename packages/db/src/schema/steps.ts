import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { friends } from './friends';

export const stepScenarios = pgTable('step_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  triggerType: varchar('trigger_type', { length: 30 }).notNull(),
  triggerConfig: jsonb('trigger_config').default({}),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stepMessages = pgTable('step_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  scenarioId: uuid('scenario_id')
    .notNull()
    .references(() => stepScenarios.id, { onDelete: 'cascade' }),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  condition: jsonb('condition'),
  messageContent: jsonb('message_content').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stepEnrollments = pgTable(
  'step_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => friends.id, { onDelete: 'cascade' }),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => stepScenarios.id, { onDelete: 'cascade' }),
    currentStepIndex: integer('current_step_index').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    nextSendAt: timestamp('next_send_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('step_enrollments_next_send_idx').on(table.nextSendAt)],
);
