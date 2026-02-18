import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'テスト' });

      const result = await service.findById('user-1');

      expect(result).toEqual({ id: 'user-1', name: 'テスト' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return user by phone', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '09012345678' });

      const result = await service.findByPhone('09012345678');

      expect(result).toEqual({ id: 'user-1', phone: '09012345678' });
    });
  });

  describe('getFamilyMembers', () => {
    it('should return family members with pairing roles', async () => {
      prisma.pairing.findMany.mockResolvedValue([
        {
          family: { id: 'f1', name: 'Family1', phone: '090', deviceToken: null },
          role: 'owner',
        },
        {
          family: { id: 'f2', name: 'Family2', phone: '080', deviceToken: 'tok' },
          role: 'member',
        },
      ]);

      const result = await service.getFamilyMembers('elderly-1');

      expect(result).toHaveLength(2);
      expect(result[0].pairingRole).toBe('owner');
      expect(result[1].pairingRole).toBe('member');
    });

    it('should return empty array when no family members', async () => {
      prisma.pairing.findMany.mockResolvedValue([]);

      const result = await service.getFamilyMembers('elderly-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      prisma.user.update.mockResolvedValue({ id: 'user-1', name: '新名前', prefecture: '大阪府' });

      const result = await service.updateProfile('user-1', { name: '新名前', prefecture: '大阪府' });

      expect(result.name).toBe('新名前');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: '新名前', prefecture: '大阪府' },
      });
    });
  });
});
