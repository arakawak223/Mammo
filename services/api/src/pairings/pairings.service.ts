import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePairingDto } from './dto/create-pairing.dto';
import { JoinPairingDto } from './dto/join-pairing.dto';
import { nanoid } from 'nanoid';

const INVITE_EXPIRY_MINUTES = 30;
const MAX_FAMILY_MEMBERS = 5;

@Injectable()
export class PairingsService {
  constructor(private prisma: PrismaService) {}

  async createInvite(elderlyId: string, createdBy: string) {
    const code = nanoid(6).toUpperCase();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000);

    const invite = await this.prisma.inviteCode.create({
      data: { code, elderlyId, createdBy, expiresAt },
    });

    return { code: invite.code, expiresAt: invite.expiresAt };
  }

  async joinByCode(dto: JoinPairingDto, familyUserId: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('招待コードが無効または期限切れです');
    }

    // Check max family members
    const existingCount = await this.prisma.pairing.count({
      where: { elderlyId: invite.elderlyId },
    });
    if (existingCount >= MAX_FAMILY_MEMBERS) {
      throw new BadRequestException('家族メンバーの上限（5名）に達しています');
    }

    // Check not already paired
    const existing = await this.prisma.pairing.findUnique({
      where: { elderlyId_familyId: { elderlyId: invite.elderlyId, familyId: familyUserId } },
    });
    if (existing) {
      throw new BadRequestException('既にペアリング済みです');
    }

    const isFirstMember = existingCount === 0;

    const [pairing] = await this.prisma.$transaction([
      this.prisma.pairing.create({
        data: {
          elderlyId: invite.elderlyId,
          familyId: familyUserId,
          role: isFirstMember ? 'owner' : 'member',
        },
        include: {
          elderly: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return pairing;
  }

  async getPairings(userId: string) {
    const [asElderly, asFamily] = await Promise.all([
      this.prisma.pairing.findMany({
        where: { elderlyId: userId },
        include: { family: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.pairing.findMany({
        where: { familyId: userId },
        include: { elderly: { select: { id: true, name: true, phone: true } } },
      }),
    ]);

    return { asElderly, asFamily };
  }

  async removePairing(pairingId: string, userId: string) {
    const pairing = await this.prisma.pairing.findUnique({ where: { id: pairingId } });
    if (!pairing) throw new NotFoundException('ペアリングが見つかりません');
    if (pairing.elderlyId !== userId && pairing.familyId !== userId) {
      throw new ForbiddenException('このペアリングを解除する権限がありません');
    }

    await this.prisma.pairing.delete({ where: { id: pairingId } });
    return { message: 'ペアリングを解除しました' };
  }
}
