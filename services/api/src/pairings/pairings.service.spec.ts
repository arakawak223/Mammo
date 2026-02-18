import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PairingsService } from './pairings.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('PairingsService', () => {
  let service: PairingsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PairingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PairingsService>(PairingsService);
  });

  describe('createInvite', () => {
    it('should create an invite code', async () => {
      prisma.inviteCode.create.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        expiresAt: new Date(),
      });

      const result = await service.createInvite('elderly-1', 'user-1');

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('expiresAt');
      expect(prisma.inviteCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            elderlyId: 'elderly-1',
            createdBy: 'user-1',
          }),
        }),
      );
    });
  });

  describe('joinByCode', () => {
    it('should join with valid invite code', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      prisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        usedAt: null,
        expiresAt: futureDate,
      });
      prisma.pairing.count.mockResolvedValue(0);
      prisma.pairing.findUnique.mockResolvedValue(null);
      (prisma as any).$transaction = jest.fn().mockResolvedValue([
        {
          id: 'pair-1',
          elderlyId: 'elderly-1',
          familyId: 'family-1',
          role: 'owner',
          elderly: { id: 'elderly-1', name: 'テスト太郎' },
        },
        {},
      ]);

      const result = await service.joinByCode({ code: 'ABC123' }, 'family-1');

      expect(result.role).toBe('owner');
    });

    it('should throw for expired invite', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.joinByCode({ code: 'ABC123' }, 'family-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for already used invite', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await expect(
        service.joinByCode({ code: 'ABC123' }, 'family-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when max family members reached', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      prisma.pairing.count.mockResolvedValue(5);

      await expect(
        service.joinByCode({ code: 'ABC123' }, 'family-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when already paired', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'ABC123',
        elderlyId: 'elderly-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      prisma.pairing.count.mockResolvedValue(1);
      prisma.pairing.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.joinByCode({ code: 'ABC123' }, 'family-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPairings', () => {
    it('should return pairings as elderly and family', async () => {
      prisma.pairing.findMany
        .mockResolvedValueOnce([{ id: 'p1', family: { id: 'f1', name: 'Family' } }])
        .mockResolvedValueOnce([{ id: 'p2', elderly: { id: 'e1', name: 'Elderly' } }]);

      const result = await service.getPairings('user-1');

      expect(result.asElderly).toHaveLength(1);
      expect(result.asFamily).toHaveLength(1);
    });
  });

  describe('removePairing', () => {
    it('should remove pairing when user is participant', async () => {
      prisma.pairing.findUnique.mockResolvedValue({
        id: 'pair-1',
        elderlyId: 'elderly-1',
        familyId: 'family-1',
      });
      prisma.pairing.delete.mockResolvedValue({});

      const result = await service.removePairing('pair-1', 'elderly-1');

      expect(result.message).toBe('ペアリングを解除しました');
    });

    it('should throw NotFoundException for non-existent pairing', async () => {
      prisma.pairing.findUnique.mockResolvedValue(null);

      await expect(
        service.removePairing('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      prisma.pairing.findUnique.mockResolvedValue({
        id: 'pair-1',
        elderlyId: 'elderly-1',
        familyId: 'family-1',
      });

      await expect(
        service.removePairing('pair-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
