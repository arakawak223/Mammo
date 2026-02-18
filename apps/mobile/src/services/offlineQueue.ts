import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const QUEUE_KEY = '@mamori/offline_queue';
const MAX_RETRIES = 5;

interface QueuedEvent {
  id: string;
  type: string;
  severity: string;
  payload?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  retryCount: number;
}

export async function enqueueEvent(event: Omit<QueuedEvent, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedEvent = {
    ...event,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedEvent[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function backoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function flushQueue(): Promise<{ sent: number; failed: number; dropped: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { sent: 0, failed: 0, dropped: 0 };

  let sent = 0;
  let dropped = 0;
  const remaining: QueuedEvent[] = [];

  for (const event of queue) {
    try {
      if (event.retryCount > 0) {
        await sleep(backoffDelay(event.retryCount));
      }
      await api.createEvent({
        type: event.type,
        severity: event.severity,
        payload: event.payload,
        latitude: event.latitude,
        longitude: event.longitude,
      });
      sent++;
    } catch {
      if (event.retryCount >= MAX_RETRIES) {
        dropped++;
      } else {
        remaining.push({ ...event, retryCount: event.retryCount + 1 });
      }
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { sent, failed: remaining.length, dropped };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
