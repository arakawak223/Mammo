import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { GetStatisticsDto } from './dto/get-statistics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: '都道府県別詐欺統計取得' })
  getStatistics(@Query() query: GetStatisticsDto) {
    if (query.prefecture) {
      return this.statisticsService.getByPrefecture(query.prefecture, query.yearMonth);
    }
    return this.statisticsService.getNational(query.yearMonth);
  }

  @Get('national')
  @ApiOperation({ summary: '全国集計統計' })
  getNational(@Query('yearMonth') yearMonth?: string) {
    return this.statisticsService.getNational(yearMonth);
  }

  @Get('top')
  @ApiOperation({ summary: 'ワースト都道府県ランキング' })
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
