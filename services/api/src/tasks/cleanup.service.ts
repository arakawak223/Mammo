import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 期限切れリフレッシュトークンを毎時削除 */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredRefreshTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired refresh tokens`);
    }
  }

  /** 使用済み or 期限切れ招待コードを毎日削除 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredInviteCodes() {
    const result = await this.prisma.inviteCode.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired/used invite codes`);
    }
  }

  /** 90日以上前の解決済みイベントを毎週削除 */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanOldResolvedEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.event.deleteMany({
      where: {
        status: 'resolved',
        createdAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old resolved events`);
    }
  }

  /** 終了済みSOSセッション（90日以上前）を毎週削除 */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanOldSosSessions() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.sosSession.deleteMany({
      where: {
        status: 'resolved',
        endedAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old SOS sessions`);
    }
  }
}
