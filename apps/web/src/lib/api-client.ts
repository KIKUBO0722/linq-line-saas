const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';

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
    me: () => fetchApi<{ user: any; tenant: any }>('/api/v1/auth/me'),
  },
  friends: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<any[]>(`/api/v1/friends?${query}`);
    },
    getById: (id: string) => fetchApi<any>(`/api/v1/friends/${id}`),
    sync: () => fetchApi<{ synced: number }>('/api/v1/friends/sync', { method: 'POST' }),
    listTags: (friendId: string) => fetchApi<any[]>(`/api/v1/friends/${friendId}/tags`),
    assignTag: (friendId: string, tagId: string) =>
      fetchApi(`/api/v1/friends/${friendId}/tags`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    removeTag: (friendId: string, tagId: string) =>
      fetchApi(`/api/v1/friends/${friendId}/tags/${tagId}`, { method: 'DELETE' }),
    updateCustomFields: (id: string, fields: Record<string, any>) =>
      fetchApi(`/api/v1/friends/${id}/custom-fields`, { method: 'PATCH', body: JSON.stringify(fields) }),
  },
  accounts: {
    list: () => fetchApi<any[]>('/api/v1/accounts'),
    create: (data: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string }) =>
      fetchApi('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
  },
  messages: {
    conversation: (friendId: string) => fetchApi<any[]>(`/api/v1/messages/conversation/${friendId}`),
    send: (data: { friendId: string; text: string }) =>
      fetchApi('/api/v1/messages/send', { method: 'POST', body: JSON.stringify(data) }),
    broadcast: (data: { text: string; scheduledAt?: string }) =>
      fetchApi('/api/v1/messages/broadcast', { method: 'POST', body: JSON.stringify(data) }),
    sendMessage: (data: { friendId: string; message: any }) =>
      fetchApi('/api/v1/messages/send-message', { method: 'POST', body: JSON.stringify(data) }),
    broadcastMessage: (data: { message: any }) =>
      fetchApi('/api/v1/messages/broadcast-message', { method: 'POST', body: JSON.stringify(data) }),
  },
  forms: {
    list: () => fetchApi<any[]>('/api/v1/forms'),
    create: (data: { name: string; description?: string; fields?: any[]; tagOnSubmitId?: string }) =>
      fetchApi('/api/v1/forms', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => fetchApi<any>(`/api/v1/forms/${id}`),
    update: (id: string, data: any) =>
      fetchApi(`/api/v1/forms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/forms/${id}`, { method: 'DELETE' }),
    getResponses: (id: string) => fetchApi<any[]>(`/api/v1/forms/${id}/responses`),
  },
  referral: {
    listPrograms: () => fetchApi<any[]>('/api/v1/referral/programs'),
    createProgram: (data: { name: string; rewardType: string; rewardValue: string; description?: string }) =>
      fetchApi('/api/v1/referral/programs', { method: 'POST', body: JSON.stringify(data) }),
    getProgramStats: (id: string) => fetchApi<any>(`/api/v1/referral/programs/${id}/stats`),
  },
  analytics: {
    overview: () => fetchApi<any>('/api/v1/analytics/overview'),
    broadcasts: () => fetchApi<any[]>('/api/v1/analytics/broadcasts'),
    daily: (days?: number) => fetchApi<any>(`/api/v1/analytics/daily${days ? `?days=${days}` : ''}`),
    delivery: (date?: string) => fetchApi<any[]>(`/api/v1/analytics/delivery${date ? `?date=${date}` : ''}`),
    trafficSources: () => fetchApi<any[]>('/api/v1/analytics/traffic-sources'),
    createTrafficSource: (data: { name: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }) =>
      fetchApi('/api/v1/analytics/traffic-sources', { method: 'POST', body: JSON.stringify(data) }),
    deleteTrafficSource: (id: string) =>
      fetchApi(`/api/v1/analytics/traffic-sources/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => fetchApi<any[]>('/api/v1/tags'),
    create: (data: { name: string; color?: string }) =>
      fetchApi('/api/v1/tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; color?: string }) =>
      fetchApi(`/api/v1/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/tags/${id}`, { method: 'DELETE' }),
  },
  billing: {
    plans: () => fetchApi<any[]>('/api/v1/billing/plans'),
    subscription: () => fetchApi<any>('/api/v1/billing/subscription'),
    subscribe: (data: { planId: string }) =>
      fetchApi('/api/v1/billing/subscribe', { method: 'POST', body: JSON.stringify(data) }),
    cancel: () => fetchApi('/api/v1/billing/cancel', { method: 'POST' }),
    usage: () => fetchApi<any>('/api/v1/billing/usage'),
    seedPlans: () => fetchApi('/api/v1/billing/seed-plans', { method: 'POST' }),
    checkout: (data: { planId: string }) =>
      fetchApi<{ checkoutUrl?: string; fallback?: boolean; subscription?: any }>('/api/v1/billing/checkout', { method: 'POST', body: JSON.stringify(data) }),
  },
  templates: {
    list: () => fetchApi<any[]>('/api/v1/templates'),
    create: (data: { name: string; content: string; category?: string }) =>
      fetchApi('/api/v1/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; content?: string; category?: string }) =>
      fetchApi(`/api/v1/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/templates/${id}`, { method: 'DELETE' }),
  },
  segments: {
    list: () => fetchApi<any[]>('/api/v1/segments'),
    create: (data: { name: string; description?: string; tagIds: string[]; matchType?: string; excludeTagIds?: string[] }) =>
      fetchApi('/api/v1/segments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/segments/${id}`, { method: 'DELETE' }),
    preview: (id: string) =>
      fetchApi<{ count: number; friends: any[] }>(`/api/v1/segments/${id}/preview`, { method: 'POST' }),
    broadcast: (id: string, data: { message: string }) =>
      fetchApi(`/api/v1/segments/${id}/broadcast`, { method: 'POST', body: JSON.stringify(data) }),
  },
  coupons: {
    list: () => fetchApi<any[]>('/api/v1/coupons'),
    create: (data: any) =>
      fetchApi('/api/v1/coupons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchApi(`/api/v1/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/coupons/${id}`, { method: 'DELETE' }),
    toggle: (id: string, isActive: boolean) =>
      fetchApi(`/api/v1/coupons/${id}/toggle`, { method: 'POST', body: JSON.stringify({ isActive }) }),
  },
  reservations: {
    listSlots: () => fetchApi<any[]>('/api/v1/reservations/slots'),
    createSlot: (data: { name: string; duration: number; description?: string }) =>
      fetchApi('/api/v1/reservations/slots', { method: 'POST', body: JSON.stringify(data) }),
    deleteSlot: (id: string) =>
      fetchApi(`/api/v1/reservations/slots/${id}`, { method: 'DELETE' }),
    list: (params?: { date?: string; status?: string }) =>
      fetchApi<any[]>(`/api/v1/reservations${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`),
    create: (data: { slotId: string; friendId?: string; guestName?: string; date: string; startTime: string; note?: string; reminderMinutesBefore?: number }) =>
      fetchApi('/api/v1/reservations', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      fetchApi(`/api/v1/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id: string) =>
      fetchApi(`/api/v1/reservations/${id}`, { method: 'DELETE' }),
    getCalendarIntegration: () => fetchApi<any>('/api/v1/reservations/calendar-integration'),
    saveCalendarIntegration: (data: { calendarId: string; serviceAccountKey: string }) =>
      fetchApi('/api/v1/reservations/calendar-integration', { method: 'POST', body: JSON.stringify(data) }),
    disableCalendarIntegration: () =>
      fetchApi('/api/v1/reservations/calendar-integration', { method: 'DELETE' }),
  },
  steps: {
    listScenarios: () => fetchApi<any[]>('/api/v1/steps/scenarios'),
    createScenario: (data: { name: string; description?: string; triggerType: string }) =>
      fetchApi('/api/v1/steps/scenarios', { method: 'POST', body: JSON.stringify(data) }),
    getScenario: (id: string) => fetchApi<any>(`/api/v1/steps/scenarios/${id}`),
    activate: (id: string) =>
      fetchApi(`/api/v1/steps/scenarios/${id}/activate`, { method: 'POST' }),
    deactivate: (id: string) =>
      fetchApi(`/api/v1/steps/scenarios/${id}/deactivate`, { method: 'POST' }),
    addMessage: (scenarioId: string, data: { delayMinutes: number; messageContent: any; sortOrder: number; condition?: any; branchTrue?: number | null; branchFalse?: number | null }) =>
      fetchApi(`/api/v1/steps/scenarios/${scenarioId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    updateMessage: (messageId: string, data: { condition?: any; branchTrue?: number | null; branchFalse?: number | null; delayMinutes?: number; messageContent?: any }) =>
      fetchApi(`/api/v1/steps/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMessage: (messageId: string) =>
      fetchApi(`/api/v1/steps/messages/${messageId}`, { method: 'DELETE' }),
    enroll: (scenarioId: string, data: { friendId: string }) =>
      fetchApi(`/api/v1/steps/scenarios/${scenarioId}/enroll`, { method: 'POST', body: JSON.stringify(data) }),
    getEnrollments: (scenarioId: string) =>
      fetchApi<any[]>(`/api/v1/steps/scenarios/${scenarioId}/enrollments`),
  },
  urlTracking: {
    list: () => fetchApi<any[]>('/api/v1/url-tracking'),
    getClicks: (id: string) => fetchApi<any[]>(`/api/v1/url-tracking/${id}/clicks`),
  },
  richMenus: {
    list: () => fetchApi<any[]>('/api/v1/rich-menus'),
    create: (data: any) =>
      fetchApi('/api/v1/rich-menus', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
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
      return res.json();
    },
    delete: (id: string) =>
      fetchApi(`/api/v1/rich-menus/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      fetchApi(`/api/v1/rich-menus/${id}/default`, { method: 'POST' }),
    listGroups: () => fetchApi<any[]>('/api/v1/rich-menus/groups'),
    createGroup: (data: any) =>
      fetchApi('/api/v1/rich-menus/groups', { method: 'POST', body: JSON.stringify(data) }),
    deleteGroup: (id: string) =>
      fetchApi(`/api/v1/rich-menus/groups/${id}`, { method: 'DELETE' }),
    setGroupDefault: (id: string) =>
      fetchApi(`/api/v1/rich-menus/groups/${id}/default`, { method: 'POST' }),
    assignToUser: (data: { friendId: string; richMenuId: string }) =>
      fetchApi('/api/v1/rich-menus/assign', { method: 'POST', body: JSON.stringify(data) }),
  },
};
