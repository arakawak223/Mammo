import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BlocklistService } from '../blocklist/blocklist.service';

const SMS_SCAM_KEYWORDS_JA = [
  '当選', '未払い', '口座', '振込', '至急', '本日中',
  '最終通告', '裁判', '差し押さえ', '支払い期限',
  '不正アクセス', '不正利用', 'アカウント停止',
  'ログイン確認', '本人確認', 'お届け物',
  '還付金', '払い戻し', '投資', '高収益',
];

const INTERNATIONAL_PREFIX_JAPAN = '+81';

type NumberRisk = 'high' | 'medium' | 'low';

interface ForwardAnalysis {
  severity: 'critical' | 'high' | 'medium' | 'low';
  numberRisk: NumberRisk;
  keywordsFound: string[];
  shouldAutoBlock: boolean;
}

@Injectable()
export class AutoForwardService {
  private logger = new Logger('AutoForwardService');

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private blocklistService: BlocklistService,
  ) {}

  async processAutoForward(
    elderlyId: string,
    eventId: string,
    payload: {
      phoneNumber: string;
      callType: 'call' | 'sms';
      smsContent?: string;
      callerName?: string;
    },
  ): Promise<ForwardAnalysis> {
    const { phoneNumber, callType, smsContent } = payload;

    // 1. Classify phone number risk
    const numberRisk = this.classifyNumber(phoneNumber);

    // 2. SMS keyword scan
    const keywordsFound = callType === 'sms' && smsContent
      ? this.scanSmsKeywords(smsContent)
      : [];

    // 3. Determine severity
    const severity = this.determineSeverity(numberRisk, keywordsFound.length);

    // 4. Trigger AI metadata analysis (non-blocking)
    this.aiService
      .analyzeCallMetadata(eventId, phoneNumber, callType, smsContent)
      .catch(() => {});

    // 5. Auto-block high-risk numbers
    const shouldAutoBlock = numberRisk === 'high' || keywordsFound.length >= 3;
    if (shouldAutoBlock) {
      await this.addToBlocklist(elderlyId, phoneNumber, numberRisk, keywordsFound);
    }

    this.logger.log(
      `Auto-forward processed: number=${phoneNumber}, risk=${numberRisk}, severity=${severity}, blocked=${shouldAutoBlock}`,
    );

    return { severity, numberRisk, keywordsFound, shouldAutoBlock };
  }

  classifyNumber(phoneNumber: string): NumberRisk {
    // International number (non-Japan) → high risk
    if (phoneNumber.startsWith('+') && !phoneNumber.startsWith(INTERNATIONAL_PREFIX_JAPAN)) {
      return 'high';
    }

    // Hidden/withheld number
    if (['非通知', 'unknown', 'private', ''].includes(phoneNumber)) {
      return 'high';
    }

    // IP phone (050) → medium risk
    if (phoneNumber.startsWith('050')) {
      return 'medium';
    }

    // Toll-free (0120) → medium risk
    if (phoneNumber.startsWith('0120')) {
      return 'medium';
    }

    // Short number (possible spoofed)
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      return 'medium';
    }

    return 'low';
  }

  scanSmsKeywords(content: string): string[] {
    return SMS_SCAM_KEYWORDS_JA.filter((keyword) => content.includes(keyword));
  }

  private determineSeverity(
    numberRisk: NumberRisk,
    keywordCount: number,
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (numberRisk === 'high' && keywordCount >= 2) return 'critical';
    if (numberRisk === 'high' || keywordCount >= 3) return 'high';
    if (numberRisk === 'medium' || keywordCount >= 1) return 'medium';
    return 'low';
  }

  private async addToBlocklist(
    elderlyId: string,
    phoneNumber: string,
    risk: NumberRisk,
    keywords: string[],
  ) {
    try {
      // Find a family member to attribute the block to (owner preferred)
      const pairing = await this.prisma.pairing.findFirst({
        where: { elderlyId, role: 'owner' },
        select: { familyId: true },
      });

      if (!pairing) return;

      const reason = keywords.length > 0
        ? `自動ブロック: キーワード検出 (${keywords.slice(0, 3).join(', ')})`
        : `自動ブロック: ${risk === 'high' ? '高リスク番号' : '中リスク番号'}`;

      await this.blocklistService.addNumber(elderlyId, pairing.familyId, {
        phoneNumber,
        reason,
      });

      this.logger.log(`Auto-blocked number ${phoneNumber} for elderly ${elderlyId}`);
    } catch (error) {
      this.logger.warn(`Failed to auto-block number ${phoneNumber}`, error);
    }
  }
}
