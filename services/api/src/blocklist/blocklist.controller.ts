import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlocklistService } from './blocklist.service';
import { AddBlockedNumberDto } from './dto/add-blocked-number.dto';
import { SyncBlocklistDto } from './dto/sync-blocklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('blocklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('elderly/:elderlyId/blocklist')
export class BlocklistController {
  constructor(private blocklistService: BlocklistService) {}

  @Get()
  @ApiOperation({ summary: 'ブロックリスト取得' })
  getList(@Req() req: any, @Param('elderlyId') elderlyId: string) {
    return this.blocklistService.getList(elderlyId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '番号追加' })
  addNumber(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Body() dto: AddBlockedNumberDto,
  ) {
    return this.blocklistService.addNumber(elderlyId, req.user.id, dto);
  }

  @Delete(':numberId')
  @ApiOperation({ summary: '番号削除（ブロック解除）' })
  removeNumber(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Param('numberId') numberId: string,
  ) {
    return this.blocklistService.removeNumber(elderlyId, numberId, req.user.id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'ブロックリスト同期完了マーク' })
  syncBlocklist(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Body() dto: SyncBlocklistDto,
  ) {
    return this.blocklistService.markSynced(elderlyId, dto.numberIds);
  }
}
