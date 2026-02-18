import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async getFamilyMembers(elderlyId: string) {
    const pairings = await this.prisma.pairing.findMany({
      where: { elderlyId },
      include: { family: { select: { id: true, name: true, phone: true, deviceToken: true } } },
    });
    return pairings.map((p) => ({ ...p.family, pairingRole: p.role }));
  }

  async updateProfile(id: string, data: { name?: string; prefecture?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
