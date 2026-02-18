import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PairingsModule } from './pairings/pairings.module';
import { EventsModule } from './events/events.module';
import { BlocklistModule } from './blocklist/blocklist.module';
import { SosModule } from './sos/sos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { AlertsModule } from './alerts/alerts.module';
import { StatisticsModule } from './statistics/statistics.module';
import { MetricsModule } from './metrics/metrics.module';
import { TasksModule } from './tasks/tasks.module';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { validate } from './common/config/env.validation';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
        redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
        customProps: (req: any) => ({
          requestId: req.headers['x-request-id'],
        }),
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'test' ? 1000 : 60,
      },
    ]),
    PrismaModule,
    RedisCacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PairingsModule,
    EventsModule,
    BlocklistModule,
    SosModule,
    NotificationsModule,
    AlertsModule,
    StatisticsModule,
    MetricsModule,
    TasksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    // 本番: Redis分散レート制限、開発/テスト: インメモリ
    ...(isProduction
      ? [{ provide: ThrottlerStorage, useClass: RedisThrottlerStorage }]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
