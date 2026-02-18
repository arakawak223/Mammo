import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'test' ? 1000 : 60,
      },
    ]),
    PrismaModule,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
