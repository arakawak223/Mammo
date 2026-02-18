import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceTokenDto {
  @ApiProperty()
  @IsString()
  deviceToken: string;
}
