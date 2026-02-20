import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { nanoid } from 'nanoid';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 1800; // 30 minutes
const ATTEMPT_WINDOW_SECONDS = 300; // 5 minutes

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cache: RedisCacheService,
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
    // アカウントロック確認
    const locked = await this.cache.get<boolean>(`login:locked:${dto.phone}`);
    if (locked) {
      throw new UnauthorizedException(
        'アカウントがロックされています。30分後にお試しください',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      await this.incrementLoginAttempts(dto.phone);
      throw new UnauthorizedException('電話番号またはパスワードが正しくありません');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.incrementLoginAttempts(dto.phone);
      throw new UnauthorizedException('電話番号またはパスワードが正しくありません');
    }

    // ログイン成功 — 失敗カウンターをリセット
    await this.cache.del(`login:attempts:${dto.phone}`);

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, ...tokens };
  }

  private async incrementLoginAttempts(phone: string): Promise<void> {
    const key = `login:attempts:${phone}`;
    const current = await this.cache.get<number>(key) || 0;
    const attempts = current + 1;
    await this.cache.set(key, attempts, ATTEMPT_WINDOW_SECONDS);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await this.cache.set(`login:locked:${phone}`, true, LOCKOUT_DURATION_SECONDS);
      await this.cache.del(key);
    }
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

  async logout(userId: string, iat?: number) {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    // Access tokenも無効化（TTLはJWT有効期限と同期）
    if (iat) {
      await this.cache.set(`token:blacklist:${userId}:${iat}`, true, this.getJwtTtlSeconds());
    }
    return { message: 'ログアウトしました', revokedTokens: result.count };
  }

  async updateDeviceToken(userId: string, deviceToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deviceToken },
    });
  }

  private getJwtTtlSeconds(): number {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '15m';
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
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
