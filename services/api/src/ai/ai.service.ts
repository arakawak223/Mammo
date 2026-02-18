import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.aiBaseUrl = this.config.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
  }

  async analyzeConversation(eventId: string, text: string, callerNumber?: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.aiBaseUrl}/api/v1/analyze/conversation`, {
            text,
            caller_number: callerNumber,
          })
          .pipe(
            timeout(3000),
            catchError((err) => {
              this.logger.warn(`AI conversation analysis failed: ${err.message}`);
              throw err;
            }),
          ),
      );

      const data = response.data as AiAnalysisResult & {
        risk_score: number;
        scam_type: string;
        keywords_found: string[];
        model_version: string;
      };

      await this.prisma.aiAnalysis.create({
        data: {
          eventId,
          riskScore: data.risk_score,
          scamType: data.scam_type,
          summary: data.summary,
          modelVersion: data.model_version,
        },
      });

      this.logger.log(`AI analysis saved for event ${eventId}: score=${data.risk_score}`);
    } catch (error) {
      this.logger.error(`Failed to analyze event ${eventId}`, error);
      // Non-blocking: don't throw, event creation still succeeds
    }
  }

  async analyzeCallMetadata(
    eventId: string,
    phoneNumber: string,
    callType: string,
    smsContent?: string,
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.aiBaseUrl}/api/v1/analyze/call-metadata`, {
            phone_number: phoneNumber,
            call_type: callType,
            sms_content: smsContent,
          })
          .pipe(
            timeout(3000),
            catchError((err) => {
              this.logger.warn(`AI metadata analysis failed: ${err.message}`);
              throw err;
            }),
          ),
      );

      const data = response.data;

      await this.prisma.aiAnalysis.create({
        data: {
          eventId,
          riskScore: data.risk_score,
          scamType: data.scam_type || 'unknown',
          summary: data.summary,
          modelVersion: data.model_version,
        },
      });

      this.logger.log(`AI metadata analysis saved for event ${eventId}: score=${data.risk_score}`);
    } catch (error) {
      this.logger.error(`Failed to analyze metadata for event ${eventId}`, error);
    }
  }

  async quickCheck(text: string): Promise<{ isSuspicious: boolean; riskScore: number; reason: string } | null> {
    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.aiBaseUrl}/api/v1/analyze/quick-check`, { text })
          .pipe(
            timeout(3000),
            catchError((err) => {
              this.logger.warn(`AI quick check failed: ${err.message}`);
              throw err;
            }),
          ),
      );

      return {
        isSuspicious: response.data.is_suspicious,
        riskScore: response.data.risk_score,
        reason: response.data.reason,
      };
    } catch {
      return null;
    }
  }

  async checkDarkJob(text: string, source?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.aiBaseUrl}/api/v1/check/dark-job`, { text, source })
          .pipe(
            timeout(3000),
            catchError((err) => {
              this.logger.warn(`AI dark job check failed: ${err.message}`);
              throw err;
            }),
          ),
      );

      return {
        isDarkJob: response.data.is_dark_job,
        riskLevel: response.data.risk_level,
        riskScore: response.data.risk_score,
        keywordsFound: response.data.keywords_found,
        explanation: response.data.explanation,
        modelVersion: response.data.model_version,
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

  async analyzeConversationSummary(eventId: string, text: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.aiBaseUrl}/api/v1/analyze/conversation-summary`, { text })
          .pipe(
            timeout(5000),
            catchError((err) => {
              this.logger.warn(`AI conversation summary failed: ${err.message}`);
              throw err;
            }),
          ),
      );

      const data = response.data;

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

      this.logger.log(`Conversation summary saved for event ${eventId}: score=${data.risk_score}`);
      return {
        riskScore: data.risk_score,
        scamType: data.scam_type,
        summary: data.summary,
        keyPoints: data.key_points || [],
        recommendedActions: data.recommended_actions || [],
        modelVersion: data.model_version,
      };
    } catch (error) {
      this.logger.error(`Failed to summarize conversation for event ${eventId}`, error);
      return null;
    }
  }

  async voiceAnalyze(userId: string, transcript: string): Promise<any> {
    // Create event for the voice analysis
    const event = await this.prisma.event.create({
      data: {
        elderlyId: userId,
        type: 'conversation_ai',
        severity: 'medium',
        payload: { conversationText: transcript, source: 'voice_assistant' } as any,
      },
    });

    // Analyze conversation summary
    const result = await this.analyzeConversationSummary(event.id, transcript);

    // Update severity based on risk score
    if (result && result.riskScore >= 70) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { severity: 'high' },
      });
    } else if (result && result.riskScore >= 90) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { severity: 'critical' },
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
