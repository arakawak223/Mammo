import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';

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
}
