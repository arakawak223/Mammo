import { Controller, Get, Put, Body, Req, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SerializeInterceptor } from '../common/interceptors/serialize.interceptor';
import { UserResponseDto } from '../common/dto/user-response.dto';

@ApiTags('ユーザー')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(new SerializeInterceptor(UserResponseDto))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '自分のプロフィール取得', description: 'ログイン中のユーザー情報を返します' })
  @ApiResponse({ status: 200, description: 'ユーザープロフィール（passwordHash除外）' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つからない' })
  async getProfile(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('ユーザーが見つかりません');
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: 'プロフィール更新', description: '表示名・都道府県を更新します' })
  @ApiResponse({ status: 200, description: 'プロフィール更新完了' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}
