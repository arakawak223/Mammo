import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';
import { of, throwError } from 'rxjs';

describe('AiService', () => {
  let service: AiService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    httpService = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prisma },
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('checkDarkJob', () => {
    it('should return analysis result on success', async () => {
      httpService.post.mockReturnValue(
        of({
          data: {
            is_dark_job: true,
            risk_level: 'high',
            risk_score: 85,
            keywords_found: ['高額報酬'],
            explanation: '闇バイトの可能性があります',
            model_version: 'v1',
          },
        }),
      );

      const result = await service.checkDarkJob('高額報酬の仕事');

      expect(result.isDarkJob).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBe(85);
    });

    it('should return fallback on error', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.checkDarkJob('test');

      expect(result.isDarkJob).toBe(false);
      expect(result.riskLevel).toBe('low');
      expect(result.modelVersion).toBe('error');
    });
  });

  describe('voiceAnalyze', () => {
    it('should create event and return analysis result', async () => {
      prisma.event.create.mockResolvedValue({ id: 'evt-1' });
      prisma.aiAnalysis.create.mockResolvedValue({});
      httpService.post.mockReturnValue(
        of({
          data: {
            risk_score: 45,
            scam_type: 'unknown',
            summary: '問題なし',
            key_points: [],
            recommended_actions: [],
            model_version: 'v1',
          },
        }),
      );

      const result = await service.voiceAnalyze('user-1', 'テスト通話');

      expect(result.eventId).toBe('evt-1');
      expect(result.riskScore).toBe(45);
      expect(prisma.event.create).toHaveBeenCalled();
    });

    it('should update severity to critical when riskScore >= 90', async () => {
      prisma.event.create.mockResolvedValue({ id: 'evt-1' });
      prisma.event.update.mockResolvedValue({});
      prisma.aiAnalysis.create.mockResolvedValue({});
      httpService.post.mockReturnValue(
        of({
          data: {
            risk_score: 95,
            scam_type: 'ore_ore',
            summary: '非常に危険',
            key_points: ['送金要求'],
            recommended_actions: ['警察に通報'],
            model_version: 'v1',
          },
        }),
      );

      const result = await service.voiceAnalyze('user-1', '今すぐ振り込んで');

      expect(result.riskScore).toBe(95);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { severity: 'critical' },
      });
    });

    it('should return fallback when AI analysis fails', async () => {
      prisma.event.create.mockResolvedValue({ id: 'evt-1' });
      httpService.post.mockReturnValue(throwError(() => new Error('AI down')));

      const result = await service.voiceAnalyze('user-1', 'テスト');

      expect(result.eventId).toBe('evt-1');
      expect(result.riskScore).toBe(0);
      expect(result.summary).toBe('解析に失敗しました');
    });
  });

  describe('saveDarkJobCheck', () => {
    it('should save check result to database', async () => {
      prisma.darkJobCheck.create.mockResolvedValue({ id: 'djc-1' });

      await service.saveDarkJobCheck('user-1', 'テストテキスト', 'text', {
        riskLevel: 'high',
        riskScore: 80,
      });

      expect(prisma.darkJobCheck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          inputText: 'テストテキスト',
          inputType: 'text',
          riskLevel: 'high',
          riskScore: 80,
        }),
      });
    });

    it('should truncate long inputText to 2000 chars', async () => {
      prisma.darkJobCheck.create.mockResolvedValue({ id: 'djc-1' });
      const longText = 'あ'.repeat(3000);

      await service.saveDarkJobCheck('user-1', longText, 'text', {
        riskLevel: 'low',
        riskScore: 0,
      });

      const callArg = prisma.darkJobCheck.create.mock.calls[0][0];
      expect(callArg.data.inputText.length).toBe(2000);
    });

    it('should not throw on database error', async () => {
      prisma.darkJobCheck.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.saveDarkJobCheck('user-1', 'text', 'text', {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('getDarkJobHistory', () => {
    it('should return check history for a user', async () => {
      const mockRecords = [
        {
          id: 'djc-1',
          inputText: 'テスト',
          inputType: 'text',
          riskLevel: 'high',
          riskScore: 80,
          result: {},
          createdAt: new Date(),
        },
      ];
      prisma.darkJobCheck.findMany.mockResolvedValue(mockRecords);

      const result = await service.getDarkJobHistory('user-1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('djc-1');
      expect(prisma.darkJobCheck.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });

    it('should use default limit of 20', async () => {
      prisma.darkJobCheck.findMany.mockResolvedValue([]);

      await service.getDarkJobHistory('user-1');

      expect(prisma.darkJobCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  describe('checkDarkJobImage', () => {
    it('should return image analysis result on success', async () => {
      httpService.post.mockReturnValue(
        of({
          data: {
            is_dark_job: false,
            risk_level: 'low',
            risk_score: 0,
            keywords_found: [],
            explanation: 'テキストなし',
            model_version: 'v1',
            extracted_text: '',
          },
        }),
      );

      const result = await service.checkDarkJobImage('base64data', 'gallery');

      expect(result.isDarkJob).toBe(false);
      expect(result.extractedText).toBe('');
    });

    it('should return fallback on error', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.checkDarkJobImage('base64data');

      expect(result.isDarkJob).toBe(false);
      expect(result.modelVersion).toBe('error');
    });
  });

  describe('analyzeConversation', () => {
    it('should save AI analysis to database', async () => {
      httpService.post.mockReturnValue(
        of({
          data: {
            risk_score: 60,
            scam_type: 'refund',
            summary: '還付金詐欺の疑い',
            model_version: 'v1',
          },
        }),
      );
      prisma.aiAnalysis.create.mockResolvedValue({});

      await service.analyzeConversation('evt-1', '還付金があります');

      expect(prisma.aiAnalysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'evt-1',
          riskScore: 60,
          scamType: 'refund',
        }),
      });
    });

    it('should not throw on AI failure', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('fail')));

      await expect(
        service.analyzeConversation('evt-1', 'text'),
      ).resolves.toBeUndefined();
    });
  });
});
