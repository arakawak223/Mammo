import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getByPrefecture(prefecture: string, yearMonth?: string) {
    const where: any = { prefecture };
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({
      where,
      orderBy: { yearMonth: 'desc' },
    });
    return stats.map((s) => ({ ...s, amount: Number(s.amount) }));
  }

  async getNational(yearMonth?: string) {
    const where: any = {};
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({
      where,
      orderBy: { yearMonth: 'desc' },
    });

    // Aggregate by yearMonth + scamType
    const agg: Record<string, { yearMonth: string; scamType: string; amount: number; count: number }> = {};
    for (const s of stats) {
      const key = `${s.yearMonth}:${s.scamType}`;
      if (!agg[key]) {
        agg[key] = { yearMonth: s.yearMonth, scamType: s.scamType, amount: 0, count: 0 };
      }
      agg[key].amount += Number(s.amount);
      agg[key].count += s.count;
    }

    return Object.values(agg).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }

  async getTopPrefectures(limit = 10, yearMonth?: string) {
    const where: any = {};
    if (yearMonth) where.yearMonth = yearMonth;

    const stats = await this.prisma.scamStatistic.findMany({ where });

    // Aggregate by prefecture
    const prefMap: Record<string, { prefecture: string; totalAmount: number; totalCount: number }> = {};
    for (const s of stats) {
      if (!prefMap[s.prefecture]) {
        prefMap[s.prefecture] = { prefecture: s.prefecture, totalAmount: 0, totalCount: 0 };
      }
      prefMap[s.prefecture].totalAmount += Number(s.amount);
      prefMap[s.prefecture].totalCount += s.count;
    }

    return Object.values(prefMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  async upsert(data: {
    prefecture: string;
    yearMonth: string;
    scamType: string;
    amount: number;
    count: number;
  }) {
    return this.prisma.scamStatistic.upsert({
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
  }
}
