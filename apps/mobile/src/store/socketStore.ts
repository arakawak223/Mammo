import { create } from 'zustand';

interface SosData {
  sessionId: string;
  mode: 'alarm' | 'silent';
  locations: Array<{ lat: number; lng: number; ts: string; accuracy?: number; battery?: number }>;
}

interface AlertEvent {
  id: string;
  elderlyId: string;
  type: string;
  severity: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  aiAnalysis?: {
    riskScore: number;
    scamType: string;
    summary: string;
  } | null;
}

interface SocketState {
  // Connection state
  sosConnected: boolean;
  alertsConnected: boolean;
  setSosConnected: (connected: boolean) => void;
  setAlertsConnected: (connected: boolean) => void;

  // SOS real-time data
  activeSos: SosData | null;
  setActiveSos: (data: SosData | null) => void;
  addSosLocation: (location: SosData['locations'][0]) => void;
  setSosMode: (mode: 'alarm' | 'silent') => void;

  // Real-time alerts
  realtimeAlerts: AlertEvent[];
  addAlert: (alert: AlertEvent) => void;
  markAlertResolved: (eventId: string) => void;
  clearAlerts: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  sosConnected: false,
  alertsConnected: false,
  setSosConnected: (connected) => set({ sosConnected: connected }),
  setAlertsConnected: (connected) => set({ alertsConnected: connected }),

  activeSos: null,
  setActiveSos: (data) => set({ activeSos: data }),
  addSosLocation: (location) =>
    set((state) => {
      if (!state.activeSos) return state;
      return {
        activeSos: {
          ...state.activeSos,
          locations: [...state.activeSos.locations, location],
        },
      };
    }),
  setSosMode: (mode) =>
    set((state) => {
      if (!state.activeSos) return state;
      return { activeSos: { ...state.activeSos, mode } };
    }),

  realtimeAlerts: [],
  addAlert: (alert) =>
    set((state) => ({ realtimeAlerts: [alert, ...state.realtimeAlerts] })),
  markAlertResolved: (eventId) =>
    set((state) => ({
      realtimeAlerts: state.realtimeAlerts.map((a) =>
        a.id === eventId ? { ...a, status: 'resolved' } : a,
      ),
    })),
  clearAlerts: () => set({ realtimeAlerts: [] }),
}));
