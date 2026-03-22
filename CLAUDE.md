# LinQ - AI-Powered LINE Marketing SaaS

## Quick Reference
- **Build**: `pnpm build` (Turborepo, all packages)
- **Dev API**: `pnpm preview:start api` (port 3601, NestJS)
- **Dev Web**: `pnpm preview:start web` (port 3600, Next.js + Turbopack)
- **Test**: `pnpm test` (Jest)
- **Format**: `pnpm format`
- **Lint**: `pnpm lint`
- **DB migrate**: Drizzle Kit via `packages/db`

## Architecture

```
apps/
  api/          NestJS REST API (port 3601)
  web/          Next.js 15 frontend (port 3600)
packages/
  db/           Drizzle ORM schemas + migrations (PostgreSQL on Supabase)
  shared/       Shared types and utilities
```

### API Modules (apps/api/src/modules/)
accounts, ai, analytics, auth, billing, coupons, exit-popups, forms,
friends, gacha, greetings, line, messages, queue, referral, reservations,
rich-menus, segments, steps, tags, templates, webhook

### Frontend Routes (apps/web/src/app/(dashboard)/)
overview, messages, friends, forms, steps, segments, tags, templates,
rich-menus, analytics, ai, auto-reply, coupons, exit-popups, gacha,
reservations, referral, settings, tutorial

### DB Schemas (packages/db/src/schema/)
21 schema files: tenants, auth, line-accounts, friends, messages,
forms, steps, segments, tags, templates, rich-menus, greetings,
billing, analytics, ai, coupons, exit-popups, gacha, reservations,
referral, ai-knowledge

## Tech Stack
- **API**: NestJS 11, Drizzle ORM, BullMQ, @nestjs/schedule
- **Frontend**: Next.js 15, Tailwind CSS, Shadcn/UI, Recharts, Lucide icons
- **DB**: PostgreSQL (Supabase), Redis (BullMQ)
- **AI**: Google Gemini 2.5 Flash (auto-reply, copilot, onboarding)
- **LINE**: @line/bot-sdk v10 (messaging, rich menus, webhook)
- **Billing**: Stripe (subscriptions, usage tracking)
- **Auth**: Argon2 password hashing, session-based (7-day expiry)

## Multi-Tenant Design
- ALL queries MUST filter by `tenantId`
- Controllers use `@TenantId()` decorator from AuthGuard
- Foreign keys enforce tenant isolation at DB level
- Never expose data across tenant boundaries

## Coding Standards
- TypeScript strict mode
- ESLint + Prettier enforced
- Use class-validator DTOs for input validation on all endpoints
- Use Drizzle's `eq()` / `and()` for queries, never raw SQL strings
- Service methods should catch errors and log with NestJS Logger
- Japanese UI text throughout (user-facing), English in code/comments

## Important Patterns
- **Cron jobs**: `@Cron(EVERY_MINUTE)` in scheduler services (messages, steps, reservations)
- **LINE webhook**: Signature validation required, event deduplication via lineEventId
- **AI Copilot**: Generates content and inserts directly into forms (Notion AI pattern)
- **Empty states**: Custom SVG illustrations with actionable CTAs
- **Skeleton loaders**: Used on all data-fetching pages

## Current Priorities
- Strengthen analytics (cohort analysis, pseudo-CTR, segment comparison)
- Add friend timeline (action history)
- Improve error handling across all services
- Add class-validator DTOs to remaining endpoints
- Reduce `any` types throughout codebase
