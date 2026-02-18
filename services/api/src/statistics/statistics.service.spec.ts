import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  describe('getByPrefecture', () => {
    it('should return statistics for a specific prefecture', async () => {
      const mockStats = [
        { id: '1', prefecture: '東京都', yearMonth: '2026-01', scamType: 'ore_ore', amount: BigInt(5000000), count: 10 },
        { id: '2', prefecture: '東京都', yearMonth: '2026-01', scamType: 'refund_fraud', amount: BigInt(3000000), count: 5 },
      ];
      prisma.scamStatistic.findMany.mockResolvedValue(mockStats);

      const result = await service.getByPrefecture('東京都');

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5000000);
      expect(prisma.scamStatistic.findMany).toHaveBeenCalledWith({
        where: { prefecture: '東京都' },
        orderBy: { yearMonth: 'desc' },
      });
    });

    it('should filter by yearMonth when provided', async () => {
      prisma.scamStatistic.findMany.mockResolvedValue([]);

      await service.getByPrefecture('大阪府', '2026-01');

      expect(prisma.scamStatistic.findMany).toHaveBeenCalledWith({
        where: { prefecture: '大阪府', yearMonth: '2026-01' },
        orderBy: { yearMonth: 'desc' },
      });
    });
  });

  describe('getTopPrefectures', () => {
    it('should aggregate and rank prefectures by total amount', async () => {
      const mockStats = [
        { prefecture: '東京都', scamType: 'ore_ore', amount: BigInt(5000000), count: 10 },
        { prefecture: '東京都', scamType: 'refund_fraud', amount: BigInt(2000000), count: 3 },
        { prefecture: '大阪府', scamType: 'ore_ore', amount: BigInt(3000000), count: 8 },
      ];
      prisma.scamStatistic.findMany.mockResolvedValue(mockStats);

      const result = await service.getTopPrefectures(10);

      expect(result).toHaveLength(2);
      expect(result[0].prefecture).toBe('東京都');
      expect(result[0].totalAmount).toBe(7000000);
      expect(result[1].prefecture).toBe('大阪府');
    });

    it('should limit results', async () => {
      const mockStats = [
        { prefecture: '東京都', scamType: 'ore_ore', amount: BigInt(5000000), count: 10 },
        { prefecture: '大阪府', scamType: 'ore_ore', amount: BigInt(3000000), count: 8 },
        { prefecture: '愛知県', scamType: 'ore_ore', amount: BigInt(1000000), count: 2 },
      ];
      prisma.scamStatistic.findMany.mockResolvedValue(mockStats);

      const result = await service.getTopPrefectures(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('upsert', () => {
    it('should upsert a statistic record', async () => {
      const data = {
        prefecture: '東京都',
        yearMonth: '2026-02',
        scamType: 'ore_ore',
        amount: 1000000,
        count: 5,
      };
      prisma.scamStatistic.upsert.mockResolvedValue({ id: '1', ...data });

      const result = await service.upsert(data);

      expect(prisma.scamStatistic.upsert).toHaveBeenCalledWith({
        where: {
          prefecture_yearMonth_scamType: {
            prefecture: '東京都',
            yearMonth: '2026-02',
            scamType: 'ore_ore',
          },
        },
        create: data,
        update: { amount: 1000000, count: 5 },
      });
      expect(result.prefecture).toBe('東京都');
    });
  });

  describe('getNational', () => {
    it('should aggregate national statistics by yearMonth and scamType', async () => {
      const mockStats = [
        { prefecture: '東京都', yearMonth: '2026-01', scamType: 'ore_ore', amount: BigInt(5000000), count: 10 },
        { prefecture: '大阪府', yearMonth: '2026-01', scamType: 'ore_ore', amount: BigInt(3000000), count: 8 },
      ];
      prisma.scamStatistic.findMany.mockResolvedValue(mockStats);

      const result = await service.getNational();

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(8000000);
      expect(result[0].count).toBe(18);
    });
  });
});
