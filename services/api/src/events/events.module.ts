import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AutoForwardService } from './auto-forward.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { BlocklistModule } from '../blocklist/blocklist.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [NotificationsModule, AiModule, BlocklistModule, AlertsModule],
  controllers: [EventsController],
  providers: [EventsService, AutoForwardService],
  exports: [EventsService],
})
export class EventsModule {}
