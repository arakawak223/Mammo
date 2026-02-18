import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceTokenDto {
  @ApiProperty({ description: 'FCMデバイストークン（プッシュ通知用）' })
  @IsString()
  deviceToken: string;
}
