import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartSosDto {
  @ApiProperty({ enum: ['alarm', 'silent'], required: false })
  @IsOptional()
  @IsEnum(['alarm', 'silent'] as const)
  mode?: 'alarm' | 'silent';

  @ApiProperty({ example: 35.6812 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 139.7671 })
  @IsNumber()
  longitude: number;
}
