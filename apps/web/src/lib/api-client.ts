import type {
  AdminUser,
  AiSuggestedStep,
  AnalyticsAlert,
  AnalyticsOverview,
  BestSendTimeData,
  BroadcastAnalytics,
  BroadcastPerformance,
  BroadcastPerformanceDetail,
  CalendarIntegration,
  CohortData,
  ConversionEvent,
  ConversionGoal,
  ConversionGoalType,
  Coupon,
  CtrData,
  DailyAnalytics,
  ExitPopup,
  Form,
  FormField,
  FormResponse,
  Friend,
  GachaCampaign,
  GachaDraw,
  GachaPrize,
  GachaStyle,
  GreetingMessage,
  HealthMetrics,
  KpiData,
  LineAccount,
  Message,
  MessageContent,
  MessageTemplate,
  Plan,
  ReferralProgram,
  ReferralStats,
  Reservation,
  ReservationSlot,
  PrizeType,
  RichMenu,
  RichMenuArea,
  RichMenuGroup,
  RichMenuSize,
  Segment,
  SegmentAnalytics,
  StepCondition,
  StepEnrollment,
  StepScenario,
  Subscription,
  Tag,
  TeamMember,
  Tenant,
  TenantBranding,
  TenantInvitation,
  TimelineEvent,
  TrackedUrl,
  TrafficSource,
  UnreadSummary,
  UrlClick,
  UsageRecord,
} from './types';

import { getApiUrl } from './api-url';

