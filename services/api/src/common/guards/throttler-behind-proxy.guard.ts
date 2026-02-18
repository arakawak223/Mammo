import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ips?.length ? req.ips[0] : req.ip);
  }

  // Skip throttling for WebSocket connections (handled separately)
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'ws') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }

  /**
   * Override handleRequest to enhance rate limit response headers.
   *
   * The base ThrottlerGuard (v6) sets:
   *   X-RateLimit-Limit      — max requests in the window
   *   X-RateLimit-Remaining   — requests left
   *   X-RateLimit-Reset       — timeToExpire (seconds remaining)
   *
   * This override:
   *   1. Converts X-RateLimit-Reset to a Unix epoch timestamp (seconds
   *      since 1970-01-01) so clients can compute the absolute reset time.
   *   2. Adds a Retry-After header (seconds until the window resets) for
   *      consistency with RFC 6585 / HTTP 429 semantics.
   */
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    // super.handleRequest increments the counter AND sets the base headers
    const result = await super.handleRequest(requestProps);

    const { context, throttler } = requestProps;

    if (context.getType() !== 'http') {
      return result;
    }

    const { res } = this.getRequestResponse(context);
    const suffix = throttler.name === 'default' ? '' : `-${throttler.name}`;

    // Read the timeToExpire value the base class wrote as X-RateLimit-Reset
    const timeToExpire = Number(
      res.getHeader(`X-RateLimit-Reset${suffix}`) ?? 0,
    );
    const remaining = Number(
      res.getHeader(`X-RateLimit-Remaining${suffix}`) ?? 0,
    );

    // Replace relative seconds with absolute Unix epoch timestamp
    const resetEpoch = Math.ceil(Date.now() / 1000) + timeToExpire;
    res.header(`X-RateLimit-Reset${suffix}`, String(resetEpoch));

    // Retry-After: 0 if requests remain, otherwise seconds until reset
    res.header('Retry-After', String(remaining > 0 ? 0 : timeToExpire));

    return result;
  }
}
