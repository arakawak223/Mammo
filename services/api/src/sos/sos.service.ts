import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SosGateway } from './sos.gateway';
import { StartSosDto } from './dto/start-sos.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class SosService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private sosGateway: SosGateway,
  ) {}

  async start(elderlyId: string, dto: StartSosDto) {
    // Get default mode from settings, or use request mode
    const settings = await this.prisma.sosSetting.findUnique({
      where: { elderlyId },
    });
    const mode = dto.mode ?? settings?.defaultMode ?? 'silent';

    const session = await this.prisma.sosSession.create({
      data: {
        elderlyId,
        mode,
        locations: [{ lat: dto.latitude, lng: dto.longitude, ts: new Date().toISOString() }],
      },
    });

    // Create emergency_sos event automatically
    await this.prisma.event.create({
      data: {
        elderlyId,
        type: 'emergency_sos',
        severity: 'critical',
        payload: { sessionId: session.id, mode } as any,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Notify all family members with CRITICAL priority
    const pairings = await this.prisma.pairing.findMany({
      where: { elderlyId },
      include: { family: { select: { deviceToken: true } } },
    });

    const elderly = await this.prisma.user.findUnique({
      where: { id: elderlyId },
      select: { name: true },
    });

    const tokens = pairings.map((p) => p.family.deviceToken).filter((t): t is string => !!t);
    if (tokens.length > 0) {
      await this.notifications.sendToDevices(tokens, {
        title: '緊急SOS！',
        body: `${elderly?.name ?? '高齢者'}さんが緊急SOSを発信しました`,
        data: {
          sessionId: session.id,
          mode,
          type: 'emergency_sos',
          latitude: String(dto.latitude),
          longitude: String(dto.longitude),
        },
        priority: 'critical',
      });
    }

    return session;
  }

  async updateLocation(sessionId: string, dto: UpdateLocationDto) {
    const session = await this.prisma.sosSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'active') {
      throw new NotFoundException('アクティブなSOSセッションが見つかりません');
    }

    const locations = (session.locations as any[]) ?? [];
    const locationEntry = {
      lat: dto.latitude,
      lng: dto.longitude,
      accuracy: dto.accuracy,
      battery: dto.battery,
      ts: new Date().toISOString(),
    };
    locations.push(locationEntry);

    const updated = await this.prisma.sosSession.update({
      where: { id: sessionId },
      data: { locations },
    });

    // Emit location update via WebSocket
    this.sosGateway.emitLocationUpdate(sessionId, locationEntry);

    return updated;
  }

  async changeMode(sessionId: string, mode: 'alarm' | 'silent', userId: string) {
    const session = await this.prisma.sosSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'active') {
      throw new NotFoundException('アクティブなSOSセッションが見つかりません');
    }

    // Verify family access
    await this.verifyFamilyAccess(session.elderlyId, userId);

    const updated = await this.prisma.sosSession.update({
      where: { id: sessionId },
      data: { mode },
    });

    // Emit mode change via WebSocket
    this.sosGateway.emitModeChange(sessionId, mode);

    return updated;
  }

  async resolve(sessionId: string, userId: string) {
    const session = await this.prisma.sosSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SOSセッションが見つかりません');

    await this.verifyFamilyAccess(session.elderlyId, userId);

    const updated = await this.prisma.sosSession.update({
      where: { id: sessionId },
      data: { status: 'resolved', resolvedBy: userId, endedAt: new Date() },
    });

    // Emit resolved via WebSocket
    this.sosGateway.emitResolved(sessionId);

    return updated;
  }

  async getSettings(elderlyId: string) {
    return this.prisma.sosSetting.findUnique({ where: { elderlyId } });
  }

  async updateSettings(elderlyId: string, mode: 'alarm' | 'silent', userId: string) {
    await this.verifyFamilyAccess(elderlyId, userId);
    return this.prisma.sosSetting.upsert({
      where: { elderlyId },
      create: { elderlyId, defaultMode: mode, updatedBy: userId },
      update: { defaultMode: mode, updatedBy: userId },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.sosSession.findUnique({ where: { id: sessionId } });
  }

  private async verifyFamilyAccess(elderlyId: string, userId: string) {
    const pairing = await this.prisma.pairing.findFirst({
      where: { elderlyId, familyId: userId },
    });
    if (!pairing) throw new ForbiddenException('権限がありません');
  }
}
