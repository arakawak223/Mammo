import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: {
    getByPrefecture: jest.Mock;
    getNational: jest.Mock;
    getTopPrefectures: jest.Mock;
    getTrend: jest.Mock;
    getAdvice: jest.Mock;
    bulkImport: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getByPrefecture: jest.fn(),
      getNational: jest.fn(),
      getTopPrefectures: jest.fn(),
      getTrend: jest.fn(),
      getAdvice: jest.fn(),
      bulkImport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: service }],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
  });

  describe('getStatistics', () => {
    it('should return prefecture statistics when prefecture specified', async () => {
      const expected = [{ scamType: 'ore_ore', count: 100 }];
      service.getByPrefecture.mockResolvedValue(expected);

      const result = await controller.getStatistics({ prefecture: '東京都', yearMonth: '2025-12' } as any);

      expect(service.getByPrefecture).toHaveBeenCalledWith('東京都', '2025-12');
      expect(result).toEqual(expected);
    });

    it('should return national statistics when no prefecture', async () => {
      const expected = [{ scamType: 'ore_ore', count: 5000 }];
      service.getNational.mockResolvedValue(expected);

      const result = await controller.getStatistics({ yearMonth: '2025-12' } as any);

      expect(service.getNational).toHaveBeenCalledWith('2025-12');
      expect(result).toEqual(expected);
    });
  });

  describe('getNational', () => {
    it('should return national stats', async () => {
      service.getNational.mockResolvedValue({ total: 10000 });

      const result = await controller.getNational('2025-12');

      expect(service.getNational).toHaveBeenCalledWith('2025-12');
      expect(result).toEqual({ total: 10000 });
    });
  });

  describe('getTopPrefectures', () => {
    it('should return top prefectures with default limit', async () => {
      const expected = [{ prefecture: '東京都', count: 1000 }];
      service.getTopPrefectures.mockResolvedValue(expected);

      const result = await controller.getTopPrefectures(undefined, '2025-12');

      expect(service.getTopPrefectures).toHaveBeenCalledWith(10, '2025-12');
      expect(result).toEqual(expected);
    });

    it('should respect custom limit', async () => {
      service.getTopPrefectures.mockResolvedValue([]);

      await controller.getTopPrefectures('5', '2025-12');

      expect(service.getTopPrefectures).toHaveBeenCalledWith(5, '2025-12');
    });
  });

  describe('getTrend', () => {
    it('should return trend data', async () => {
      const expected = { months: [], byScamType: [] };
      service.getTrend.mockResolvedValue(expected);

      const result = await controller.getTrend({ prefecture: '大阪府', months: 6 } as any);

      expect(service.getTrend).toHaveBeenCalledWith('大阪府', 6);
      expect(result).toEqual(expected);
    });
  });

  describe('getAdvice', () => {
    it('should return advice for prefecture', async () => {
      const expected = { prefecture: '愛知県', advices: [] };
      service.getAdvice.mockResolvedValue(expected);

      const result = await controller.getAdvice('愛知県');

      expect(service.getAdvice).toHaveBeenCalledWith('愛知県');
      expect(result).toEqual(expected);
    });
  });

  describe('importStatistics', () => {
    it('should bulk import records', async () => {
      const dto = { records: [{ prefecture: '東京都', scamType: 'ore_ore', count: 10, amount: 100000, yearMonth: '2025-12' }] };
      service.bulkImport.mockResolvedValue({ imported: 1 });

      const result = await controller.importStatistics(dto as any);

      expect(service.bulkImport).toHaveBeenCalledWith(dto.records);
      expect(result).toEqual({ imported: 1 });
    });
  });

  describe('triggerDigest', () => {
    it('should return triggered status', async () => {
      const result = await controller.triggerDigest();

      expect(result).toEqual({ triggered: true, message: 'ダイジェスト通知をトリガーしました' });
    });
  });
});
