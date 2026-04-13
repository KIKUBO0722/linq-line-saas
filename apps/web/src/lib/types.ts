// ============================================================
// API型定義 — DBスキーマに基づくフロントエンド用インターフェース
// ============================================================

// --- Common ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// --- Auth ---
export interface AdminUser {
  id: string;
  email: string;
  tenantId: string;
  role?: string;
  displayName?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  industry?: string;
  parentTenantId?: string | null;
  // White-label branding
  appName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  sidebarColor?: string | null;
  faviconUrl?: string | null;
  createdAt: string;
}

export interface TenantBranding {
  appName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  sidebarColor?: string | null;
  faviconUrl?: string | null;
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
  createdAt: string;
}

export interface TenantInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

// --- Friends ---
export interface Friend {
  id: string;
  tenantId: string;
  lineAccountId: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  language: string | null;
  isFollowing: boolean;
  score: number;
  customFields: Record<string, string>;
  followedAt: string | null;
  unfollowedAt: string | null;
  trafficSourceId: string | null;
  acquisitionSource: string | null;
  profileSyncedAt: string | null;
  lastReadAt: string | null;
  chatStatus: string;
  createdAt: string;
}

export interface TimelineEvent {
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// --- Tags ---
export interface Tag {
  id: string;
  tenantId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

// --- Messages ---
export interface MessageContent {
  text?: string;
  type?: string;
  altText?: string;
  title?: string;
  thumbnailImageUrl?: string;
  columns?: unknown[];
  actions?: unknown[];
  [key: string]: unknown;
}

export interface Message {
  id: string;
  tenantId: string;
  lineAccountId: string;
  friendId: string | null;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: MessageContent;
  lineMessageId: string | null;
  sendType: string | null;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  error: Record<string, unknown> | null;
  createdAt: string;
}

export interface UnreadSummary {
  totalUnread: number;
  unreadFriends: Array<{
    friendId: string;
    unreadCount: number;
    lastMessage: MessageContent;
    createdAt: string;
  }>;
}

// --- LINE Accounts ---
export interface LineAccount {
  id: string;
  tenantId: string;
  channelId: string;
  botName: string | null;
  createdAt: string;
}

// --- Templates ---
export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  category: string | null;
  messageType: string;
  messageData: MessageContent | null;
  createdAt: string;
  updatedAt: string;
}

// --- Forms ---
export interface FormField {
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface Form {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  thankYouMessage: string | null;
  tagOnSubmitId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  friendId: string | null;
  answers: Record<string, unknown>;
  submittedAt: string;
}

// --- Segments ---
export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  tagIds: string[];
  matchType: string;
  excludeTagIds: string[];
  createdAt: string;
}

// --- Steps ---
export interface StepCondition {
  type: string;
  tagId?: string;
  value?: string;
  [key: string]: unknown;
}

export interface StepMessage {
  id: string;
  scenarioId: string;
  delayMinutes: number;
  condition: StepCondition | null;
  branchTrue: number | null;
  branchFalse: number | null;
  messageContent: MessageContent;
  sortOrder: number;
  createdAt: string;
}

export interface StepScenario {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  messages?: StepMessage[];
}

export interface StepEnrollment {
  id: string;
  friendId: string;
  scenarioId: string;
  currentStepIndex: number;
  status: string;
  enrolledAt: string;
  nextSendAt: string | null;
  completedAt: string | null;
}

// --- Rich Menus ---
export interface RichMenuSize {
  width: number;
  height: number;
}

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: { type: string; label?: string; uri?: string; text?: string; data?: string };
}

export interface RichMenu {
  id: string;
  tenantId: string;
  lineAccountId: string;
  lineRichMenuId: string | null;
  name: string;
  chatBarText: string | null;
  size: RichMenuSize | null;
  areas: RichMenuArea[] | null;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  groupId: string | null;
  tabIndex: number | null;
  lineAliasId: string | null;
  createdAt: string;
}

export interface RichMenuGroup {
  id: string;
  tenantId: string;
  lineAccountId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

// --- Billing ---
export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  messageLimit: number;
  friendLimit: number;
  aiTokenLimit: number;
  features: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  plan?: Plan;
}

export interface UsageRecord {
  tenantId: string;
  period: string;
  messagesSent: number;
  aiTokensUsed: number;
  friendsCount: number;
}

// --- Analytics ---
export interface AnalyticsOverview {
  totalFriends: number;
  activeFriends: number;
  messagesSent: number;
  messagesReceived: number;
  newFriends: number;
  unfollowed: number;
}

export interface DailyAnalytics {
  dates: string[];
  newFriends: number[];
  messages: number[];
  unfollowed: number[];
}

export interface BroadcastAnalytics {
  id: string;
  content: MessageContent;
  sentAt: string;
  recipientCount: number;
  clickCount?: number;
}

export interface CohortData {
  cohorts: Array<{
    week: string;
    total: number;
    retention: number[];
  }>;
}

export interface CtrData {
  messages: Array<{
    id: string;
    content: string;
    sentAt: string;
    sentCount: number;
    clickCount: number;
    ctr: number;
  }>;
}

