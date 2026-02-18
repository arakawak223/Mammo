import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      refreshToken: { deleteMany: jest.fn() },
      inviteCode: { deleteMany: jest.fn() },
      event: { deleteMany: jest.fn() },
      sosSession: { deleteMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  it('should delete expired refresh tokens', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });
    await service.cleanExpiredRefreshTokens();
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
  });

  it('should delete expired/used invite codes', async () => {
    prisma.inviteCode.deleteMany.mockResolvedValue({ count: 3 });
    await service.cleanExpiredInviteCodes();
    expect(prisma.inviteCode.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { usedAt: { not: null } },
        ],
      },
    });
  });

  it('should delete old resolved events', async () => {
    prisma.event.deleteMany.mockResolvedValue({ count: 10 });
    await service.cleanOldResolvedEvents();
    expect(prisma.event.deleteMany).toHaveBeenCalledWith({
      where: {
        status: 'resolved',
        createdAt: { lt: expect.any(Date) },
      },
    });
  });

  it('should delete old SOS sessions', async () => {
    prisma.sosSession.deleteMany.mockResolvedValue({ count: 2 });
    await service.cleanOldSosSessions();
    expect(prisma.sosSession.deleteMany).toHaveBeenCalledWith({
      where: {
        status: 'resolved',
        endedAt: { lt: expect.any(Date) },
      },
    });
  });

  it('should not log when no records deleted', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    await service.cleanExpiredRefreshTokens();
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });
});
