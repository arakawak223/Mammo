import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncBlocklistDto {
  @ApiProperty({ description: '同期完了としてマークするブロック番号のID一覧' })
  @IsArray()
  @IsString({ each: true })
  numberIds: string[];
}
