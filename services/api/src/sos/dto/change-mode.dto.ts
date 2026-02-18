import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeModeDto {
  @ApiProperty({ enum: ['alarm', 'silent'] })
  @IsEnum(['alarm', 'silent'] as const)
  mode: 'alarm' | 'silent';
}
