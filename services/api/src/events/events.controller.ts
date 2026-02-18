import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('イベント')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @ApiOperation({
    summary: 'イベント送信（高齢者端末から）',
    description: '高齢者端末から詐欺検知イベントを送信します。AI解析・プッシュ通知・自動転送が自動実行されます。',
  })
  create(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.id, dto);
  }

  // Must be declared before :id to avoid route clash
  @Get('elderly/:elderlyId')
  @ApiOperation({
    summary: 'イベント一覧取得（家族が閲覧）',
    description: '指定した高齢者のイベント一覧をページネーション付きで取得します。',
  })
  @ApiParam({ name: 'elderlyId', description: '高齢者ユーザーID' })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号（1始まり）' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数' })
  findByElderly(
    @Param('elderlyId') elderlyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findByElderly(
      elderlyId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'イベント詳細取得（AI解析含む）',
    description: '特定イベントの詳細情報をAI解析結果付きで取得します。',
  })
  @ApiParam({ name: 'id', description: 'イベントID' })
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Patch(':id/resolve')
  @ApiOperation({
    summary: '対応済みマーク',
    description: 'イベントを対応済みとしてマークします。WebSocketで家族に通知されます。',
  })
  @ApiParam({ name: 'id', description: 'イベントID' })
  resolve(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.resolve(id, req.user.id);
  }
}
