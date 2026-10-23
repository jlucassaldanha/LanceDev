import { prisma } from '../config/database';

export class BidRepository {
  async findHighestBid(lotId: string) {
    return prisma.bid.findFirst({
      where: { lotId },
      orderBy: { amount: 'desc' },
    });
  }

  async executeBidTransaction(
    bidderId: string,
    lotId: string,
    amount: number,
    previousLeaderId: string | null,
    previousLeaderAmount: number,
    newEndTime: Date | null,
    hash: string,         
    previousHash: string  
  ) {
    const operations = [];

    if (previousLeaderId) {
      operations.push(
        prisma.user.update({
          where: { id: previousLeaderId },
          data: { committedBalance: { decrement: previousLeaderAmount } },
        })
      );
    }

    operations.push(
      prisma.user.update({
        where: { id: bidderId },
        data: { committedBalance: { increment: amount } },
      })
    );

    if (newEndTime) {
      operations.push(
        prisma.lot.update({
          where: { id: lotId },
          data: { endTime: newEndTime },
        })
      );
    }

    operations.push(
      prisma.bid.create({
        data: {
          amount,
          lotId,
          bidderId,
          hash,
          previousHash
        },
      })
    );

    // Executa tudo garantindo o conceito ACID
    return prisma.$transaction(operations);
  }

  async findByLotId(lotId: string) {
    return prisma.bid.findMany({
      where: { lotId },
      orderBy: { createdAt: 'desc' },
    });
  }
}