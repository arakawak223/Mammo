import { Controller, Post, Get, Put, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SosService } from './sos.service';
import { StartSosDto } from './dto/start-sos.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ChangeModeDto } from './dto/change-mode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sos')
export class SosController {
  constructor(private sosService: SosService) {}

  @Post('start')
  @ApiOperation({ summary: 'SOS開始' })
  start(@Req() req: any, @Body() dto: StartSosDto) {
    return this.sosService.start(req.user.id, dto);
  }

  @Post(':id/location')
  @ApiOperation({ summary: '位置情報更新' })
  updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.sosService.updateLocation(id, dto);
  }

  @Patch(':id/mode')
  @ApiOperation({ summary: 'SOSモード切替（家族のみ）' })
  changeMode(@Req() req: any, @Param('id') id: string, @Body() dto: ChangeModeDto) {
    return this.sosService.changeMode(id, dto.mode, req.user.id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'SOS解除（家族のみ）' })
  resolve(@Req() req: any, @Param('id') id: string) {
    return this.sosService.resolve(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'SOSセッション取得' })
  getSession(@Param('id') id: string) {
    return this.sosService.getSession(id);
  }
}

@ApiTags('sos-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('elderly/:elderlyId/sos-settings')
export class SosSettingsController {
  constructor(private sosService: SosService) {}

  @Get()
  @ApiOperation({ summary: 'SOSモード設定取得' })
  getSettings(@Param('elderlyId') elderlyId: string) {
    return this.sosService.getSettings(elderlyId);
  }

  @Put()
  @ApiOperation({ summary: 'SOSモード設定変更（家族のみ）' })
  updateSettings(
    @Req() req: any,
    @Param('elderlyId') elderlyId: string,
    @Body() dto: ChangeModeDto,
  ) {
    return this.sosService.updateSettings(elderlyId, dto.mode, req.user.id);
  }
}
