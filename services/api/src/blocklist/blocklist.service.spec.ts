import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BlocklistService } from './blocklist.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('BlocklistService', () => {
  let service: BlocklistService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocklistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BlocklistService>(BlocklistService);
  });

  describe('getList', () => {
    it('should return blocked numbers for authorized family member', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.blockedNumber.findMany.mockResolvedValue([
        { id: 'bn-1', phoneNumber: '+44123456789', reason: '自動ブロック' },
        { id: 'bn-2', phoneNumber: '05012345678', reason: '手動ブロック' },
      ]);

      const result = await service.getList('elderly-1', 'family-1');

      expect(result).toHaveLength(2);
      expect(prisma.blockedNumber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { elderlyId: 'elderly-1' },
        }),
      );
    });

    it('should throw ForbiddenException for non-family user', async () => {
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(service.getList('elderly-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addNumber', () => {
    it('should upsert a blocked number', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.blockedNumber.upsert.mockResolvedValue({
        id: 'bn-1',
        phoneNumber: '+44123456789',
        reason: '詐欺の疑い',
      });

      const result = await service.addNumber('elderly-1', 'family-1', {
        phoneNumber: '+44123456789',
        reason: '詐欺の疑い',
      });

      expect(result.phoneNumber).toBe('+44123456789');
      expect(prisma.blockedNumber.upsert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(
        service.addNumber('elderly-1', 'stranger', {
          phoneNumber: '+44123456789',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeNumber', () => {
    it('should delete a blocked number', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.blockedNumber.findUnique.mockResolvedValue({
        id: 'bn-1',
        elderlyId: 'elderly-1',
        phoneNumber: '+44123456789',
      });
      prisma.blockedNumber.delete.mockResolvedValue({});

      const result = await service.removeNumber('elderly-1', 'bn-1', 'family-1');

      expect(result.message).toBe('ブロック解除しました');
      expect(prisma.blockedNumber.delete).toHaveBeenCalledWith({
        where: { id: 'bn-1' },
      });
    });

    it('should throw NotFoundException when number not found', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.blockedNumber.findUnique.mockResolvedValue(null);

      await expect(
        service.removeNumber('elderly-1', 'no-number', 'family-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when number belongs to different elderly', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.blockedNumber.findUnique.mockResolvedValue({
        id: 'bn-1',
        elderlyId: 'elderly-2',
      });

      await expect(
        service.removeNumber('elderly-1', 'bn-1', 'family-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markSynced', () => {
    it('should update synced flag for given number IDs', async () => {
      prisma.blockedNumber.updateMany.mockResolvedValue({ count: 2 });

      await service.markSynced('elderly-1', ['bn-1', 'bn-2']);

      expect(prisma.blockedNumber.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['bn-1', 'bn-2'] }, elderlyId: 'elderly-1' },
        data: { synced: true },
      });
    });
  });
});
