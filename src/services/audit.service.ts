import crypto from 'crypto';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

export class AuditService {
  async auditLotBids(lotId: string) {
    // 1. Busca o lote
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        bids: {
          orderBy: { createdAt: 'asc' }, // Ordem cronológica exata do encadeamento
        },
      },
    });

    if (!lot) {
      throw new Error('LOT_NOT_FOUND');
    }

    let currentExpectedPreviousHash = 'GENESIS';
    let isTampered = false;
    const auditedBids = [];

    // 2. Recalcula e valida cada hash da cadeia
    for (const bid of lot.bids) {
      // Recria o hash esperado para este lance
      const dataToHash = `${bid.lotId}:${bid.bidderId}:${new Prisma.Decimal(bid.amount).toFixed(2)}:${bid.previousHash}`;
      const calculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      // Verifica se o previousHash bate com o esperado e se o hash gravado é válido
      const isValid = bid.previousHash === currentExpectedPreviousHash && bid.hash === calculatedHash;

      if (!isValid) {
        isTampered = true;
      }

      auditedBids.push({
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt,
        storedHash: bid.hash,
        calculatedHash,
        previousHash: bid.previousHash,
        isValid,
      });

      // O próximo lance deve apontar para o hash atual
      currentExpectedPreviousHash = bid.hash;
    }

    return {
      lotId: lot.id,
      lotTitle: lot.title,
      totalBids: lot.bids.length,
      isIntegrityIntact: !isTampered,
      auditDetails: auditedBids,
    };
  }
}