import { Test, TestingModule } from '@nestjs/testing';
import { BlocklistController } from './blocklist.controller';
import { BlocklistService } from './blocklist.service';

describe('BlocklistController', () => {
  let controller: BlocklistController;
  let service: {
    getList: jest.Mock;
    addNumber: jest.Mock;
    removeNumber: jest.Mock;
    markSynced: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getList: jest.fn(),
      addNumber: jest.fn(),
      removeNumber: jest.fn(),
      markSynced: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlocklistController],
      providers: [{ provide: BlocklistService, useValue: service }],
    }).compile();

    controller = module.get<BlocklistController>(BlocklistController);
  });

  describe('getList', () => {
    it('should return blocklist for elderly', async () => {
      const expected = [{ id: 'bn-1', phoneNumber: '03-0000-0000' }];
      service.getList.mockResolvedValue(expected);
      const req = { user: { id: 'family-1' } };

      const result = await controller.getList(req, 'elderly-1');

      expect(service.getList).toHaveBeenCalledWith('elderly-1', 'family-1');
      expect(result).toEqual(expected);
    });
  });

  describe('addNumber', () => {
    it('should add number to blocklist', async () => {
      const dto = { phoneNumber: '03-1111-2222', label: '不審番号' };
      const expected = { id: 'bn-2', ...dto };
      service.addNumber.mockResolvedValue(expected);
      const req = { user: { id: 'family-1' } };

      const result = await controller.addNumber(req, 'elderly-1', dto as any);

      expect(service.addNumber).toHaveBeenCalledWith('elderly-1', 'family-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('removeNumber', () => {
    it('should remove number from blocklist', async () => {
      service.removeNumber.mockResolvedValue({ message: 'deleted' });
      const req = { user: { id: 'family-1' } };

      const result = await controller.removeNumber(req, 'elderly-1', 'bn-1');

      expect(service.removeNumber).toHaveBeenCalledWith('elderly-1', 'bn-1', 'family-1');
      expect(result).toEqual({ message: 'deleted' });
    });
  });

  describe('syncBlocklist', () => {
    it('should mark numbers as synced', async () => {
      const dto = { numberIds: ['bn-1', 'bn-2'] };
      service.markSynced.mockResolvedValue({ count: 2 });

      const result = await controller.syncBlocklist('elderly-1', dto);

      expect(service.markSynced).toHaveBeenCalledWith('elderly-1', ['bn-1', 'bn-2']);
      expect(result).toEqual({ count: 2 });
    });
  });
});
