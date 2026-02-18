import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetStatisticsDto {
  @ApiPropertyOptional({ description: '都道府県名' })
  @IsOptional()
  @IsString()
  prefecture?: string;

  @ApiPropertyOptional({ description: '年月 (YYYY-MM)' })
  @IsOptional()
  @IsString()
  yearMonth?: string;
}
