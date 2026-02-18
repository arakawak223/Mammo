import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';
import { AutoForwardService } from './auto-forward.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private aiService: AiService,
    private autoForwardService: AutoForwardService,
    private alertsGateway: AlertsGateway,
  ) {}

  async create(elderlyId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        elderlyId,
        type: dto.type,
        severity: dto.severity,
        payload: (dto.payload ?? {}) as any,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Trigger AI analysis for scam_button, auto_forward, and conversation_ai (non-blocking)
    if (dto.type === 'scam_button') {
      const text = (dto.payload as any)?.conversationText || '';
      if (text) {
        this.aiService.analyzeConversation(event.id, text).catch(() => {});
      }
    } else if (dto.type === 'conversation_ai') {
      const text = (dto.payload as any)?.conversationText || '';
      if (text) {
        this.aiService.analyzeConversationSummary(event.id, text).catch(() => {});
      }
    } else if (dto.type === 'auto_forward') {
      const payload = dto.payload as any;
      if (payload?.phoneNumber) {
        // Delegate to AutoForwardService for full processing
        const analysis = await this.autoForwardService.processAutoForward(
          elderlyId,
          event.id,
          {
            phoneNumber: payload.phoneNumber,
            callType: payload.callType || 'call',
            smsContent: payload.smsContent,
            callerName: payload.callerName,
          },
        );
        // Update event severity based on analysis
        if (analysis.severity !== dto.severity) {
          await this.prisma.event.update({
            where: { id: event.id },
            data: { severity: analysis.severity },
          });
        }
      }
    }

    // Get family members to notify
    const pairings = await this.prisma.pairing.findMany({
      where: { elderlyId },
      include: {
        family: { select: { id: true, deviceToken: true, name: true } },
      },
    });

    const elderly = await this.prisma.user.findUnique({
      where: { id: elderlyId },
      select: { name: true },
    });

    // Send push notifications to all family members
    const tokens = pairings
      .map((p) => p.family.deviceToken)
      .filter((t): t is string => t !== null);

    if (tokens.length > 0) {
      await this.notifications.sendToDevices(tokens, {
        title: this.getNotificationTitle(dto.type),
        body: `${elderly?.name ?? '高齢者'}さんから通知があります`,
        data: { eventId: event.id, type: dto.type, severity: dto.severity },
        priority: dto.severity === 'critical' ? 'critical' : 'high',
      });
    }

    // Emit real-time WebSocket alert
    this.alertsGateway.emitNewAlert(elderlyId, event);

    return event;
  }

  async findById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { aiAnalysis: true },
    });
    if (!event) throw new NotFoundException('イベントが見つかりません');
    return event;
  }

  async findByElderly(elderlyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { elderlyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { aiAnalysis: true },
      }),
      this.prisma.event.count({ where: { elderlyId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async resolve(eventId: string, resolvedBy: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('イベントが見つかりません');

    // Verify resolver is a family member
    const pairing = await this.prisma.pairing.findFirst({
      where: { elderlyId: event.elderlyId, familyId: resolvedBy },
    });
    if (!pairing) throw new ForbiddenException('権限がありません');

    const resolved = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: 'resolved', resolvedBy, resolvedAt: new Date() },
    });

    // Emit real-time WebSocket alert resolved
    this.alertsGateway.emitAlertResolved(event.elderlyId, eventId);

    return resolved;
  }

  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      scam_button: '「これ詐欺？」ボタンが押されました',
      auto_forward: '不審な着信/SMSを検知しました',
      ai_assistant: 'AI音声アシスタントの判定結果',
      emergency_sos: '緊急SOS！',
      realtime_alert: '新しいアラート',
      conversation_ai: '会話サマリー',
      remote_block: 'リモートブロック操作',
      dark_job_check: '闇バイトチェッカー結果',
      statistics: '統計情報',
    };
    return titles[type] ?? '新しいアラート';
  }
}
