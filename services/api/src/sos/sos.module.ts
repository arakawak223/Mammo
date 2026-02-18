import { Module } from '@nestjs/common';
import { SosService } from './sos.service';
import { SosController, SosSettingsController } from './sos.controller';
import { SosGateway } from './sos.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SosController, SosSettingsController],
  providers: [SosService, SosGateway],
})
export class SosModule {}
