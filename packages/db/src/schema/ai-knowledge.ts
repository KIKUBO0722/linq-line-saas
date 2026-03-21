import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Global AI knowledge base - shared across all tenants
// This is the "brain" of LinQ's AI marketing consultant
export const aiKnowledge = pgTable('ai_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Categorization
  category: varchar('category', { length: 100 }).notNull(),
  // e.g., "drm", "customer_psychology", "industry", "delivery_design", "copywriting", "line_japan", "success_patterns"
  subcategory: varchar('subcategory', { length: 100 }).notNull(),
  // e.g., "aidma", "scarcity", "beauty_salon", "timing", "headline"

  // Content
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  // Rich structured data (examples, templates, formulas)
  metadata: jsonb('metadata').default({}),

  // Search & matching
  tags: jsonb('tags').default([]),
  // e.g., ["美容", "リピート", "新規", "DRM"]
  industries: jsonb('industries').default([]),
  // e.g., ["beauty", "restaurant", "ec", "all"]

  // Quality & usage tracking
  useCount: integer('use_count').notNull().default(0),
  rating: integer('rating').notNull().default(0),
  // 0-100 quality score, can be updated over time
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
