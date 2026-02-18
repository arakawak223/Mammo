import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  createInvite(@Req() req: any, @Body('elderlyId') elderlyId: string) {
    return this.pairingsService.createInvite(elderlyId, req.user.id);
  }

  @Post('join')
  @ApiOperation({ summary: '招待コードでペアリング参加' })
  join(@Req() req: any, @Body() dto: JoinPairingDto) {
    return this.pairingsService.joinByCode(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'ペアリング一覧取得' })
  list(@Req() req: any) {
    return this.pairingsService.getPairings(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ペアリング解除' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.pairingsService.removePairing(id, req.user.id);
  }
}
