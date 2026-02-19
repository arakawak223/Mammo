/**
 * SMS Detector native module.
 * On Android: Uses BroadcastReceiver for SMS_RECEIVED via NativeModules
 * On iOS: Not available (iOS doesn't allow SMS interception)
 *
 * Falls back to stub on platforms without native implementation.
 */
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface IncomingSms {
  sender: string;
  body: string;
  timestamp: string;
  isInternational: boolean;
}

export interface SmsDetectorInterface {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  onIncomingSms: (callback: (sms: IncomingSms) => void) => () => void;
}

// ─── Native bridge implementation (Android only) ───

function createNativeSmsDetector(): SmsDetectorInterface | null {
  if (Platform.OS !== 'android') return null;

  const nativeModule = NativeModules.MamoriSmsDetector;
  if (!nativeModule) return null;

  const eventEmitter = new NativeEventEmitter(nativeModule);

  return {
    startListening: async () => {
      await nativeModule.startListening();
    },
    stopListening: async () => {
      await nativeModule.stopListening();
    },
    hasPermission: async () => {
      return nativeModule.hasPermission();
    },
    requestPermission: async () => {
      return nativeModule.requestPermission();
    },
    onIncomingSms: (callback: (sms: IncomingSms) => void) => {
      const subscription = eventEmitter.addListener('onIncomingSms', (event: any) => {
        callback({
          sender: event.sender || '',
          body: event.body || '',
          timestamp: event.timestamp || new Date().toISOString(),
          isInternational: event.isInternational || false,
        });
      });
      return () => subscription.remove();
    },
  };
}

// ─── Stub for development / iOS ───

const stubSmsDetector: SmsDetectorInterface = {
  startListening: async () => {
    if (Platform.OS === 'ios') {
      console.log('[SmsDetector] SMS interception not available on iOS');
    } else {
      console.log('[SmsDetector] Start listening (stub — native module not available)');
    }
  },
  stopListening: async () => {
    console.log('[SmsDetector] Stop listening (stub)');
  },
  hasPermission: async () => {
    return false;
  },
  requestPermission: async () => {
    if (Platform.OS === 'ios') {
      console.log('[SmsDetector] SMS permission not available on iOS');
    } else {
      console.log('[SmsDetector] Request permission (stub — use EAS build for native)');
    }
    return false;
  },
  onIncomingSms: (_callback) => {
    return () => {};
  },
};

// ─── Export: native on Android device, stub otherwise ───

export const SmsDetector: SmsDetectorInterface =
  createNativeSmsDetector() || stubSmsDetector;
