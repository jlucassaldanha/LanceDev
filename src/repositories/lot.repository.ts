import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { Decimal } from '@prisma/client/runtime/client';

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
        bids: {
          orderBy: [
            { amount: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 1, 
        },
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

  async findByCreatorId(creatorId: string) {
    return prisma.lot.findMany({
      where: { creatorId },
      include: {
        _count: {
          select: { bids: true }, // Traz a contagem de lances
        },
      },
      orderBy: { startTime: 'desc' }, // Mais recentes primeiro
    });
  }

  async closeLotWithWinner(lotId: string, winnerId: string, winningAmount: Decimal, creatorId: string) {
    return prisma.$transaction([
      // 1. Debita definitivamente o valor do saldo do vencedor e limpa o comprometido
      prisma.user.update({
        where: { id: winnerId },
        data: {
          balance: { decrement: winningAmount },
          committedBalance: { decrement: winningAmount },
        },
      }),
      // 2. Credita o valor na carteira do leiloeiro
      prisma.user.update({
        where: { id: creatorId },
        data: {
          balance: { increment: winningAmount },
        },
      }),
      // 3. Atualiza o status do lote para FINISHED
      prisma.lot.update({
        where: { id: lotId },
        data: { status: 'FINISHED' },
      }),
    ]);
  }

  async closeLotWithoutWinner(lotId: string) {
    return prisma.lot.update({
      where: { id: lotId },
      data: { status: 'FINISHED' },
    });
  }

  async findWinningsByUserId(userId: string) {
    const finishedLots = await prisma.lot.findMany({
      where: {
        status: 'FINISHED',
      },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    });

    return finishedLots.filter(
      (lot) => lot.bids.length > 0 && lot.bids[0]?.bidderId === userId
    );
  }

  async findMyBidLotsByUserId(userId: string) {
    const myLots = await prisma.lot.findMany({
      where: {
        status: 'LIVE',
        bids: {
          some: {
            bidderId: userId
          }
        }
      },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
        },
      },
    });

    return myLots
  }

  async findLotReceiptById(lotId: string) {
    return await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1, // Pega apenas o lance vencedor
          include: { bidder: true }, // Traz os dados do usuário para o mascaramento
        },
      },
    });
  }
}