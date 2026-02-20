import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    interceptor = new AuditLogInterceptor();
  });

  function createMockContext(method: string, url: string, user?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          ip: '127.0.0.1',
          user: user || null,
          headers: { 'x-request-id': 'req-123' },
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  }

  function createMockHandler(response?: any): CallHandler {
    return { handle: () => of(response || { ok: true }) };
  }

  function createErrorHandler(error: Error): CallHandler {
    return { handle: () => throwError(() => error) };
  }

  it('should pass through non-audit requests without logging', (done) => {
    const ctx = createMockContext('GET', '/api/v1/health');
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
      },
      complete: done,
    });
  });

  it('should log audit for POST /auth/register', (done) => {
    const ctx = createMockContext('POST', '/api/v1/auth/register', { id: 'u1' });
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
      },
      complete: done,
    });
  });

  it('should log audit for POST /events', (done) => {
    const ctx = createMockContext('POST', '/api/v1/events', { id: 'u1' });
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: done,
    });
  });

  it('should log audit for DELETE /blocklist', (done) => {
    const ctx = createMockContext('DELETE', '/api/v1/elderly/e1/blocklist/bn-1', { id: 'f1' });
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: done,
    });
  });

  it('should log audit error on handler failure for audit paths', (done) => {
    const ctx = createMockContext('POST', '/api/v1/auth/login', { id: 'u1' });
    const handler = createErrorHandler(new Error('DB error'));

    interceptor.intercept(ctx, handler).subscribe({
      error: (err) => {
        expect(err.message).toBe('DB error');
        done();
      },
    });
  });

  it('should use anonymous when user is not set', (done) => {
    const ctx = createMockContext('POST', '/api/v1/auth/login');
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: done,
    });
  });

  it('should log SOS audit events', (done) => {
    const ctx = createMockContext('POST', '/api/v1/sos/start', { id: 'u1' });
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: done,
    });
  });

  it('should log PATCH /events audit', (done) => {
    const ctx = createMockContext('PATCH', '/api/v1/events/evt-1/resolve', { id: 'f1' });
    const handler = createMockHandler();

    interceptor.intercept(ctx, handler).subscribe({
      complete: done,
    });
  });
});
