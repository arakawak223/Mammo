import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(
      req.ips?.length ? req.ips[0] : req.ip,
    );
  }

  // Skip throttling for WebSocket connections (handled separately)
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'ws') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
