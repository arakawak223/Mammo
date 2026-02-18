import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SosService } from './sos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SosGateway } from './sos.gateway';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('SosService', () => {
  let service: SosService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notifications: { sendToDevices: jest.Mock };
  let sosGateway: {
    emitLocationUpdate: jest.Mock;
    emitModeChange: jest.Mock;
    emitResolved: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    notifications = { sendToDevices: jest.fn() };
    sosGateway = {
      emitLocationUpdate: jest.fn(),
      emitModeChange: jest.fn(),
      emitResolved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SosService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: SosGateway, useValue: sosGateway },
      ],
    }).compile();

    service = module.get<SosService>(SosService);
  });

  describe('start', () => {
    const dto = { latitude: 35.6812, longitude: 139.7671, mode: 'alarm' as const };

    it('should create SOS session and emergency event', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue(null);
      prisma.sosSession.create.mockResolvedValue({
        id: 'sos-1',
        elderlyId: 'elderly-1',
        mode: 'alarm',
        status: 'active',
      });
      prisma.event.create.mockResolvedValue({ id: 'event-1' });
      prisma.pairing.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ name: 'おばあちゃん' });

      const result = await service.start('elderly-1', dto);

      expect(result.id).toBe('sos-1');
      expect(prisma.sosSession.create).toHaveBeenCalled();
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'emergency_sos',
            severity: 'critical',
          }),
        }),
      );
    });

    it('should use default mode from settings when not specified', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue({ defaultMode: 'silent' });
      prisma.sosSession.create.mockResolvedValue({
        id: 'sos-1',
        mode: 'silent',
      });
      prisma.event.create.mockResolvedValue({ id: 'event-1' });
      prisma.pairing.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ name: 'おばあちゃん' });

      await service.start('elderly-1', { latitude: 35.0, longitude: 139.0 });

      expect(prisma.sosSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mode: 'silent' }),
        }),
      );
    });

    it('should send push notifications to family members', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue(null);
      prisma.sosSession.create.mockResolvedValue({ id: 'sos-1' });
      prisma.event.create.mockResolvedValue({ id: 'event-1' });
      prisma.pairing.findMany.mockResolvedValue([
        { family: { deviceToken: 'token-1' } },
        { family: { deviceToken: 'token-2' } },
      ]);
      prisma.user.findUnique.mockResolvedValue({ name: 'テスト太郎' });

      await service.start('elderly-1', dto);

      expect(notifications.sendToDevices).toHaveBeenCalledWith(
        ['token-1', 'token-2'],
        expect.objectContaining({
          title: '緊急SOS！',
          priority: 'critical',
        }),
      );
    });

    it('should not fail when no family members have tokens', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue(null);
      prisma.sosSession.create.mockResolvedValue({ id: 'sos-1' });
      prisma.event.create.mockResolvedValue({ id: 'event-1' });
      prisma.pairing.findMany.mockResolvedValue([
        { family: { deviceToken: null } },
      ]);
      prisma.user.findUnique.mockResolvedValue({ name: 'テスト' });

      await service.start('elderly-1', dto);
      expect(notifications.sendToDevices).not.toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    it('should append location and emit via WebSocket', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        status: 'active',
        locations: [{ lat: 35.0, lng: 139.0, ts: '2026-01-01T00:00:00Z' }],
      });
      prisma.sosSession.update.mockResolvedValue({ id: 'sos-1' });

      const result = await service.updateLocation('sos-1', {
        latitude: 35.001,
        longitude: 139.001,
        accuracy: 10,
        battery: 80,
      });

      expect(prisma.sosSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            locations: expect.arrayContaining([
              expect.objectContaining({ lat: 35.001, lng: 139.001 }),
            ]),
          }),
        }),
      );
      expect(sosGateway.emitLocationUpdate).toHaveBeenCalledWith(
        'sos-1',
        expect.objectContaining({ lat: 35.001, lng: 139.001 }),
      );
    });

    it('should throw NotFoundException for inactive session', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        status: 'resolved',
      });

      await expect(
        service.updateLocation('sos-1', { latitude: 35.0, longitude: 139.0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prisma.sosSession.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLocation('no-session', { latitude: 35.0, longitude: 139.0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeMode', () => {
    it('should change mode and emit via WebSocket', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        elderlyId: 'elderly-1',
        status: 'active',
      });
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.sosSession.update.mockResolvedValue({ id: 'sos-1', mode: 'silent' });

      const result = await service.changeMode('sos-1', 'silent', 'family-1');

      expect(prisma.sosSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { mode: 'silent' },
        }),
      );
      expect(sosGateway.emitModeChange).toHaveBeenCalledWith('sos-1', 'silent');
    });

    it('should throw ForbiddenException for non-family user', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        elderlyId: 'elderly-1',
        status: 'active',
      });
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(
        service.changeMode('sos-1', 'alarm', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for inactive session', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        status: 'resolved',
      });

      await expect(
        service.changeMode('sos-1', 'alarm', 'family-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('should resolve session and emit via WebSocket', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        elderlyId: 'elderly-1',
      });
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.sosSession.update.mockResolvedValue({
        id: 'sos-1',
        status: 'resolved',
      });

      const result = await service.resolve('sos-1', 'family-1');

      expect(result.status).toBe('resolved');
      expect(sosGateway.emitResolved).toHaveBeenCalledWith('sos-1');
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prisma.sosSession.findUnique.mockResolvedValue(null);

      await expect(service.resolve('no-session', 'family-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prisma.sosSession.findUnique.mockResolvedValue({
        id: 'sos-1',
        elderlyId: 'elderly-1',
      });
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(service.resolve('sos-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSettings', () => {
    it('should return settings for elderly', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue({
        elderlyId: 'elderly-1',
        defaultMode: 'alarm',
      });

      const result = await service.getSettings('elderly-1');
      expect(result?.defaultMode).toBe('alarm');
    });

    it('should return null if no settings exist', async () => {
      prisma.sosSetting.findUnique.mockResolvedValue(null);

      const result = await service.getSettings('elderly-1');
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should upsert settings when family member is authorized', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ id: 'pair-1' });
      prisma.sosSetting.upsert.mockResolvedValue({
        elderlyId: 'elderly-1',
        defaultMode: 'silent',
      });

      const result = await service.updateSettings('elderly-1', 'silent', 'family-1');
      expect(result.defaultMode).toBe('silent');
    });

    it('should throw ForbiddenException for non-family user', async () => {
      prisma.pairing.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSettings('elderly-1', 'alarm', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
