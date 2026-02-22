import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null = null;

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — cache disabled (in-memory fallback)');
      return;
    }
    this.client = new Redis(redisUrl, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis connection failed: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache write failure is non-critical
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Cache delete failure is non-critical
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // Cache delete failure is non-critical
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
