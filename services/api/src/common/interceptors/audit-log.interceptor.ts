import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** 重要操作の監査ログを記録するインターセプター */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  /** 監査対象パターン: POST/PUT/PATCH/DELETE の特定パス */
  private readonly auditPatterns = [
    { method: 'POST', path: /\/auth\/(register|login|logout)/ },
    { method: 'POST', path: /\/pairings/ },
    { method: 'DELETE', path: /\/pairings/ },
    { method: 'POST', path: /\/blocklist/ },
    { method: 'DELETE', path: /\/blocklist/ },
    { method: 'POST', path: /\/sos/ },
    { method: 'PATCH', path: /\/sos/ },
    { method: 'POST', path: /\/events/ },
    { method: 'PATCH', path: /\/events/ },
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;

    const shouldAudit = this.auditPatterns.some(
      (p) => p.method === method && p.path.test(url),
    );

    if (!shouldAudit) {
      return next.handle();
    }

    const userId = req.user?.id || 'anonymous';
    const requestId = req.headers['x-request-id'] || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            action: 'audit',
            method,
            path: url,
            userId,
            requestId,
            ip,
            statusCode: context.switchToHttp().getResponse().statusCode,
            durationMs: Date.now() - startTime,
          });
        },
        error: (error) => {
          this.logger.warn({
            action: 'audit_error',
            method,
            path: url,
            userId,
            requestId,
            ip,
            error: error.message,
            durationMs: Date.now() - startTime,
          });
        },
      }),
    );
  }
}
