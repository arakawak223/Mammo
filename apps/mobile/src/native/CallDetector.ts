/**
 * Call Detector native module interface.
 * On Android: Uses PhoneStateListener / TelecomManager
 * On iOS: Uses CallKit CXCallObserver
 *
 * This is a TypeScript interface only - native implementation
 * requires actual platform-specific code (Java/Kotlin, Swift/ObjC).
 */

export interface IncomingCall {
  phoneNumber: string;
  timestamp: string;
  isInternational: boolean;
  isInContacts: boolean;
  callerName?: string;
}

export interface CallDetectorInterface {
  /** Start listening for incoming calls */
  startListening: () => Promise<void>;

  /** Stop listening */
  stopListening: () => Promise<void>;

  /** Check if permissions are granted */
  hasPermission: () => Promise<boolean>;

  /** Request phone state permission (Android) / CallKit access (iOS) */
  requestPermission: () => Promise<boolean>;

  /** Register callback for incoming calls */
  onIncomingCall: (callback: (call: IncomingCall) => void) => () => void;
}

/**
 * Stub implementation for development/Codespaces.
 * Replace with actual NativeModules bridge on real device builds.
 */
export const CallDetector: CallDetectorInterface = {
  startListening: async () => {
    console.log('[CallDetector] Start listening (stub)');
  },

  stopListening: async () => {
    console.log('[CallDetector] Stop listening (stub)');
  },

  hasPermission: async () => {
    console.log('[CallDetector] Check permission (stub)');
    return false;
  },

  requestPermission: async () => {
    console.log('[CallDetector] Request permission (stub)');
    return false;
  },

  onIncomingCall: (callback) => {
    console.log('[CallDetector] Registered callback (stub)');
    // Return unsubscribe function
    return () => {};
  },
};
