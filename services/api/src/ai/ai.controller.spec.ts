import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let aiService: {
    checkDarkJob: jest.Mock;
    checkDarkJobImage: jest.Mock;
    saveDarkJobCheck: jest.Mock;
    getDarkJobHistory: jest.Mock;
    voiceAnalyze: jest.Mock;
  };

  beforeEach(async () => {
    aiService = {
      checkDarkJob: jest.fn(),
      checkDarkJobImage: jest.fn(),
      saveDarkJobCheck: jest.fn().mockResolvedValue(undefined),
      getDarkJobHistory: jest.fn(),
      voiceAnalyze: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  describe('checkDarkJob', () => {
    it('should return dark job check result with consultation contacts', async () => {
      aiService.checkDarkJob.mockResolvedValue({
        isDarkJob: true,
        riskLevel: 'high',
        riskScore: 80,
        keywordsFound: ['受け子', '高額バイト'],
        explanation: '闇バイトの可能性が高いです。',
        modelVersion: 'darkjob-hybrid-v2.0.0',
      });

      const req = { user: { id: 'user-1' } };
      const result = await controller.checkDarkJob(req, { text: '受け子募集、高額バイト' });

      expect(result.isDarkJob).toBe(true);
      expect(result.riskScore).toBe(80);
      expect(result.consultationContacts).toBeDefined();
      expect(result.consultationContacts).toHaveLength(4);
      expect(result.consultationContacts[0].name).toBe('警察相談ダイヤル');
      expect(aiService.saveDarkJobCheck).toHaveBeenCalledWith('user-1', '受け子募集、高額バイト', 'text', expect.any(Object));
    });

    it('should return safe result for non-dark-job text', async () => {
      aiService.checkDarkJob.mockResolvedValue({
        isDarkJob: false,
        riskLevel: 'low',
        riskScore: 0,
        keywordsFound: [],
        explanation: '闇バイトの兆候は検出されませんでした。',
        modelVersion: 'darkjob-hybrid-v2.0.0',
      });

      const req = { user: { id: 'user-1' } };
      const result = await controller.checkDarkJob(req, { text: 'コンビニでアルバイト募集中' });

      expect(result.isDarkJob).toBe(false);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('checkDarkJobImage', () => {
    it('should return image check result with consultation contacts', async () => {
      aiService.checkDarkJobImage.mockResolvedValue({
        isDarkJob: false,
        riskLevel: 'low',
        riskScore: 0,
        keywordsFound: [],
        explanation: 'テキストなし',
        modelVersion: 'ocr-v1',
        extractedText: '',
      });

      const req = { user: { id: 'user-1' } };
      const result = await controller.checkDarkJobImage(req, { imageBase64: 'base64data' });

      expect(result.consultationContacts).toBeDefined();
      expect(aiService.saveDarkJobCheck).toHaveBeenCalled();
    });
  });

  describe('getDarkJobHistory', () => {
    it('should return user check history', async () => {
      const mockHistory = [
        { id: '1', inputText: 'test', inputType: 'text', riskLevel: 'low', riskScore: 0, createdAt: new Date() },
      ];
      aiService.getDarkJobHistory.mockResolvedValue(mockHistory);

      const req = { user: { id: 'user-1' } };
      const result = await controller.getDarkJobHistory(req);

      expect(result).toHaveLength(1);
      expect(aiService.getDarkJobHistory).toHaveBeenCalledWith('user-1', 20);
    });

    it('should parse limit parameter', async () => {
      aiService.getDarkJobHistory.mockResolvedValue([]);

      const req = { user: { id: 'user-1' } };
      await controller.getDarkJobHistory(req, '5');

      expect(aiService.getDarkJobHistory).toHaveBeenCalledWith('user-1', 5);
    });
  });

  describe('voiceAnalyze', () => {
    it('should call aiService.voiceAnalyze with user id and transcript', async () => {
      const mockResult = {
        eventId: 'event-1',
        riskScore: 70,
        scamType: 'ore_ore',
        summary: 'オレオレ詐欺の可能性',
        keyPoints: ['息子を名乗る人物'],
        recommendedActions: ['家族に相談してください'],
        modelVersion: 'rule-v0.1.0',
      };
      aiService.voiceAnalyze.mockResolvedValue(mockResult);

      const req = { user: { id: 'user-1' } };
      const result = await controller.voiceAnalyze(req, { transcript: '息子です、事故を起こしました' });

      expect(aiService.voiceAnalyze).toHaveBeenCalledWith('user-1', '息子です、事故を起こしました');
      expect(result.riskScore).toBe(70);
      expect(result.eventId).toBe('event-1');
    });
  });
});
