import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/api', () => ({
  api: { createEvent: jest.fn() },
}));

import { enqueueEvent, getQueue, flushQueue, clearQueue } from '../offlineQueue';
import { api } from '../api';

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  // Reset mocks but keep setTimeout spy active
  (AsyncStorage.getItem as jest.Mock).mockReset().mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockReset().mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockReset().mockResolvedValue(undefined);
  (mockApi.createEvent as jest.Mock).mockReset();

  // Make setTimeout execute immediately (bypass backoff delay)
  jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
    if (typeof fn === 'function') fn();
    return 0 as any;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('offlineQueue', () => {
  describe('enqueueEvent', () => {
    it('should add event to empty queue', async () => {
      await enqueueEvent({ type: 'scam_button', severity: 'high' });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@mamori/offline_queue',
        expect.any(String),
      );

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );
      expect(savedData).toHaveLength(1);
      expect(savedData[0].type).toBe('scam_button');
      expect(savedData[0].severity).toBe('high');
      expect(savedData[0].retryCount).toBe(0);
    });

    it('should append to existing queue', async () => {
      const existing = [
        { id: 'old', type: 'test', severity: 'low', createdAt: '2026-01-01', retryCount: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await enqueueEvent({ type: 'scam_button', severity: 'high' });

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );
      expect(savedData).toHaveLength(2);
    });
  });

  describe('getQueue', () => {
    it('should return empty array when no queue exists', async () => {
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('should return parsed queue', async () => {
      const data = [
        { id: '1', type: 'test', severity: 'low', createdAt: '2026-01-01', retryCount: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('1');
    });
  });

  describe('flushQueue', () => {
    it('should return zeros for empty queue', async () => {
      const result = await flushQueue();
      expect(result).toEqual({ sent: 0, failed: 0, dropped: 0 });
    });

    it('should send all events successfully', async () => {
      const data = [
        { id: '1', type: 'scam_button', severity: 'high', createdAt: '2026-01-01', retryCount: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
      (mockApi.createEvent as jest.Mock).mockResolvedValue({ id: 'server-1' });

      const result = await flushQueue();
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should increment retryCount on failure', async () => {
      const data = [
        { id: '1', type: 'test', severity: 'high', createdAt: '2026-01-01', retryCount: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
      (mockApi.createEvent as jest.Mock).mockRejectedValue(new Error('network'));

      const result = await flushQueue();
      expect(result.failed).toBe(1);

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );
      expect(savedData[0].retryCount).toBe(1);
    });

    it('should drop events exceeding max retries', async () => {
      const data = [
        { id: '1', type: 'test', severity: 'high', createdAt: '2026-01-01', retryCount: 5 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
      (mockApi.createEvent as jest.Mock).mockRejectedValue(new Error('network'));

      const result = await flushQueue();
      expect(result.dropped).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should remove queue from storage', async () => {
      await clearQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@mamori/offline_queue');
    });
  });
});
