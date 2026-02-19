jest.mock('../../services/api', () => ({
  api: { createEvent: jest.fn(() => Promise.resolve({ id: '1' })) },
}));

jest.mock('../offlineQueue', () => ({
  enqueueEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../native/CallDetector', () => ({
  CallDetector: {
    hasPermission: jest.fn(() => Promise.resolve(true)),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    startListening: jest.fn(() => Promise.resolve()),
    stopListening: jest.fn(() => Promise.resolve()),
    onIncomingCall: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../native/SmsDetector', () => ({
  SmsDetector: {
    hasPermission: jest.fn(() => Promise.resolve(true)),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    startListening: jest.fn(() => Promise.resolve()),
    stopListening: jest.fn(() => Promise.resolve()),
    onIncomingSms: jest.fn(() => jest.fn()),
  },
}));

import { startAutoForward, stopAutoForward } from '../autoForward';
import { CallDetector } from '../../native/CallDetector';
import { SmsDetector } from '../../native/SmsDetector';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('autoForward', () => {
  describe('startAutoForward', () => {
    it('should start call and SMS listeners', async () => {
      await startAutoForward();

      expect(CallDetector.hasPermission).toHaveBeenCalled();
      expect(CallDetector.startListening).toHaveBeenCalled();
      expect(CallDetector.onIncomingCall).toHaveBeenCalled();

      expect(SmsDetector.hasPermission).toHaveBeenCalled();
      expect(SmsDetector.startListening).toHaveBeenCalled();
      expect(SmsDetector.onIncomingSms).toHaveBeenCalled();
    });

    it('should request permission if not granted', async () => {
      (CallDetector.hasPermission as jest.Mock).mockResolvedValueOnce(false);
      (SmsDetector.hasPermission as jest.Mock).mockResolvedValueOnce(false);

      await startAutoForward();

      expect(CallDetector.requestPermission).toHaveBeenCalled();
      expect(SmsDetector.requestPermission).toHaveBeenCalled();
    });
  });

  describe('stopAutoForward', () => {
    it('should stop all listeners', async () => {
      await startAutoForward();
      await stopAutoForward();

      expect(CallDetector.stopListening).toHaveBeenCalled();
      expect(SmsDetector.stopListening).toHaveBeenCalled();
    });
  });
});
