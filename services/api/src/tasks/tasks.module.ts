import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';
import { DigestService } from './digest.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    StatisticsModule,
  ],
  providers: [CleanupService, DigestService],
  exports: [DigestService],
})
export class TasksModule {}
