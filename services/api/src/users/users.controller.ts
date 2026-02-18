import { Controller, Get, Put, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('ユーザー')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '自分のプロフィール取得', description: 'ログイン中のユーザー情報を返します' })
  async getProfile(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('ユーザーが見つかりません');
    const { passwordHash, ...profile } = user;
    return profile;
  }

  @Put('me')
  @ApiOperation({ summary: 'プロフィール更新', description: '表示名・都道府県を更新します' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(req.user.id, dto);
    const { passwordHash, ...profile } = updated;
    return profile;
  }
}
