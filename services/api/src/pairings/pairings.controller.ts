import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PairingsService } from './pairings.service';
import { JoinPairingDto } from './dto/join-pairing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pairings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pairings')
export class PairingsController {
  constructor(private pairingsService: PairingsService) {}

  @Post()
  @ApiOperation({ summary: 'ペアリング招待コード生成（高齢者IDを指定）' })
  @ApiResponse({ status: 201, description: '招待コード生成完了（有効期限30分）' })
  createInvite(@Req() req: any, @Body('elderlyId') elderlyId: string) {
    return this.pairingsService.createInvite(elderlyId, req.user.id);
  }

  @Post('join')
  @ApiOperation({ summary: '招待コードでペアリング参加' })
  @ApiResponse({ status: 201, description: 'ペアリング参加完了' })
  @ApiResponse({ status: 400, description: '招待コードが無効または期限切れ' })
  join(@Req() req: any, @Body() dto: JoinPairingDto) {
    return this.pairingsService.joinByCode(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'ペアリング一覧取得' })
  @ApiResponse({ status: 200, description: 'ペアリング一覧' })
  list(@Req() req: any) {
    return this.pairingsService.getPairings(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ペアリング解除' })
  @ApiResponse({ status: 200, description: 'ペアリング解除完了' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.pairingsService.removePairing(id, req.user.id);
  }
}
