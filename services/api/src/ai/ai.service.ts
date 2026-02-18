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
}
