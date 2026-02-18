import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
})
export class AppModule {}
