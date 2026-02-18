import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('この電話番号は既に登録されています');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        role: dto.role,
        prefecture: dto.prefecture,
        passwordHash,
      },
    });

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new UnauthorizedException('電話番号またはパスワードが正しくありません');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('電話番号またはパスワードが正しくありません');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, ...tokens };
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('リフレッシュトークンが無効です');
    }

    // Rotate: delete old token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.user.id, stored.user.role);
    return tokens;
  }

  async updateDeviceToken(userId: string, deviceToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deviceToken },
    });
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwt.sign(payload);
    const refreshTokenValue = nanoid(64);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
