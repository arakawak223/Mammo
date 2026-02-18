import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'イベント送信（高齢者端末から）' })
  create(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'イベント詳細取得（AI解析含む）' })
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Get('elderly/:elderlyId')
  @ApiOperation({ summary: 'イベント一覧取得（家族が閲覧）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByElderly(
    @Param('elderlyId') elderlyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findByElderly(elderlyId, page, limit);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: '対応済みマーク' })
  resolve(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.resolve(id, req.user.id);
  }
}
