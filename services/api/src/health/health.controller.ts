import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('ヘルスチェック')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'ヘルスチェック',
    description: 'APIサービスの稼働状態を確認します。',
  })
  check() {
    return {
      status: 'ok',
      service: 'mamoritalk-api',
      timestamp: new Date().toISOString(),
    };
  }
}
