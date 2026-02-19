import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { PREFECTURES } from './dto/import-statistics.dto';

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class StatisticsService {
  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

  async getByPrefecture(prefecture: string, yearMonth?: string) {
    const cacheKey = `stats:pref:${prefecture}:${yearMonth || 'all'}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { prefecture };
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({
      where,
      orderBy: { yearMonth: 'desc' },
    });
    const result = stats.map((s) => ({ ...s, amount: Number(s.amount) }));

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getNational(yearMonth?: string) {
    const cacheKey = `stats:national:${yearMonth || 'all'}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({
      where,
      orderBy: { yearMonth: 'desc' },
    });

    const agg: Record<string, { yearMonth: string; scamType: string; amount: number; count: number }> = {};
    for (const s of stats) {
      const key = `${s.yearMonth}:${s.scamType}`;
      if (!agg[key]) {
        agg[key] = { yearMonth: s.yearMonth, scamType: s.scamType, amount: 0, count: 0 };
      }
      agg[key].amount += Number(s.amount);
      agg[key].count += s.count;
    }

    const result = Object.values(agg).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getTopPrefectures(limit = 10, yearMonth?: string) {
    const cacheKey = `stats:top:${limit}:${yearMonth || 'all'}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({ where });

    const prefMap: Record<string, { prefecture: string; totalAmount: number; totalCount: number }> = {};
    for (const s of stats) {
      if (!prefMap[s.prefecture]) {
        prefMap[s.prefecture] = { prefecture: s.prefecture, totalAmount: 0, totalCount: 0 };
      }
      prefMap[s.prefecture].totalAmount += Number(s.amount);
      prefMap[s.prefecture].totalCount += s.count;
    }

    const result = Object.values(prefMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getTrend(prefecture?: string, months = 6) {
    const cacheKey = `stats:trend:${prefecture || 'national'}:${months}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    // 直近N月分の yearMonth リスト生成
    const now = new Date();
    const yearMonths: string[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      yearMonths.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      );
    }

    const where: any = { yearMonth: { in: yearMonths } };
    if (prefecture) where.prefecture = prefecture;

    const stats = await this.prisma.scamStatistic.findMany({
      where,
      orderBy: { yearMonth: 'asc' },
    });

    // 月別集計
    const monthlyMap: Record<
      string,
      { yearMonth: string; totalAmount: number; totalCount: number }
    > = {};
    const byScamTypeMap: Record<
      string,
      Record<string, { yearMonth: string; scamType: string; amount: number; count: number }>
    > = {};

    for (const s of stats) {
      if (!monthlyMap[s.yearMonth]) {
        monthlyMap[s.yearMonth] = {
          yearMonth: s.yearMonth,
          totalAmount: 0,
          totalCount: 0,
        };
      }
      monthlyMap[s.yearMonth].totalAmount += Number(s.amount);
      monthlyMap[s.yearMonth].totalCount += s.count;

      if (!byScamTypeMap[s.scamType]) byScamTypeMap[s.scamType] = {};
      if (!byScamTypeMap[s.scamType][s.yearMonth]) {
        byScamTypeMap[s.scamType][s.yearMonth] = {
          yearMonth: s.yearMonth,
          scamType: s.scamType,
          amount: 0,
          count: 0,
        };
      }
      byScamTypeMap[s.scamType][s.yearMonth].amount += Number(s.amount);
      byScamTypeMap[s.scamType][s.yearMonth].count += s.count;
    }

    // 前月比の算出
    const sortedMonths = Object.values(monthlyMap).sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth),
    );
    const monthsResult = sortedMonths.map((m, i) => {
      const prev = i > 0 ? sortedMonths[i - 1] : null;
      const changeRate =
        prev && prev.totalAmount > 0
          ? Math.round(
              ((m.totalAmount - prev.totalAmount) / prev.totalAmount) * 1000,
            ) / 10
          : null;
      return { ...m, changeRate };
    });

    // 詐欺種別の月次推移
    const byScamType = Object.entries(byScamTypeMap).map(
      ([scamType, monthData]) => ({
        scamType,
        months: Object.values(monthData).sort((a, b) =>
          a.yearMonth.localeCompare(b.yearMonth),
        ),
      }),
    );

    const result = { months: monthsResult, byScamType };
    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getAdvice(prefecture: string) {
    const cacheKey = `stats:advice:${prefecture}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    // 直近データ取得
    const stats = await this.prisma.scamStatistic.findMany({
      where: { prefecture },
      orderBy: { yearMonth: 'desc' },
      take: 20,
    });

    if (stats.length === 0) {
      return {
        prefecture,
        advice: `${prefecture}の統計データがありません。`,
        topScamTypes: [],
      };
    }

    // 最新 yearMonth のデータで手口別集計
    const latestMonth = stats[0].yearMonth;
    const latestStats = stats.filter((s) => s.yearMonth === latestMonth);
    const sorted = latestStats
      .map((s) => ({ scamType: s.scamType, amount: Number(s.amount), count: s.count }))
      .sort((a, b) => b.amount - a.amount);

    const topScamTypes = sorted.slice(0, 3);

    const scamTypeAdvice: Record<string, string> = {
      ore_ore:
        '身内を装った電話に注意してください。「携帯番号が変わった」は詐欺の典型パターンです。',
      refund_fraud:
        '役所を名乗る還付金の電話にご注意ください。ATM操作で還付金は受け取れません。',
      billing_fraud:
        '身に覚えのない請求書やメールに返信しないでください。公的機関に確認しましょう。',
      investment_fraud:
        '「必ず儲かる」投資話は詐欺です。SNSやマッチングアプリ経由の勧誘に注意してください。',
      cash_card_fraud:
        'キャッシュカードを他人に渡さないでください。「封印」や「預かり」は全て詐欺です。',
      romance_fraud:
        'ネット上で知り合った人から金銭を要求された場合は詐欺を疑いましょう。',
    };

    const adviceTexts = topScamTypes
      .map(
        (s) =>
          scamTypeAdvice[s.scamType] ||
          `「${s.scamType}」型の詐欺に注意してください。`,
      )
      .join('\n');

    const result = {
      prefecture,
      yearMonth: latestMonth,
      advice: `${prefecture}では以下の詐欺手口が多発しています。\n${adviceTexts}`,
      topScamTypes,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async upsert(data: {
    prefecture: string;
    yearMonth: string;
    scamType: string;
    amount: number;
    count: number;
  }) {
    const result = await this.prisma.scamStatistic.upsert({
      where: {
        prefecture_yearMonth_scamType: {
          prefecture: data.prefecture,
          yearMonth: data.yearMonth,
          scamType: data.scamType,
        },
      },
      create: {
        prefecture: data.prefecture,
        yearMonth: data.yearMonth,
        scamType: data.scamType,
        amount: data.amount,
        count: data.count,
      },
      update: {
        amount: data.amount,
        count: data.count,
      },
    });

    // Invalidate cache
    await this.cache.delByPattern('stats:*');
    return result;
  }

  async bulkImport(
    records: {
      prefecture: string;
      yearMonth: string;
      scamType: string;
      amount: number;
      count: number;
    }[],
  ) {
    // バリデーション
    const invalid = records.filter((r) => !PREFECTURES.includes(r.prefecture));
    if (invalid.length > 0) {
      const names = [...new Set(invalid.map((r) => r.prefecture))];
      throw new BadRequestException(
        `無効な都道府県名: ${names.join(', ')}`,
      );
    }

    let upserted = 0;
    for (const record of records) {
      await this.prisma.scamStatistic.upsert({
        where: {
          prefecture_yearMonth_scamType: {
            prefecture: record.prefecture,
            yearMonth: record.yearMonth,
            scamType: record.scamType,
          },
        },
        create: {
          prefecture: record.prefecture,
          yearMonth: record.yearMonth,
          scamType: record.scamType,
          amount: record.amount,
          count: record.count,
        },
        update: {
          amount: record.amount,
          count: record.count,
        },
      });
      upserted++;
    }

    await this.cache.delByPattern('stats:*');
    return { imported: upserted, total: records.length };
  }
}
