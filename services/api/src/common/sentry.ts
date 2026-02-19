/**
 * Sentry error tracking for NestJS API.
 * Lazy-loaded: @sentry/node is only imported when SENTRY_DSN is configured.
 */

let SentryModule: any = null;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || '';
  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SentryModule = require('@sentry/node');
    SentryModule.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event: any) {
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        if (
          event.exception?.values?.some(
            (e: any) =>
              e.type === 'UnauthorizedException' ||
              e.type === 'BadRequestException',
          )
        ) {
          return null;
        }
        return event;
      },
    });
  } catch {
    console.warn('[Sentry] @sentry/node not installed, skipping');
  }
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
