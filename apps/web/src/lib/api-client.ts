const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  },
  accounts: {
    list: () => fetchApi<any[]>('/api/v1/accounts'),
    create: (data: { channelId: string; channelSecret: string; channelAccessToken: string; botName?: string }) =>
      fetchApi('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
  },
  messages: {
    conversation: (friendId: string) => fetchApi<any[]>(`/api/v1/messages/conversation/${friendId}`),
    send: (data: { friendId: string; type: string; content: any }) =>
      fetchApi('/api/v1/messages/send', { method: 'POST', body: JSON.stringify(data) }),
  },
};
