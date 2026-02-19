import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  CircuitBreaker,
  withRetry,
} from '../common/utils/circuit-breaker';

export interface AiAnalysisResult {
  riskScore: number;
  scamType: string;
  summary: string;
  keywordsFound: string[];
  modelVersion: string;
}

@Injectable()
export class AiService {
  private logger = new Logger('AiService');
  private aiBaseUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.aiBaseUrl =
      this.config.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.circuitBreaker = new CircuitBreaker({
      name: 'ai-service',
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    });
  }

  private async callAi<T>(
    url: string,
    data: any,
    timeoutMs = 3000,
  ): Promise<T> {
    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const response = await firstValueFrom(
            this.http.post(url, data).pipe(
              timeout(timeoutMs),
              catchError((err) => {
                throw err;
              }),
            ),
          );
          return response.data as T;
        },
        { maxRetries: 2, baseDelayMs: 500, logger: this.logger },
      ),
    );
  }

  async analyzeConversation(
    eventId: string,
    text: string,
    callerNumber?: string,
  ): Promise<void> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/analyze/conversation`,
        { text, caller_number: callerNumber },
      );

      await this.prisma.aiAnalysis.create({
        data: {
          eventId,
          riskScore: data.risk_score,
          scamType: data.scam_type,
          summary: data.summary,
          modelVersion: data.model_version,
        },
      });

      this.logger.log(
        `AI analysis saved for event ${eventId}: score=${data.risk_score}`,
      );
    } catch (error) {
      this.logger.error(`Failed to analyze event ${eventId}`, error);
    }
  }

  async analyzeCallMetadata(
    eventId: string,
    phoneNumber: string,
    callType: string,
    smsContent?: string,
  ): Promise<void> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/analyze/call-metadata`,
        { phone_number: phoneNumber, call_type: callType, sms_content: smsContent },
      );

      await this.prisma.aiAnalysis.create({
        data: {
          eventId,
          riskScore: data.risk_score,
          scamType: data.scam_type || 'unknown',
          summary: data.summary,
          modelVersion: data.model_version,
        },
      });

      this.logger.log(
        `AI metadata analysis saved for event ${eventId}: score=${data.risk_score}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to analyze metadata for event ${eventId}`,
        error,
      );
    }
  }

  async quickCheck(
    text: string,
  ): Promise<{
    isSuspicious: boolean;
    riskScore: number;
    reason: string;
  } | null> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/analyze/quick-check`,
        { text },
      );
      return {
        isSuspicious: data.is_suspicious,
        riskScore: data.risk_score,
        reason: data.reason,
      };
    } catch {
      return null;
    }
  }

  async checkDarkJob(text: string, source?: string): Promise<any> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/check/dark-job`,
        { text, source },
      );
      return {
        isDarkJob: data.is_dark_job,
        riskLevel: data.risk_level,
        riskScore: data.risk_score,
        keywordsFound: data.keywords_found,
        explanation: data.explanation,
        modelVersion: data.model_version,
      };
    } catch (error) {
      this.logger.error('Dark job check failed', error);
      return {
        isDarkJob: false,
        riskLevel: 'low',
        riskScore: 0,
        keywordsFound: [],
        explanation: 'チェックに失敗しました。後ほどお試しください。',
        modelVersion: 'error',
      };
    }
  }

  async analyzeConversationSummary(
    eventId: string,
    text: string,
  ): Promise<any> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/analyze/conversation-summary`,
        { text },
        5000,
      );

      await this.prisma.aiAnalysis.create({
        data: {
          eventId,
          riskScore: data.risk_score,
          scamType: data.scam_type,
          summary: data.summary,
          rawText: text,
          modelVersion: data.model_version,
        },
      });

      this.logger.log(
        `Conversation summary saved for event ${eventId}: score=${data.risk_score}`,
      );
      return {
        riskScore: data.risk_score,
        scamType: data.scam_type,
        summary: data.summary,
        keyPoints: data.key_points || [],
        recommendedActions: data.recommended_actions || [],
        modelVersion: data.model_version,
      };
    } catch (error) {
      this.logger.error(
        `Failed to summarize conversation for event ${eventId}`,
        error,
      );
      return null;
    }
  }

  async checkDarkJobImage(imageBase64: string, source?: string): Promise<any> {
    try {
      const data = await this.callAi<any>(
        `${this.aiBaseUrl}/api/v1/check/dark-job-image`,
        { image_base64: imageBase64, source },
        5000,
      );
      return {
        isDarkJob: data.is_dark_job,
        riskLevel: data.risk_level,
        riskScore: data.risk_score,
        keywordsFound: data.keywords_found,
        explanation: data.explanation,
        modelVersion: data.model_version,
        extractedText: data.extracted_text || '',
      };
    } catch (error) {
      this.logger.error('Dark job image check failed', error);
      return {
        isDarkJob: false,
        riskLevel: 'low',
        riskScore: 0,
        keywordsFound: [],
        explanation: '画像チェックに失敗しました。テキスト入力をお試しください。',
        modelVersion: 'error',
        extractedText: '',
      };
    }
  }

  async saveDarkJobCheck(
    userId: string,
    inputText: string,
    inputType: string,
    result: any,
  ): Promise<void> {
    try {
      await this.prisma.darkJobCheck.create({
        data: {
          userId,
          inputText: inputText.substring(0, 2000),
          inputType,
          riskLevel: result.riskLevel || 'low',
          riskScore: result.riskScore || 0,
          result: result as any,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save dark job check history', error);
    }
  }

  async getDarkJobHistory(userId: string, limit = 20): Promise<any[]> {
    const records = await this.prisma.darkJobCheck.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((r) => ({
      id: r.id,
      inputText: r.inputText,
      inputType: r.inputType,
      riskLevel: r.riskLevel,
      riskScore: r.riskScore,
      result: r.result,
      createdAt: r.createdAt,
    }));
  }

  async voiceAnalyze(userId: string, transcript: string): Promise<any> {
    const event = await this.prisma.event.create({
      data: {
        elderlyId: userId,
        type: 'conversation_ai',
        severity: 'medium',
        payload: {
          conversationText: transcript,
          source: 'voice_assistant',
        } as any,
      },
    });

    const result = await this.analyzeConversationSummary(
      event.id,
      transcript,
    );

    if (result && result.riskScore >= 90) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { severity: 'critical' },
      });
    } else if (result && result.riskScore >= 70) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { severity: 'high' },
      });
    }

    return {
      eventId: event.id,
      riskScore: result?.riskScore ?? 0,
      scamType: result?.scamType ?? 'unknown',
      summary: result?.summary ?? '解析に失敗しました',
      keyPoints: result?.keyPoints ?? [],
      recommendedActions: result?.recommendedActions ?? [],
      modelVersion: result?.modelVersion ?? 'error',
    };
  }
}
