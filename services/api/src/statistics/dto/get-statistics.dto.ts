import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

export class GetTrendDto {
  @ApiPropertyOptional({ description: '都道府県名（未指定で全国）' })
  @IsOptional()
  @IsString()
  prefecture?: string;

  @ApiPropertyOptional({ description: '取得月数（デフォルト: 6）', default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}
