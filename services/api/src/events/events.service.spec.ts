import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventsService } from './events.service';
import { AutoForwardService } from './auto-forward.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notifications: { sendToDevices: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    notifications = { sendToDevices: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AiService, useValue: { analyzeConversation: jest.fn(), analyzeCallMetadata: jest.fn(), quickCheck: jest.fn() } },
        { provide: AutoForwardService, useValue: { processAutoForward: jest.fn().mockResolvedValue({ severity: 'medium', numberRisk: 'low', keywordsFound: [], shouldAutoBlock: false }) } },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('create', () => {
    const dto = {
      type: 'scam_button' as const,
      severity: 'high' as const,
      payload: { triggeredAt: '2024-01-01T00:00:00Z' },
    };

    it('should create an event and notify family members', async () => {
      const mockEvent = { id: 'event-1', elderlyId: 'elderly-1', ...dto };
      prisma.event.create.mockResolvedValue(mockEvent);
      prisma.pairing.findMany.mockResolvedValue([
        { family: { id: 'fam-1', deviceToken: 'token-1', name: '太郎' } },
      ]);
      prisma.user.findUnique.mockResolvedValue({ name: 'おばあちゃん' });

      const result = await service.create('elderly-1', dto);

      expect(result.id).toBe('event-1');
      expect(prisma.event.create).toHaveBeenCalled();
      expect(notifications.sendToDevices).toHaveBeenCalledWith(
        ['token-1'],
        expect.objectContaining({ title: '「これ詐欺？」ボタンが押されました' }),
      );
    });

    it('should not fail if no family members have tokens', async () => {
      prisma.event.create.mockResolvedValue({ id: 'event-2' });
      prisma.pairing.findMany.mockResolvedValue([
        { family: { id: 'fam-1', deviceToken: null, name: '太郎' } },
      ]);
      prisma.user.findUnique.mockResolvedValue({ name: 'おばあちゃん' });

      await service.create('elderly-1', dto);
      expect(notifications.sendToDevices).not.toHaveBeenCalled();
    });
  });

  describe('findByElderly', () => {
    it('should return paginated events with AI analysis', async () => {
      prisma.event.findMany.mockResolvedValue([
        { id: 'e1', type: 'scam_button', aiAnalysis: null },
      ]);
      prisma.event.count.mockResolvedValue(1);

      const result = await service.findByElderly('elderly-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('resolve', () => {
    it('should resolve an event when family member is authorized', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        elderlyId: 'elderly-1',
      });
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.event.update.mockResolvedValue({ id: 'event-1', status: 'resolved' });

      const result = await service.resolve('event-1', 'family-1');
      expect(result.status).toBe('resolved');
    });

    it('should throw NotFoundException for non-existent event', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.resolve('no-event', 'family-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not a family member', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        elderlyId: 'elderly-1',
      });
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(service.resolve('event-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });
  });
});
