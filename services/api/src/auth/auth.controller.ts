import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DeviceTokenDto } from './dto/device-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('認証')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'ユーザー登録' })
  @ApiResponse({ status: 201, description: 'ユーザー登録成功。ユーザー情報とトークンを返却' })
  @ApiResponse({ status: 409, description: '電話番号が既に登録済み' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'ログイン' })
  @ApiResponse({ status: 201, description: 'ログイン成功。ユーザー情報とトークンを返却' })
  @ApiResponse({ status: 401, description: '電話番号またはパスワードが不正' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'トークンリフレッシュ' })
  @ApiResponse({ status: 201, description: '新しいトークンペアを返却' })
  @ApiResponse({ status: 401, description: 'リフレッシュトークンが無効または期限切れ' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログアウト（全リフレッシュトークン取消）' })
  @ApiResponse({ status: 201, description: 'ログアウト完了。全リフレッシュトークン取消' })
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id, req.user.iat);
  }

  @Post('device-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'デバイストークン更新（プッシュ通知用）' })
  @ApiResponse({ status: 201, description: 'デバイストークン更新完了' })
  updateDeviceToken(@Req() req: any, @Body() dto: DeviceTokenDto) {
    return this.authService.updateDeviceToken(req.user.id, dto.deviceToken);
  }
}