const API_URL = getApiUrl();

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; tenantName: string }) =>
      fetchApi('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      fetchApi('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchApi('/api/v1/auth/logout', { method: 'POST' }),
    me: () => fetchApi<{ user: AdminUser; tenant: Tenant }>('/api/v1/auth/me'),
  },
  friends: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<Friend[]>(`/api/v1/friends?${query}`);
    },
    getById: (id: string) => fetchApi<Friend>(`/api/v1/friends/${id}`),
    sync: () => fetchApi<{ synced: number }>('/api/v1/friends/sync', { method: 'POST' }),
    updateChatStatus: (id: string, status: string) =>
      fetchApi(`/api/v1/friends/${id}/chat-status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    importCsv: (csv: string) =>
      fetchApi<{ imported: number; updated: number; tagsCreated: number; errors: string[] }>('/api/v1/friends/import/csv', { method: 'POST', body: JSON.stringify({ csv }) }),
    listTags: (friendId: string) => fetchApi<Tag[]>(`/api/v1/friends/${friendId}/tags`),
    assignTag: (friendId: string, tagId: string) =>
      fetchApi(`/api/v1/friends/${friendId}/tags`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    removeTag: (friendId: string, tagId: string) =>
      fetchApi(`/api/v1/friends/${friendId}/tags/${tagId}`, { method: 'DELETE' }),
    updateCustomFields: (id: string, fields: Record<string, string | null>) =>
      fetchApi(`/api/v1/friends/${id}/custom-fields`, { method: 'PATCH', body: JSON.stringify(fields) }),
    timeline: (id: string, limit?: number, offset?: number) => {
      const query = new URLSearchParams();
      if (limit) query.set('limit', String(limit));
      if (offset) query.set('offset', String(offset));
      return fetchApi<{ events: TimelineEvent[]; total: number }>(`/api/v1/friends/${id}/timeline?${query}`);
    },
  },
  accounts: {
    list: () => fetchApi<LineAccount[]>('/api/v1/accounts'),
    create: (data: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string }) =>
      fetchApi('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/accounts/${id}`, { method: 'DELETE' }),
    getBranding: () => fetchApi<TenantBranding>('/api/v1/accounts/branding'),
    updateBranding: (data: TenantBranding) =>
      fetchApi<TenantBranding>('/api/v1/accounts/branding', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  messages: {
    conversation: (friendId: string) => fetchApi<Message[]>(`/api/v1/messages/conversation/${friendId}`),
    unreadSummary: () => fetchApi<UnreadSummary>('/api/v1/messages/unread-summary'),
    markAsRead: (friendId: string) => fetchApi<{ success: boolean }>(`/api/v1/messages/read/${friendId}`, { method: 'POST' }),
    send: (data: { friendId: string; text: string }) =>
      fetchApi('/api/v1/messages/send', { method: 'POST', body: JSON.stringify(data) }),
    broadcast: (data: { text: string; scheduledAt?: string }) =>
      fetchApi('/api/v1/messages/broadcast', { method: 'POST', body: JSON.stringify(data) }),
    sendMessage: (data: { friendId: string; message: MessageContent }) =>
      fetchApi('/api/v1/messages/send-message', { method: 'POST', body: JSON.stringify(data) }),
    broadcastMessage: (data: { message: MessageContent }) =>
      fetchApi('/api/v1/messages/broadcast-message', { method: 'POST', body: JSON.stringify(data) }),
    testSend: (data: { friendIds: string[]; message: string }) =>
      fetchApi<{ sent: number }>('/api/v1/messages/test-send', { method: 'POST', body: JSON.stringify(data) }),
  },
  forms: {
    list: () => fetchApi<Form[]>('/api/v1/forms'),
    create: (data: { name: string; description?: string; fields?: FormField[]; tagOnSubmitId?: string }) =>
      fetchApi('/api/v1/forms', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => fetchApi<Form>(`/api/v1/forms/${id}`),
    update: (id: string, data: Partial<Pick<Form, 'name' | 'description' | 'fields' | 'thankYouMessage' | 'tagOnSubmitId' | 'isActive'>>) =>
      fetchApi(`/api/v1/forms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/forms/${id}`, { method: 'DELETE' }),
    getResponses: (id: string) => fetchApi<FormResponse[]>(`/api/v1/forms/${id}/responses`),
  },
  referral: {
    listPrograms: () => fetchApi<ReferralProgram[]>('/api/v1/referral/programs'),
    createProgram: (data: { name: string; rewardType: string; rewardValue: string; description?: string }) =>
      fetchApi('/api/v1/referral/programs', { method: 'POST', body: JSON.stringify(data) }),
    getProgramStats: (id: string) => fetchApi<ReferralStats>(`/api/v1/referral/programs/${id}/stats`),
  },
  analytics: {
    overview: () => fetchApi<AnalyticsOverview>('/api/v1/analytics/overview'),
    broadcasts: () => fetchApi<BroadcastAnalytics[]>('/api/v1/analytics/broadcasts'),
    daily: (days?: number) => fetchApi<DailyAnalytics>(`/api/v1/analytics/daily${days ? `?days=${days}` : ''}`),
    delivery: (date?: string) => fetchApi<Message[]>(`/api/v1/analytics/delivery${date ? `?date=${date}` : ''}`),
    trafficSources: () => fetchApi<TrafficSource[]>('/api/v1/analytics/traffic-sources'),
    createTrafficSource: (data: { name: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }) =>
      fetchApi('/api/v1/analytics/traffic-sources', { method: 'POST', body: JSON.stringify(data) }),
    deleteTrafficSource: (id: string) =>
      fetchApi(`/api/v1/analytics/traffic-sources/${id}`, { method: 'DELETE' }),
    cohort: (weeks?: number) => fetchApi<CohortData>(`/api/v1/analytics/cohort${weeks ? `?weeks=${weeks}` : ''}`),
    ctr: (days?: number) => fetchApi<CtrData>(`/api/v1/analytics/ctr${days ? `?days=${days}` : ''}`),
    bestSendTime: (days?: number) => fetchApi<BestSendTimeData>(`/api/v1/analytics/best-send-time${days ? `?days=${days}` : ''}`),
    segments: () => fetchApi<SegmentAnalytics[]>('/api/v1/analytics/segments'),
    kpi: () => fetchApi<KpiData>('/api/v1/analytics/kpi'),
    health: (days?: number) => fetchApi<HealthMetrics>(`/api/v1/analytics/health${days ? `?days=${days}` : ''}`),
    alerts: () => fetchApi<AnalyticsAlert[]>('/api/v1/analytics/alerts'),
    broadcastPerformance: (days?: number) => fetchApi<BroadcastPerformance[]>(`/api/v1/analytics/broadcast-performance${days ? `?days=${days}` : ''}`),
    broadcastPerformanceDetail: (id: string) => fetchApi<BroadcastPerformanceDetail>(`/api/v1/analytics/broadcast-performance/${id}`),
  },
  tags: {
    list: () => fetchApi<Tag[]>('/api/v1/tags'),
    create: (data: { name: string; color?: string }) =>
      fetchApi('/api/v1/tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; color?: string }) =>
      fetchApi(`/api/v1/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/tags/${id}`, { method: 'DELETE' }),
  },
  billing: {
    plans: () => fetchApi<Plan[]>('/api/v1/billing/plans'),
    subscription: () => fetchApi<Subscription>('/api/v1/billing/subscription'),
    subscribe: (data: { planId: string }) =>
      fetchApi('/api/v1/billing/subscribe', { method: 'POST', body: JSON.stringify(data) }),
    cancel: () => fetchApi('/api/v1/billing/cancel', { method: 'POST' }),
    usage: () => fetchApi<UsageRecord>('/api/v1/billing/usage'),
    seedPlans: () => fetchApi('/api/v1/billing/seed-plans', { method: 'POST' }),
    checkout: (data: { planId: string }) =>
      fetchApi<{ checkoutUrl?: string; fallback?: boolean; subscription?: Subscription }>('/api/v1/billing/checkout', { method: 'POST', body: JSON.stringify(data) }),
  },
  templates: {
    list: () => fetchApi<MessageTemplate[]>('/api/v1/templates'),
    create: (data: { name: string; content: string; category?: string; messageType?: string; messageData?: MessageContent }) =>
      fetchApi('/api/v1/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; content?: string; category?: string; messageType?: string; messageData?: MessageContent }) =>
      fetchApi(`/api/v1/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/templates/${id}`, { method: 'DELETE' }),
  },
  segments: {
    list: () => fetchApi<Segment[]>('/api/v1/segments'),
    create: (data: { name: string; description?: string; tagIds: string[]; matchType?: string; excludeTagIds?: string[] }) =>
      fetchApi('/api/v1/segments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; tagIds?: string[]; matchType?: string; excludeTagIds?: string[] }) =>
      fetchApi(`/api/v1/segments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/segments/${id}`, { method: 'DELETE' }),
    preview: (id: string) =>
      fetchApi<{ count: number; friends: Friend[] }>(`/api/v1/segments/${id}/preview`, { method: 'POST' }),
    broadcast: (id: string, data: { message: string }) =>
      fetchApi(`/api/v1/segments/${id}/broadcast`, { method: 'POST', body: JSON.stringify(data) }),
  },
  coupons: {
    list: () => fetchApi<Coupon[]>('/api/v1/coupons'),
    create: (data: Omit<Coupon, 'id' | 'tenantId' | 'usedCount' | 'createdAt'>) =>
      fetchApi('/api/v1/coupons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Coupon, 'name' | 'code' | 'discountType' | 'discountValue' | 'description' | 'expiresAt' | 'maxUses' | 'isActive'>>) =>
      fetchApi(`/api/v1/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/coupons/${id}`, { method: 'DELETE' }),
    toggle: (id: string, isActive: boolean) =>
      fetchApi(`/api/v1/coupons/${id}/toggle`, { method: 'POST', body: JSON.stringify({ isActive }) }),
  },
  reservations: {
    listSlots: () => fetchApi<ReservationSlot[]>('/api/v1/reservations/slots'),
    createSlot: (data: { name: string; duration: number; description?: string }) =>
      fetchApi('/api/v1/reservations/slots', { method: 'POST', body: JSON.stringify(data) }),
    deleteSlot: (id: string) =>
      fetchApi(`/api/v1/reservations/slots/${id}`, { method: 'DELETE' }),
    list: (params?: { date?: string; status?: string }) =>
      fetchApi<Reservation[]>(`/api/v1/reservations${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`),
    create: (data: { slotId: string; friendId?: string; guestName?: string; date: string; startTime: string; note?: string; reminderMinutesBefore?: number }) =>
      fetchApi('/api/v1/reservations', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      fetchApi(`/api/v1/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/reservations/${id}`, { method: 'DELETE' }),
    getCalendarIntegration: () => fetchApi<CalendarIntegration>('/api/v1/reservations/calendar-integration'),
    saveCalendarIntegration: (data: { calendarId: string; serviceAccountKey: string }) =>
      fetchApi('/api/v1/reservations/calendar-integration', { method: 'POST', body: JSON.stringify(data) }),
    disableCalendarIntegration: () =>
      fetchApi('/api/v1/reservations/calendar-integration', { method: 'DELETE' }),
  },
  steps: {
    listScenarios: () => fetchApi<StepScenario[]>('/api/v1/steps/scenarios'),
    createScenario: (data: { name: string; description?: string; triggerType: string }) =>
      fetchApi('/api/v1/steps/scenarios', { method: 'POST', body: JSON.stringify(data) }),
    getScenario: (id: string) => fetchApi<StepScenario>(`/api/v1/steps/scenarios/${id}`),
    activate: (id: string) =>
      fetchApi(`/api/v1/steps/scenarios/${id}/activate`, { method: 'POST' }),
    deactivate: (id: string) =>
      fetchApi(`/api/v1/steps/scenarios/${id}/deactivate`, { method: 'POST' }),
    addMessage: (scenarioId: string, data: { delayMinutes: number; messageContent: MessageContent; sortOrder: number; condition?: StepCondition; branchTrue?: number | null; branchFalse?: number | null }) =>
      fetchApi(`/api/v1/steps/scenarios/${scenarioId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    updateMessage: (messageId: string, data: { condition?: StepCondition; branchTrue?: number | null; branchFalse?: number | null; delayMinutes?: number; messageContent?: MessageContent }) =>
      fetchApi(`/api/v1/steps/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMessage: (messageId: string) =>
      fetchApi(`/api/v1/steps/messages/${messageId}`, { method: 'DELETE' }),
    enroll: (scenarioId: string, data: { friendId: string }) =>
      fetchApi(`/api/v1/steps/scenarios/${scenarioId}/enroll`, { method: 'POST', body: JSON.stringify(data) }),
    getEnrollments: (scenarioId: string) =>
      fetchApi<StepEnrollment[]>(`/api/v1/steps/scenarios/${scenarioId}/enrollments`),
  },
  ai: {
    suggestScenario: (data: { industry: string; goal: string; target?: string }) =>
      fetchApi<{ name: string; description?: string; steps: AiSuggestedStep[] }>('/api/v1/ai/suggest-scenario', { method: 'POST', body: JSON.stringify(data) }),
    executeAction: (data: { type: string; data: Record<string, unknown> }) =>
      fetchApi<{ success: boolean; type: string; id: string; details?: Record<string, unknown> }>('/api/v1/ai/execute-action', { method: 'POST', body: JSON.stringify(data) }),
    chatSuggest: (data: { friendId: string; recentMessages: { role: string; content: string }[]; friendInfo?: Partial<Friend> }) =>
      fetchApi<{ suggestions: string[] }>('/api/v1/ai/chat-suggest', { method: 'POST', body: JSON.stringify(data) }),
    suggestSegments: () =>
      fetchApi<{ suggestions: Array<{ name: string; description: string; tagNames: string[]; matchType: 'any' | 'all'; reasoning: string; estimatedFriendCount: number }> }>('/api/v1/ai/suggest-segments', { method: 'POST' }),
    analyzeTraffic: () =>
      fetchApi<{ summary: string; insights: Array<{ title: string; description: string; actionable: string }> }>('/api/v1/ai/analyze-traffic', { method: 'POST' }),
    generateReport: (period?: 'weekly' | 'monthly') =>
      fetchApi<{ title: string; period: string; sections: Array<{ heading: string; content: string }>; recommendations: string[] }>(`/api/v1/ai/generate-report${period ? `?period=${period}` : ''}`, { method: 'POST' }),
    optimizeForm: (formId: string) =>
      fetchApi<{ formName: string; score: number; issues: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; suggestion: string }>; improvedFields?: Array<{ label: string; type: string; placeholder?: string; required?: boolean }> }>(`/api/v1/ai/optimize-form/${formId}`, { method: 'POST' }),
  },
  onboarding: {
    getTemplates: () => fetchApi<Array<{ id: string; name: string; description: string; icon: string }>>('/api/v1/onboarding/templates'),
    applyTemplate: (industryId: string) =>
      fetchApi<{ success: boolean; industry: string; tagsCreated: number; scenarioCreated: string }>('/api/v1/onboarding/apply-template', { method: 'POST', body: JSON.stringify({ industryId }) }),
  },
  team: {
    list: () => fetchApi<TeamMember[]>('/api/v1/auth/team'),
    invite: (data: { email: string; role?: string }) =>
      fetchApi<TenantInvitation>('/api/v1/auth/invite', { method: 'POST', body: JSON.stringify(data) }),
    listInvitations: () => fetchApi<TenantInvitation[]>('/api/v1/auth/invitations'),
    cancelInvitation: (id: string) =>
      fetchApi(`/api/v1/auth/invitations/${id}`, { method: 'DELETE' }),
    updateRole: (userId: string, role: string) =>
      fetchApi(`/api/v1/auth/team/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    removeMember: (userId: string) =>
      fetchApi(`/api/v1/auth/team/${userId}`, { method: 'DELETE' }),
  },
  agency: {
    status: () => fetchApi<{ isAgency: boolean }>('/api/v1/agency/status'),
    overview: () => fetchApi<{
      totalClients: number;
      totalFriends: number;
      totalMessagesSent: number;
      totalMessagesReceived: number;
      clients: Array<{
        tenantId: string;
        tenantName: string;
        industry: string | null;
        status: string;
        friendCount: number;
        messagesSent: number;
        messagesReceived: number;
        planName: string | null;
        createdAt: string;
      }>;
    }>('/api/v1/agency/overview'),
    addClient: (clientTenantId: string) =>
      fetchApi(`/api/v1/agency/clients/${clientTenantId}`, { method: 'POST' }),
    removeClient: (clientTenantId: string) =>
      fetchApi(`/api/v1/agency/clients/${clientTenantId}`, { method: 'DELETE' }),
    listMargins: () =>
      fetchApi<Array<{
        clientTenantId: string;
        clientName: string;
        marginType: string;
        marginValue: string;
        notes: string | null;
        updatedAt: string;
      }>>('/api/v1/agency/margins'),
    getMargin: (clientTenantId: string) =>
      fetchApi<{ marginType: string; marginValue: string; notes: string | null }>(`/api/v1/agency/margins/${clientTenantId}`),
    setMargin: (clientTenantId: string, data: { marginType: string; marginValue: number; notes?: string }) =>
      fetchApi(`/api/v1/agency/margins/${clientTenantId}`, { method: 'PUT', body: JSON.stringify(data) }),
    getCommissions: () =>
      fetchApi<Array<{
        id: string;
        clientTenantId: string;
        clientName: string;
        period: string;
        clientRevenue: number;
        commissionAmount: number;
        marginType: string;
        marginValue: string;
        status: string;
        createdAt: string;
      }>>('/api/v1/agency/commissions'),
    getCommissionSummary: () =>
      fetchApi<{ totalEarned: number; totalPending: number; totalPaid: number; totalClients: number }>('/api/v1/agency/commissions/summary'),
  },
  conversions: {
    listGoals: () => fetchApi<ConversionGoal[]>('/api/v1/conversions/goals'),
    createGoal: (data: { name: string; type: ConversionGoalType; targetId?: string }) =>
      fetchApi<ConversionGoal>('/api/v1/conversions/goals', { method: 'POST', body: JSON.stringify(data) }),
    updateGoal: (id: string, data: { name?: string; isActive?: boolean }) =>
      fetchApi<ConversionGoal>(`/api/v1/conversions/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteGoal: (id: string) =>
      fetchApi(`/api/v1/conversions/goals/${id}`, { method: 'DELETE' }),
    getGoalEvents: (id: string) => fetchApi<ConversionEvent[]>(`/api/v1/conversions/goals/${id}/events`),
    recordEvent: (data: { goalId: string; friendId?: string; trackedUrlId?: string; metadata?: Record<string, unknown> }) =>
      fetchApi<ConversionEvent>('/api/v1/conversions/events', { method: 'POST', body: JSON.stringify(data) }),
  },
  exitPopups: {
    list: () => fetchApi<ExitPopup[]>('/api/v1/exit-popups'),
    create: (data: Partial<Omit<ExitPopup, 'id' | 'tenantId' | 'showCount' | 'clickCount' | 'createdAt'>> & Pick<ExitPopup, 'name' | 'title' | 'ctaText'>) =>
      fetchApi<ExitPopup>('/api/v1/exit-popups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<ExitPopup, 'id' | 'tenantId' | 'showCount' | 'clickCount' | 'createdAt'>>) =>
      fetchApi<ExitPopup>(`/api/v1/exit-popups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/exit-popups/${id}`, { method: 'DELETE' }),
  },
  gacha: {
    listCampaigns: () => fetchApi<GachaCampaign[]>('/api/v1/gacha/campaigns'),
    getCampaign: (id: string) => fetchApi<GachaCampaign>(`/api/v1/gacha/campaigns/${id}`),
    createCampaign: (data: Partial<Omit<GachaCampaign, 'id' | 'tenantId' | 'totalDraws' | 'createdAt' | 'prizes'>> & Pick<GachaCampaign, 'name'>) =>
      fetchApi<GachaCampaign>('/api/v1/gacha/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    updateCampaign: (id: string, data: Partial<Pick<GachaCampaign, 'name' | 'description' | 'maxDrawsPerUser' | 'isActive' | 'startAt' | 'endAt' | 'style'>>) =>
      fetchApi<GachaCampaign>(`/api/v1/gacha/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCampaign: (id: string) =>
      fetchApi(`/api/v1/gacha/campaigns/${id}`, { method: 'DELETE' }),
    addPrize: (campaignId: string, data: Partial<Omit<GachaPrize, 'id' | 'campaignId' | 'wonCount'>> & Pick<GachaPrize, 'name' | 'prizeType'>) =>
      fetchApi<GachaPrize>(`/api/v1/gacha/campaigns/${campaignId}/prizes`, { method: 'POST', body: JSON.stringify(data) }),
    updatePrize: (id: string, data: Partial<Omit<GachaPrize, 'id' | 'campaignId' | 'wonCount'>>) =>
      fetchApi<GachaPrize>(`/api/v1/gacha/prizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePrize: (id: string) =>
      fetchApi(`/api/v1/gacha/prizes/${id}`, { method: 'DELETE' }),
    draw: (campaignId: string, friendId?: string) =>
      fetchApi<GachaDraw>(`/api/v1/gacha/campaigns/${campaignId}/draw`, { method: 'POST', body: JSON.stringify({ friendId }) }),
    getDrawHistory: (campaignId: string) => fetchApi<GachaDraw[]>(`/api/v1/gacha/campaigns/${campaignId}/draws`),
  },
  urlTracking: {
    list: () => fetchApi<TrackedUrl[]>('/api/v1/url-tracking'),
    getClicks: (id: string) => fetchApi<UrlClick[]>(`/api/v1/url-tracking/${id}/clicks`),
    create: (originalUrl: string, messageId?: string) =>
      fetchApi<TrackedUrl>('/api/v1/url-tracking', { method: 'POST', body: JSON.stringify({ originalUrl, messageId }) }),
  },
  richMenus: {
    list: () => fetchApi<RichMenu[]>('/api/v1/rich-menus'),
    create: (data: Pick<RichMenu, 'name' | 'chatBarText' | 'size' | 'areas'> & { lineAccountId: string }) =>
      fetchApi('/api/v1/rich-menus', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<RichMenu, 'name' | 'chatBarText' | 'size' | 'areas' | 'isActive'>>) =>
      fetchApi(`/api/v1/rich-menus/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    uploadImage: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/api/v1/rich-menus/${id}/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ success: boolean }>;
    },
    delete: (id: string) =>
      fetchApi(`/api/v1/rich-menus/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      fetchApi(`/api/v1/rich-menus/${id}/default`, { method: 'POST' }),
    listGroups: () => fetchApi<RichMenuGroup[]>('/api/v1/rich-menus/groups'),
    createGroup: (data: Pick<RichMenuGroup, 'name' | 'description'> & { lineAccountId: string; tabs?: Array<{ name: string; chatBarText: string; size: RichMenuSize; areas: RichMenuArea[] }> }) =>
      fetchApi('/api/v1/rich-menus/groups', { method: 'POST', body: JSON.stringify(data) }),
    deleteGroup: (id: string) =>
      fetchApi(`/api/v1/rich-menus/groups/${id}`, { method: 'DELETE' }),
    setGroupDefault: (id: string) =>
      fetchApi(`/api/v1/rich-menus/groups/${id}/default`, { method: 'POST' }),
    assignToUser: (data: { friendId: string; richMenuId: string }) =>
      fetchApi('/api/v1/rich-menus/assign', { method: 'POST', body: JSON.stringify(data) }),
  },

  greetings: {
    list: () => fetchApi<GreetingMessage[]>('/api/v1/greetings'),
    create: (data: { type: string; name: string; messages: MessageContent[]; isActive?: boolean }) =>
      fetchApi('/api/v1/greetings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; messages?: MessageContent[]; isActive?: boolean }) =>
      fetchApi(`/api/v1/greetings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/greetings/${id}`, { method: 'DELETE' }),
  },
};

// Re-export types for convenience
export type { AiSuggestedStep, StepCondition, MessageContent } from './types';