export interface BestSendTimeData {
  hours: Array<{
    hour: number;
    openRate: number;
    clickRate: number;
    messageCount: number;
  }>;
}

export interface SegmentAnalytics {
  id: string;
  name: string;
  friendCount: number;
  avgScore: number;
  messageCount: number;
}

export interface KpiData {
  totalFriends: number;
  activeFriends: number;
  activeRate: number;
  avgScore: number;
  totalMessages: number;
  broadcastCount: number;
}

// --- Health Metrics ---
export interface HealthMetrics {
  period: number;
  totalFollowing: number;
  totalFriends: number;
  blocked: number;
  netGrowth: { current: number; newFriends: number; blocks: number; previous: number; change: number };
  blockRate: { current: number; blocks: number; sent: number; previous: number; change: number };
  activeRate: { current: number; activeFriends: number; totalFollowing: number; previous: number; change: number };
  responseRate: { current: number; inbound: number; outbound: number; previous: number; change: number };
}

export interface AnalyticsAlert {
  type: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
}

// --- Referral ---
export interface ReferralProgram {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  rewardType: string;
  rewardValue: string;
  rewardConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralConversion {
  id: string;
  code: string;
  createdAt: string;
}

export interface ReferralStats {
  program: ReferralProgram;
  totalCodes: number;
  totalConversions: number;
  topReferrers: Array<{ friendId: string; displayName: string; count: number }>;
  recentConversions: ReferralConversion[];
}

// --- Coupons ---
export interface Coupon {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  description: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

// --- Reservations ---
export interface ReservationSlot {
  id: string;
  tenantId: string;
  name: string;
  duration: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Reservation {
  id: string;
  slotId: string;
  friendId: string | null;
  guestName: string | null;
  date: string;
  startTime: string;
  status: string;
  note: string | null;
  reminderMinutesBefore: number | null;
  reminderSentAt: string | null;
  googleCalendarEventId: string | null;
  createdAt: string;
  slot?: ReservationSlot;
  friend?: Friend;
}

export interface CalendarIntegration {
  id: string;
  tenantId: string;
  provider: string;
  calendarId: string | null;
  isActive: boolean;
  createdAt: string;
}

// --- Greetings ---
export interface GreetingMessage {
  id: string;
  tenantId: string;
  type: 'new_follow' | 're_follow' | 'unblock';
  name: string;
  messages: MessageContent[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- AI ---
export interface AiConfig {
  id: string;
  tenantId: string;
  systemPrompt: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  knowledgeBase: unknown[];
  welcomeMessage: string | null;
  autoReplyEnabled: boolean;
  handoffKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AiSuggestedStep {
  delayMinutes: number;
  messageContent: MessageContent;
}

// --- Conversion Goals ---
export type ConversionGoalType = 'form_response' | 'reservation_complete' | 'coupon_used' | 'url_click' | 'custom';

export interface ConversionGoal {
  id: string;
  tenantId: string;
  name: string;
  type: ConversionGoalType;
  targetId: string | null;
  isActive: boolean;
  conversionCount: number;
  createdAt: string;
}

export interface ConversionEvent {
  id: string;
  goalId: string;
  friendId: string | null;
  trackedUrlId: string | null;
  metadata: Record<string, unknown>;
  convertedAt: string;
}

// --- Exit Popups ---
export interface ExitPopup {
  id: string;
  tenantId: string;
  name: string;
  targetType: string;
  targetId: string | null;
  title: string;
  message: string | null;
  couponCode: string | null;
  couponLabel: string | null;
  ctaText: string;
  ctaUrl: string | null;
  triggerType: string;
  delaySeconds: number;
  isActive: boolean;
  showCount: number;
  clickCount: number;
  createdAt: string;
}

// --- Gacha ---
export type GachaStyle = 'slot' | 'roulette' | 'scratch' | 'capsule';
export type PrizeType = 'coupon' | 'message' | 'nothing';

export interface GachaCampaign {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  maxDrawsPerUser: number;
  totalDraws: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  style: GachaStyle;
  createdAt: string;
  prizes?: GachaPrize[];
}

export interface GachaPrize {
  id: string;
  campaignId: string;
  name: string;
  weight: number;
  prizeType: PrizeType;
  couponId: string | null;
  winMessage: string | null;
  maxQuantity: number;
  wonCount: number;
  sortOrder: number;
}

export interface GachaDraw {
  id: string;
  campaignId: string;
  friendId: string | null;
  prizeId: string | null;
  drawnAt: string;
  prize?: GachaPrize;
  friend?: Friend;
}

// --- URL Tracking ---
export interface TrackedUrl {
  id: string;
  tenantId: string;
  originalUrl: string;
  shortCode: string;
  messageId: string | null;
  clickCount: number;
  createdAt: string;
}

export interface UrlClick {
  id: string;
  trackedUrlId: string;
  friendId: string | null;
  clickedAt: string;
  userAgent: string | null;
}

// --- Traffic Sources ---
export interface TrafficSource {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  utmParams: Record<string, string>;
  qrCodeData: string | null;
  friendCount: number;
  createdAt: string;
}
