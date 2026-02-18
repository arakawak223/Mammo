import { useAuthStore } from '../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  const { refreshToken, setAuth, logout } = useAuthStore.getState();
  if (!refreshToken) {
    await logout();
    return false;
  }
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      await logout();
      return false;
    }
    const data = await response.json();
    setAuth(data.user, data.accessToken, data.refreshToken);
    return true;
  } catch {
    await logout();
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Silent refresh on 401
  if (response.status === 401 && accessToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = silentRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const refreshed = await (refreshPromise ?? Promise.resolve(false));
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (phone: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (data: { phone: string; name: string; password: string; role: string }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  updateDeviceToken: (deviceToken: string) =>
    request('/auth/device-token', {
      method: 'POST',
      body: JSON.stringify({ deviceToken }),
    }),

  // Events
  createEvent: (data: {
    type: string;
    severity: string;
    payload?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
  }) =>
    request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEvent: (eventId: string) => request(`/events/${eventId}`),

  getEvents: (elderlyId: string, page = 1) =>
    request(`/events/elderly/${elderlyId}?page=${page}`),

  resolveEvent: (eventId: string) =>
    request(`/events/${eventId}/resolve`, { method: 'PATCH' }),

  // SOS
  startSos: (data: { mode?: string; latitude: number; longitude: number }) =>
    request('/sos/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSosLocation: (sessionId: string, data: { latitude: number; longitude: number }) =>
    request(`/sos/${sessionId}/location`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changeSosMode: (sessionId: string, mode: string) =>
    request(`/sos/${sessionId}/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    }),

  resolveSos: (sessionId: string) =>
    request(`/sos/${sessionId}/resolve`, { method: 'POST' }),

  getSosSession: (sessionId: string) => request(`/sos/${sessionId}`),

  // Blocklist
  getBlocklist: (elderlyId: string) => request(`/elderly/${elderlyId}/blocklist`),

  addBlockedNumber: (elderlyId: string, phoneNumber: string, reason?: string) =>
    request(`/elderly/${elderlyId}/blocklist`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, reason }),
    }),

  removeBlockedNumber: (elderlyId: string, numberId: string) =>
    request(`/elderly/${elderlyId}/blocklist/${numberId}`, { method: 'DELETE' }),

  syncBlocklist: (elderlyId: string, numberIds: string[]) =>
    request(`/elderly/${elderlyId}/blocklist/sync`, {
      method: 'POST',
      body: JSON.stringify({ numberIds }),
    }),

  // Pairings
  createInvite: (elderlyId: string) =>
    request('/pairings', {
      method: 'POST',
      body: JSON.stringify({ elderlyId }),
    }),

  joinPairing: (code: string) =>
    request('/pairings/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getPairings: () => request('/pairings'),

  // Statistics (F8)
  getStatistics: (params?: { prefecture?: string; yearMonth?: string }) =>
    request(`/statistics?${new URLSearchParams(params as Record<string, string> || {}).toString()}`),

  getStatisticsNational: () => request('/statistics/national'),

  getTopPrefectures: (limit = 10) => request(`/statistics/top?limit=${limit}`),

  // Dark Job Checker (F7)
  checkDarkJob: (text: string) =>
    request('/ai/dark-job-check', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Conversation Summary (F5)
  reportConversation: (data: { text: string; elderlyId?: string }) =>
    request('/events', {
      method: 'POST',
      body: JSON.stringify({
        type: 'conversation_ai',
        severity: 'medium',
        payload: { conversationText: data.text },
      }),
    }),

  // Voice Analyze (F3)
  voiceAnalyze: (transcript: string) =>
    request('/ai/voice-analyze', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    }),
};
