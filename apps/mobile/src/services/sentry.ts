/**
 * Sentry error tracking configuration.
 * Lazy-loaded: @sentry/react-native is only imported when DSN is configured.
 */

let SentryModule: any = null;

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('[Sentry] DSN not configured, skipping initialization');
    }
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SentryModule = require('@sentry/react-native');
    SentryModule.init({
      dsn: SENTRY_DSN,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      beforeSend(event: any) {
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });
  } catch {
    if (__DEV__) {
      console.log('[Sentry] @sentry/react-native not installed, skipping');
    }
  }
}

export function setUser(userId: string, role: string): void {
  SentryModule?.setUser({ id: userId, role });
}

export function clearUser(): void {
  SentryModule?.setUser(null);
}

export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!SentryModule) return;

  if (context) {
    SentryModule.withScope((scope: any) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      SentryModule.captureException(error);
    });
  } else {
    SentryModule.captureException(error);
  }
}

export function addBreadcrumb(
  category: string,
  message: string,
  level: string = 'info',
): void {
  SentryModule?.addBreadcrumb({ category, message, level });
}
