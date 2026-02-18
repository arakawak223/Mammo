import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BlocklistService } from './blocklist.service';
import { AddBlockedNumberDto } from './dto/add-blocked-number.dto';
import { SyncBlocklistDto } from './dto/sync-blocklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ブロックリスト')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('elderly/:elderlyId/blocklist')
export class BlocklistController {
  constructor(private blocklistService: BlocklistService) {}

  @Get()
  @ApiOperation({
    summary: 'ブロックリスト取得',
    description: '指定した高齢者のブロック番号一覧を取得します。',
  })
  @ApiParam({ name: 'elderlyId', description: '高齢者ユーザーID' })
  getList(@Req() req: any, @Param('elderlyId') elderlyId: string) {
    return this.blocklistService.getList(elderlyId, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: '番号追加',
    description: 'ブロックリストに電話番号を追加します。',
  })
  @ApiParam({ name: 'elderlyId', description: '高齢者ユーザーID' })
  addNumber(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Body() dto: AddBlockedNumberDto,
  ) {
    return this.blocklistService.addNumber(elderlyId, req.user.id, dto);
  }

  @Delete(':numberId')
  @ApiOperation({
    summary: '番号削除（ブロック解除）',
    description: 'ブロックリストから電話番号を削除（ブロック解除）します。',
  })
  @ApiParam({ name: 'elderlyId', description: '高齢者ユーザーID' })
  @ApiParam({ name: 'numberId', description: 'ブロック番号ID' })
  removeNumber(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Param('numberId') numberId: string,
  ) {
    return this.blocklistService.removeNumber(elderlyId, numberId, req.user.id);
  }

  @Post('sync')
  @ApiOperation({
    summary: 'ブロックリスト同期完了マーク',
    description: '端末側への同期が完了したブロック番号をマークします。',
  })
  @ApiParam({ name: 'elderlyId', description: '高齢者ユーザーID' })
  syncBlocklist(
    @Param('elderlyId') elderlyId: string,
    @Body() dto: SyncBlocklistDto,
  ) {
    return this.blocklistService.markSynced(elderlyId, dto.numberIds);
  }
}
