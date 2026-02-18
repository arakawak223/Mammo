import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddBlockedNumberDto } from './dto/add-blocked-number.dto';

@Injectable()
export class BlocklistService {
  constructor(private prisma: PrismaService) {}

  async getList(elderlyId: string, userId: string) {
    await this.verifyFamilyAccess(elderlyId, userId);
    return this.prisma.blockedNumber.findMany({
      where: { elderlyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNumber(elderlyId: string, userId: string, dto: AddBlockedNumberDto) {
    await this.verifyFamilyAccess(elderlyId, userId);
    return this.prisma.blockedNumber.upsert({
      where: { elderlyId_phoneNumber: { elderlyId, phoneNumber: dto.phoneNumber } },
      create: {
        elderlyId,
        phoneNumber: dto.phoneNumber,
        addedBy: userId,
        reason: dto.reason,
      },
      update: {
        reason: dto.reason,
        synced: false,
      },
    });
  }

  async removeNumber(elderlyId: string, numberId: string, userId: string) {
    await this.verifyFamilyAccess(elderlyId, userId);
    const number = await this.prisma.blockedNumber.findUnique({ where: { id: numberId } });
    if (!number || number.elderlyId !== elderlyId) {
      throw new NotFoundException('番号が見つかりません');
    }
    await this.prisma.blockedNumber.delete({ where: { id: numberId } });
    return { message: 'ブロック解除しました' };
  }

  async markSynced(elderlyId: string, numberIds: string[]) {
    await this.prisma.blockedNumber.updateMany({
      where: { id: { in: numberIds }, elderlyId },
      data: { synced: true },
    });
  }

  private async verifyFamilyAccess(elderlyId: string, userId: string) {
    const pairing = await this.prisma.pairing.findFirst({
      where: { elderlyId, familyId: userId },
    });
    if (!pairing) throw new ForbiddenException('権限がありません');
  }
}
