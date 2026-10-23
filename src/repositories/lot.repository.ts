import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class LotRepository {
  // UncheckedCreateInput porque o leiloeiroId é apenas uma string de relacionamento
  async create(data: Prisma.LotUncheckedCreateInput) {
    return prisma.lot.create({
      data,
    });
  }

  async findById(lotId: string) {
    return prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        _count: {
          select: { bids: true }, // Conta quantos lances existem
        },
      },
    });
  }

  async delete(lotId: string) {
    return prisma.lot.delete({
      where: { id: lotId },
    });
  }

  async findAll(status?: any) {
    return prisma.lot.findMany({
      where: {
        status: status ? status : { not: 'CANCELLED' }, // Oculta cancelados por padrão
      },
      include: {
        _count: {
          select: { bids: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findWithDetails(lotId: string) {
    return prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        creator: {
          select: { name: true, email: true },
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 10, // Histórico dos últimos lances
          include: {
            bidder: {
              select: { name: true }, // Cuidado com a privacidade, mas útil para o painel
            },
          },
        },
      },
    });
  }
}