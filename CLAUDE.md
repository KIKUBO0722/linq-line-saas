# LinQ - AI-Powered LINE Marketing SaaS

## 最重要ルール（絶対厳守）
> **「L-Step」「エルメ」「Liny」を模倣しながら、AI機能でこれらを超えるLINE拡張システムを作ること。**
> これがLinQのコンセプトであり、事業計画であり、全ての設計・実装判断の最上位基準である。
> - 競合3社の機能は最低限カバーする（機能的劣位を作らない）
> - AI（Copilot・自動応答・分析）で競合にない価値を提供し差別化する
> - 判断に迷ったら「競合ユーザーが乗り換えたくなるか？」を基準にする

## Quick Reference
- **Build**: `pnpm build` (Turborepo, all packages)
- **Dev API**: `pnpm preview:start api` (port 3601, NestJS)
- **Dev Web**: `pnpm preview:start web` (port 3600, Next.js + Turbopack)
- **Test**: `pnpm test` (Jest)
- **Format**: `pnpm format`
- **Lint**: `pnpm lint`
- **DB migrate**: Drizzle Kit via `packages/db`
- **Deploy Frontend**: `npx vercel --prod` (Git pushではデプロイされない)
- **Deploy API**: Render自動デプロイ (`KIKUBO0722/linq-line-saas` push時)

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
- **AI**: Anthropic Claude Sonnet 4 (auto-reply, copilot, onboarding)
- **LINE**: @line/bot-sdk v10 (messaging, rich menus, webhook)
- **Billing**: Stripe (subscriptions, usage tracking)
- **Auth**: Argon2 password hashing, session-based (7-day expiry), Google OAuth

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
- **Cron jobs**: `@Cron(EVERY_MINUTE)` in scheduler services (messages, steps, reservations)。friends.scheduler.tsのみ`EVERY_6_HOURS`
- **LINE webhook**: Signature validation required, event deduplication via lineEventId
- **AI Copilot**: Generates content and inserts directly into forms (Notion AI pattern)。よくある質問は定型回答、クリエイティブ生成はAIのハイブリッド構造（方針確定済み）
- **Empty states**: Custom SVG illustrations with actionable CTAs
- **Skeleton loaders**: Used on all data-fetching pages
- **専門用語禁止**: ウォーム→やや停滞、コールド→停滞中、CV→成果、CTR→クリック率、セグメント配信→絞り込み配信。代理店+一般ユーザー両方が使う前提

## Important Notes
- **AI Copilot**: 応答失敗時はバックエンドのpageContextMap（ai.service.ts）を確認。全ページにコンテキスト定義が必要
- **連携ルール**: AI Copilotの`welcomeMessage` → `greetingForm`に流し込み+タブ自動切替（ai/page.tsx）。aiConfigs.welcomeMessageにも保存（フォールバック用）。greetingMessagesテーブルへの保存はユーザーが「保存」押下時
- **禁止**: UI上の短いラベル・バッジの改行回り込み → whitespace-nowrapで防ぐ
- **UIレイアウト方針**: カードグリッド禁止。テーブル/リスト型で情報密度を確保。padding/gap最小限。Linear/Notion的なプロフェッショナルUI
- **segments PATCH**: `PATCH /api/v1/segments/:id` — name, description, tagIds, matchType, excludeTagIds を部分更新可能（UpdateSegmentDto）
- **analytics health API**: `GET /api/v1/analytics/health?days=N` — 純増数・ブロック率・アクティブ率・反応率を前期比付きで返す。KPIバーと概要タブで使用
- **analytics alerts API**: `GET /api/v1/analytics/alerts` — 直近7日の指標を分析し意思決定アラートを生成（ブロック率急上昇・純減・アクティブ率低下等）
- **ブロック率閾値**: 2%超で警告色（赤）表示。LINE業界平均1-2%が根拠
- **broadcasts テーブル**: 全配信タイプ（segment/all/scheduled）を統一管理。messages.broadcast_idで紐付け。配信別の効果測定の基盤
- **broadcast_stats テーブル**: 配信別の集計キャッシュ（反応数・クリック数・ブロック数）。非同期で更新
- **連携ルール**: 配信送信時は必ずbroadcastsにレコード作成→そのIDをmessages.broadcastIdにセット（segments.service.ts, messages.service.ts両方）
- **配信別分析API**: `GET /analytics/broadcast-performance?days=N` — 配信一覧+反応率・クリック数・ブロック率。`GET /analytics/broadcast-performance/:id` — 受信者別アクション詳細
- **反応率の定義**: URLクリック(高信頼) + 3h以内の返信(中信頼)のユニーク数 / 送信数。UIに「推定値」注記を表示
- **block_events テーブル**: ブロック時のコンテキスト記録（帰属配信、最終メッセージからの時間、友だち歴、累計受信数）。相関データであり因果ではない
- **連携ルール**: unfollow webhook受信時、recordBlockEvent（analytics.service.ts）→ markUnfollowed（friends.service.ts）の順で実行。recordBlockEventは失敗してもthrowしない
- **ブロック分析API**: `GET /analytics/block-analysis?days=N` — summary（集計）+ insights（パターン検知→改善提案）+ broadcastBlockRanking（配信別TOP10）
- **insightsの閾値**: blockRate>5%で高ブロック配信警告、7日以内友だち>40%で新規脆弱性、1h以内ブロック>50%で頻度警告、前期比>30%増で増加トレンド、90日超友だち>30%で長期離脱
- **alerts統合**: getAlerts()にblock_eventsからの配信別ブロック警告を追加（blockRate>5%の配信を具体名付きで表示）。block_eventsテーブル未作成時はtry/catchでスキップ
- **ブロック分析UI**: リテンションタブ（旧コホート）内。totalBlocks<5件は「データ蓄積中」表示。全数値に「推定」注記
- **engagementTier カラム**: friends テーブルに自動分類ティア。active(7日以内)/warm(8-30日)/cold(31-90日)/dormant(90日超 or 未アクション)。Webhookで即時'active'化、6時間CRONでダウングレード
- **lastInteractionAt**: 友だちの直近アクション記録。inbound message, follow/re-followで更新。outboundは対象外
- **friends.scheduler.ts**: EVERY_6_HOURSでengagement_tier一括更新。全テナント横断バッチ処理。IS DISTINCT FROMで変更行のみ更新
- **コスト試算**: セグメントプレビューで3円/通の推定コスト表示+休眠除外の節約提案。LINE Standard基準の固定値
- **engagement-distribution API**: `GET /analytics/engagement-distribution` — フォロー中友だちのティア別人数

## Current Priorities
- AI Copilot完成度向上（ハイブリッド構造: 定型回答+AI生成の切り分け）
- あいさつメッセージのAI反映バグ修正（greetingForm連携）
- 友だちタイムライン（アクション履歴の時系列表示）
- Analytics: エンゲージメント分布UI追加（Phase 4b）、収益指標の別ページ化
- Add class-validator DTOs to remaining endpoints
- Reduce `any` types throughout codebase
