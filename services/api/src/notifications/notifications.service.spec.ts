import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let configGet: jest.Mock;

  beforeEach(async () => {
    prisma = createMockPrisma();
    configGet = jest.fn().mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('onModuleInit', () => {
    it('should warn when FIREBASE_SERVICE_ACCOUNT is not set', () => {
      const logSpy = jest.spyOn((service as any).logger, 'warn');
      service.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('FIREBASE_SERVICE_ACCOUNT not set'),
      );
    });

    it('should handle invalid JSON in FIREBASE_SERVICE_ACCOUNT', () => {
      configGet.mockReturnValue('invalid-json');
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      service.onModuleInit();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize Firebase'),
        expect.anything(),
      );
    });
  });

  describe('sendToDevices (dev mode)', () => {
    it('should log push messages in dev mode without sending', async () => {
      const debugSpy = jest.spyOn((service as any).logger, 'debug');

      await service.sendToDevices(['token1', 'token2'], {
        title: 'テスト通知',
        body: 'テストメッセージ',
        data: { eventId: 'evt-1' },
      });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV] Push: テスト通知'),
      );
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 devices'),
      );
    });

    it('should handle empty token array', async () => {
      const debugSpy = jest.spyOn((service as any).logger, 'debug');

      await service.sendToDevices([], {
        title: 'テスト',
        body: 'テスト',
      });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 devices'),
      );
    });

    it('should log priority in push messages', async () => {
      const debugSpy = jest.spyOn((service as any).logger, 'debug');

      await service.sendToDevices(['token1'], {
        title: '緊急SOS',
        body: '緊急通報がありました',
        priority: 'critical',
      });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV] Push: 緊急SOS'),
      );
    });
  });

  describe('config methods', () => {
    it('should return emergency channel for critical priority', () => {
      const config = (service as any).getAndroidConfig('critical');
      expect(config.notification.channelId).toBe('emergency');
      expect(config.notification.sound).toBe('alarm.mp3');
    });

    it('should return alerts channel for normal priority', () => {
      const config = (service as any).getAndroidConfig('normal');
      expect(config.notification.channelId).toBe('alerts');
      expect(config.notification.sound).toBe('default');
    });

    it('should return critical APNS config for critical priority', () => {
      const config = (service as any).getApnsConfig('critical');
      expect(config.payload.aps['interruption-level']).toBe('critical');
    });

    it('should return active APNS config for normal priority', () => {
      const config = (service as any).getApnsConfig('normal');
      expect(config.payload.aps['interruption-level']).toBe('active');
      expect(config.payload.aps.sound).toBe('default');
    });
  });
});
