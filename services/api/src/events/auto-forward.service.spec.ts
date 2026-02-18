import { Test, TestingModule } from '@nestjs/testing';
import { AutoForwardService } from './auto-forward.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BlocklistService } from '../blocklist/blocklist.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

describe('AutoForwardService', () => {
  let service: AutoForwardService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let aiService: { analyzeCallMetadata: jest.Mock };
  let blocklistService: { addNumber: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    aiService = { analyzeCallMetadata: jest.fn().mockResolvedValue(undefined) };
    blocklistService = { addNumber: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoForwardService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
        { provide: BlocklistService, useValue: blocklistService },
      ],
    }).compile();

    service = module.get<AutoForwardService>(AutoForwardService);
  });

  describe('classifyNumber', () => {
    it('should classify international numbers as high risk', () => {
      expect(service.classifyNumber('+44123456789')).toBe('high');
      expect(service.classifyNumber('+1555123456')).toBe('high');
      expect(service.classifyNumber('+8621234567')).toBe('high');
    });

    it('should classify Japanese numbers as low risk', () => {
      expect(service.classifyNumber('+81901234567')).toBe('low');
    });

    it('should classify hidden/withheld numbers as high risk', () => {
      expect(service.classifyNumber('非通知')).toBe('high');
      expect(service.classifyNumber('unknown')).toBe('high');
      expect(service.classifyNumber('private')).toBe('high');
      expect(service.classifyNumber('')).toBe('high');
    });

    it('should classify IP phone (050) as medium risk', () => {
      expect(service.classifyNumber('05012345678')).toBe('medium');
    });

    it('should classify toll-free (0120) as medium risk', () => {
      expect(service.classifyNumber('0120123456')).toBe('medium');
    });

    it('should classify short numbers as medium risk', () => {
      expect(service.classifyNumber('110')).toBe('medium');
      expect(service.classifyNumber('1234567')).toBe('medium');
    });

    it('should classify regular domestic numbers as low risk', () => {
      expect(service.classifyNumber('09012345678')).toBe('low');
      expect(service.classifyNumber('0312345678')).toBe('low');
    });
  });

  describe('scanSmsKeywords', () => {
    it('should detect scam keywords in SMS content', () => {
      const result = service.scanSmsKeywords('口座が凍結されました。至急手続きしてください。');
      expect(result).toContain('口座');
      expect(result).toContain('至急');
    });

    it('should return empty array for safe content', () => {
      const result = service.scanSmsKeywords('お元気ですか？明日遊びに行きます。');
      expect(result).toHaveLength(0);
    });

    it('should detect delivery scam keywords', () => {
      const result = service.scanSmsKeywords('お届け物をお届けにあがりましたが不在でした');
      expect(result).toContain('お届け物');
    });

    it('should detect multiple keywords', () => {
      const result = service.scanSmsKeywords('未払いの支払い期限が本日中です。最終通告です。');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('processAutoForward', () => {
    const elderlyId = 'elderly-1';
    const eventId = 'event-1';

    it('should return critical severity for high-risk number with scam SMS', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ familyId: 'fam-1' });

      const result = await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '+44123456789',
        callType: 'sms',
        smsContent: '口座が凍結されました。至急ATMで手続きしてください。暗証番号を教えてください。',
      });

      expect(result.severity).toBe('critical');
      expect(result.numberRisk).toBe('high');
      expect(result.keywordsFound.length).toBeGreaterThanOrEqual(2);
      expect(result.shouldAutoBlock).toBe(true);
    });

    it('should return high severity for high-risk number with no SMS keywords', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ familyId: 'fam-1' });

      const result = await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '+44123456789',
        callType: 'call',
      });

      expect(result.severity).toBe('high');
      expect(result.numberRisk).toBe('high');
      expect(result.shouldAutoBlock).toBe(true);
    });

    it('should return medium severity for IP phone call', async () => {
      const result = await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '05012345678',
        callType: 'call',
      });

      expect(result.severity).toBe('medium');
      expect(result.numberRisk).toBe('medium');
      expect(result.shouldAutoBlock).toBe(false);
    });

    it('should return low severity for normal domestic call', async () => {
      const result = await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '09012345678',
        callType: 'call',
      });

      expect(result.severity).toBe('low');
      expect(result.numberRisk).toBe('low');
      expect(result.shouldAutoBlock).toBe(false);
    });

    it('should auto-block when 3+ keywords found even with low-risk number', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ familyId: 'fam-1' });

      const result = await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '09012345678',
        callType: 'sms',
        smsContent: '未払いの支払い期限が本日中です。最終通告です。口座に振込してください。',
      });

      expect(result.keywordsFound.length).toBeGreaterThanOrEqual(3);
      expect(result.shouldAutoBlock).toBe(true);
    });

    it('should trigger AI metadata analysis', async () => {
      await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '09012345678',
        callType: 'sms',
        smsContent: 'テスト',
      });

      expect(aiService.analyzeCallMetadata).toHaveBeenCalledWith(
        eventId,
        '09012345678',
        'sms',
        'テスト',
      );
    });

    it('should add to blocklist when auto-blocking', async () => {
      prisma.pairing.findFirst.mockResolvedValue({ familyId: 'fam-1' });

      await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '+44123456789',
        callType: 'call',
      });

      expect(blocklistService.addNumber).toHaveBeenCalledWith(
        elderlyId,
        'fam-1',
        expect.objectContaining({ phoneNumber: '+44123456789' }),
      );
    });

    it('should not block when no family pairing exists', async () => {
      prisma.pairing.findFirst.mockResolvedValue(null);

      await service.processAutoForward(elderlyId, eventId, {
        phoneNumber: '+44123456789',
        callType: 'call',
      });

      expect(blocklistService.addNumber).not.toHaveBeenCalled();
    });
  });
});
