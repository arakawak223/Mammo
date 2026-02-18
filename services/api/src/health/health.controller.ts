import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const startTime = Date.now();

@ApiTags('ヘルスチェック')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'ヘルスチェック',
    description:
      'APIサービスと依存サービス（DB/Redis/AI）の稼働状態を確認します。',
  })
  async check() {
    const dependencies: Record<
      string,
      { status: string; responseTime?: number; error?: string }
    > = {};

    // Database check
    dependencies.database = await this.checkDatabase();

    // Redis check
    dependencies.redis = await this.checkRedis();

    // AI service check
    dependencies.ai = await this.checkAiService();

    const allOk = Object.values(dependencies).every(
      (d) => d.status === 'ok',
    );

    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'mamoritalk-api',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      dependencies,
    };
  }

  private async checkDatabase(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.warn(`Database health check failed: ${error}`);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: 'Connection failed',
      };
    }
  }

  private async checkRedis(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const Redis = await import('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = new Redis.default(redisUrl, {
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      return { status: 'ok', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.warn(`Redis health check failed: ${error}`);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: 'Connection failed',
      };
    }
  }

  private async checkAiService(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const aiUrl =
        process.env.AI_SERVICE_URL || 'http://localhost:8000';
      await firstValueFrom(
        this.httpService.get(`${aiUrl}/health`, { timeout: 5000 }),
      );
      return { status: 'ok', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.warn(`AI service health check failed: ${error}`);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: 'Connection failed',
      };
    }
  }
}
