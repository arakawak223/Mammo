import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private client: Redis | null = null;
  private connected = false;

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.connected = false;
      return;
    }
    try {
      this.client = new Redis(redisUrl, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
        lazyConnect: true,
      });
      this.client.on('error', () => {
        this.connected = false;
      });
      this.client
        .connect()
        .then(() => {
          this.connected = true;
        })
        .catch(() => {
          this.connected = false;
        });
    } catch {
      this.connected = false;
    }
  }

  async increment(
    key: string,
    ttl: number,
    _limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.connected || !this.client) {
      // Fallback: allow request if Redis is down
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    const ttlSeconds = Math.ceil(ttl / 1000);
    const throttleKey = `throttle:${key}`;

    try {
      const totalHits = await this.client.incr(throttleKey);
      if (totalHits === 1) {
        await this.client.expire(throttleKey, ttlSeconds);
      }
      const currentTtl = await this.client.ttl(throttleKey);

      return {
        totalHits,
        timeToExpire: currentTtl * 1000,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch {
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
