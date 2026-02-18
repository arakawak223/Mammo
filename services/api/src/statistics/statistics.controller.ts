import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { GetStatisticsDto } from './dto/get-statistics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('統計')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: '都道府県別詐欺統計取得',
    description: '都道府県を指定して詐欺統計を取得します。未指定の場合は全国集計を返します。',
  })
  @ApiResponse({ status: 200, description: '都道府県別統計データ（BigIntはnumber変換済み）' })
  getStatistics(@Query() query: GetStatisticsDto) {
    if (query.prefecture) {
      return this.statisticsService.getByPrefecture(query.prefecture, query.yearMonth);
    }
    return this.statisticsService.getNational(query.yearMonth);
  }

  @Get('national')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: '全国集計統計',
    description: '全国の詐欺統計を集計して返します。',
  })
  @ApiQuery({ name: 'yearMonth', required: false, description: '年月（YYYY-MM）' })
  @ApiResponse({ status: 200, description: '全国集計データ' })
  getNational(@Query('yearMonth') yearMonth?: string) {
    return this.statisticsService.getNational(yearMonth);
  }

  @Get('top')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: 'ワースト都道府県ランキング',
    description: '詐欺被害件数の多い都道府県を上位から取得します。',
  })
  @ApiQuery({ name: 'limit', required: false, description: '取得件数（デフォルト: 10）' })
  @ApiQuery({ name: 'yearMonth', required: false, description: '年月（YYYY-MM）' })
  @ApiResponse({ status: 200, description: 'ワースト都道府県ランキング' })
  getTopPrefectures(
    @Query('limit') limit?: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    return this.statisticsService.getTopPrefectures(
      limit ? parseInt(limit, 10) : 10,
      yearMonth,
    );
  }
}
