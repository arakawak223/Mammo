import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StatisticsService } from '../statistics/statistics.service';

@Injectable()
export class DigestService {
  private logger = new Logger('DigestService');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private statistics: StatisticsService,
  ) {}

  @Cron('0 9 * * MON')
  async sendWeeklyDigest() {
    this.logger.log('週次ダイジェスト通知を開始...');

    try {
      // 家族ユーザーのペアリング情報を取得
      const familyUsers = await this.prisma.user.findMany({
        where: {
          role: { in: ['family_owner', 'family_member'] },
          deviceToken: { not: null },
        },
        include: {
          familyPairings: {
            include: {
              elderly: true,
            },
          },
        },
      });

      let sent = 0;
      for (const family of familyUsers) {
        // ペアリング先の高齢者の都道府県を収集
        const prefectures = new Set<string>();
        for (const pairing of family.familyPairings) {
          if (pairing.elderly.prefecture) {
            prefectures.add(pairing.elderly.prefecture);
          }
        }

        if (prefectures.size === 0 || !family.deviceToken) continue;

        // 各都道府県のアドバイスを取得
        const adviceTexts: string[] = [];
        for (const pref of prefectures) {
          const advice = await this.statistics.getAdvice(pref);
          if (advice.topScamTypes.length > 0) {
            const topType = advice.topScamTypes[0];
            adviceTexts.push(
              `${pref}: ${topType.scamType}が最多(${topType.count}件)`,
            );
          }
        }

        if (adviceTexts.length === 0) continue;

        await this.notifications.sendToDevices([family.deviceToken], {
          title: '週次詐欺レポート',
          body: adviceTexts.join('、'),
          data: { type: 'weekly_digest' },
          priority: 'normal',
        });
        sent++;
      }

      this.logger.log(`週次ダイジェスト送信完了: ${sent}件`);
      return { sent };
    } catch (error) {
      this.logger.error('週次ダイジェスト送信に失敗', error);
      return { sent: 0, error: String(error) };
    }
  }
}
