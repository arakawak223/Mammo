/**
 * Call Detector native module.
 * On Android: Uses PhoneStateListener / TelecomManager via NativeModules
 * On iOS: Uses CallKit CXCallObserver via NativeModules
 *
 * Falls back to stub on platforms without native implementation.
 */
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface IncomingCall {
  phoneNumber: string;
  timestamp: string;
  isInternational: boolean;
  isInContacts: boolean;
  callerName?: string;
}

export interface CallDetectorInterface {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  onIncomingCall: (callback: (call: IncomingCall) => void) => () => void;
}

// ─── Native bridge implementation ───

function createNativeCallDetector(): CallDetectorInterface | null {
  const nativeModule = NativeModules.MamoriCallDetector;
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
    onIncomingCall: (callback: (call: IncomingCall) => void) => {
      const subscription = eventEmitter.addListener('onIncomingCall', (event: any) => {
        callback({
          phoneNumber: event.phoneNumber || '',
          timestamp: event.timestamp || new Date().toISOString(),
          isInternational: event.isInternational || false,
          isInContacts: event.isInContacts || false,
          callerName: event.callerName,
        });
      });
      return () => subscription.remove();
    },
  };
}

// ─── Stub for development ───

const stubCallDetector: CallDetectorInterface = {
  startListening: async () => {
    console.log('[CallDetector] Start listening (stub — native module not available)');
  },
  stopListening: async () => {
    console.log('[CallDetector] Stop listening (stub)');
  },
  hasPermission: async () => {
    return false;
  },
  requestPermission: async () => {
    console.log('[CallDetector] Request permission (stub — use EAS build for native)');
    return false;
  },
  onIncomingCall: (_callback) => {
    return () => {};
  },
};

// ─── Export: native on device, stub otherwise ───

export const CallDetector: CallDetectorInterface =
  (Platform.OS === 'android' || Platform.OS === 'ios')
    ? createNativeCallDetector() || stubCallDetector
    : stubCallDetector;
