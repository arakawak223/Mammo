import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const QUEUE_KEY = '@mamori/offline_queue';

interface QueuedEvent {
  id: string;
  type: string;
  severity: string;
  payload?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export async function enqueueEvent(event: Omit<QueuedEvent, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedEvent = {
    ...event,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedEvent[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  const remaining: QueuedEvent[] = [];

  for (const event of queue) {
    try {
      await api.createEvent({
        type: event.type,
        severity: event.severity,
        payload: event.payload,
        latitude: event.latitude,
        longitude: event.longitude,
      });
      sent++;
    } catch {
      remaining.push(event);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { sent, failed: remaining.length };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
