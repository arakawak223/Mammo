/**
 * SMS Detector native module interface.
 * On Android: Uses BroadcastReceiver for SMS_RECEIVED
 * On iOS: Not available (iOS doesn't allow SMS interception)
 *
 * This is a TypeScript interface only - native implementation
 * requires actual platform-specific code (Java/Kotlin).
 */

export interface IncomingSms {
  sender: string;
  body: string;
  timestamp: string;
  isInternational: boolean;
}

export interface SmsDetectorInterface {
  /** Start listening for incoming SMS (Android only) */
  startListening: () => Promise<void>;

  /** Stop listening */
  stopListening: () => Promise<void>;

  /** Check if SMS permission is granted */
  hasPermission: () => Promise<boolean>;

  /** Request RECEIVE_SMS permission */
  requestPermission: () => Promise<boolean>;

  /** Register callback for incoming SMS */
  onIncomingSms: (callback: (sms: IncomingSms) => void) => () => void;
}

/**
 * Stub implementation for development/Codespaces.
 * Replace with actual NativeModules bridge on real device builds.
 */
export const SmsDetector: SmsDetectorInterface = {
  startListening: async () => {
    console.log('[SmsDetector] Start listening (stub)');
  },

  stopListening: async () => {
    console.log('[SmsDetector] Stop listening (stub)');
  },

  hasPermission: async () => {
    console.log('[SmsDetector] Check permission (stub)');
    return false;
  },

  requestPermission: async () => {
    console.log('[SmsDetector] Request permission (stub)');
    return false;
  },

  onIncomingSms: (callback) => {
    console.log('[SmsDetector] Registered callback (stub)');
    return () => {};
  },
};
