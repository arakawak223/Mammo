import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncBlocklistDto {
  @ApiProperty({ description: 'IDs of blocked numbers to mark as synced' })
  @IsArray()
  @IsString({ each: true })
  numberIds: string[];
}
