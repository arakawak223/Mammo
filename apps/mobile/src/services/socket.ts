import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let sosSocket: Socket | null = null;
let alertsSocket: Socket | null = null;

function getToken(): string | null {
  return useAuthStore.getState().accessToken;
}

function log(...args: unknown[]) {
  if (__DEV__) {
    console.log(...args);
  }
}

function warn(...args: unknown[]) {
  if (__DEV__) {
    console.warn(...args);
  }
}

export function connectSosSocket(): Socket {
  if (sosSocket?.connected) return sosSocket;

  sosSocket = io(`${API_BASE}/ws/sos`, {
    auth: { token: getToken() },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.3,
  });

  sosSocket.on('connect', () => {
    log('[SOS WS] Connected');
  });

  sosSocket.on('disconnect', (reason) => {
    log('[SOS WS] Disconnected:', reason);
  });

  sosSocket.on('connect_error', (error) => {
    warn('[SOS WS] Connection error:', error.message);
  });

  return sosSocket;
}

export function connectAlertsSocket(): Socket {
  if (alertsSocket?.connected) return alertsSocket;

  alertsSocket = io(`${API_BASE}/ws/alerts`, {
    auth: { token: getToken() },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.3,
  });

  alertsSocket.on('connect', () => {
    log('[Alerts WS] Connected');
  });

  alertsSocket.on('disconnect', (reason) => {
    log('[Alerts WS] Disconnected:', reason);
  });

  alertsSocket.on('connect_error', (error) => {
    warn('[Alerts WS] Connection error:', error.message);
  });

  return alertsSocket;
}

export function disconnectAll() {
  sosSocket?.disconnect();
  alertsSocket?.disconnect();
  sosSocket = null;
  alertsSocket = null;
}

export function getSosSocket(): Socket | null {
  return sosSocket;
}

export function getAlertsSocket(): Socket | null {
  return alertsSocket;
}
