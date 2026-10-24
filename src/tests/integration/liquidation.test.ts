import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

describe('Integração: Mecanismo de Liquidação', () => {
  let leiloeiroToken: string;
  let licitanteToken: string;
  let lotIdExpiredWithWinner: string;
  let lotIdExpiredWithoutWinner: string;
  let lotIdNotYetExpired: string;
  let leiloeiroId: string;
  let vencedorId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro Chefe', email: 'leiloeiro.liq@teste.com', password: 'hash', role: 'LEILOEIRO', balance: 0 },
    });
    leiloeiroId = leiloeiro.id;

    const vencedor = await prisma.user.create({
      data: { name: 'Comprador Rico', email: 'vencedor@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000, committedBalance: 1200 },
    });
    vencedorId = vencedor.id;

    leiloeiroToken = jwt.sign({ id: leiloeiro.id, role: leiloeiro.role }, process.env.JWT_SECRET || 'test-secret');
    licitanteToken = jwt.sign({ id: vencedor.id, role: vencedor.role }, process.env.JWT_SECRET || 'test-secret');

    const pastDate = new Date(Date.now() - 7200000); // 2 horas atrás
    const futureDate = new Date(Date.now() + 7200000); // Daqui a 2 horas

    // Lote Expirado COM Lances/Vencedor
    const lot1 = await prisma.lot.create({
      data: {
        title: 'Obra Arrematada',
        imageUrl: 'url',
        externalItemId: '111',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 10000000),
        endTime: pastDate, // Já expirou
        status: 'LIVE',
        creatorId: leiloeiro.id,
      },
    });
    lotIdExpiredWithWinner = lot1.id;

    // Criar o lance vencedor para o lote 1
    await prisma.bid.create({
      data: {
        amount: 1200,
        lotId: lot1.id,
        bidderId: vencedor.id,
        hash: 'hash-abc',
        previousHash: 'GENESIS',
      },
    });

    // Lote Expirado SEM Lances
    const lot2 = await encurtarLoteSemLances(leiloeiro.id);
    lotIdExpiredWithoutWinner = lot2.id;

    // Lote AINDA ATIVO (Não expirou)
    const lot3 = await prisma.lot.create({
      data: {
        title: 'Obra em Andamento',
        imageUrl: 'url',
        externalItemId: '333',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: pastDate,
        endTime: futureDate, // Ainda vai expirar
        status: 'LIVE',
        creatorId: leiloeiro.id,
      },
    });
    lotIdNotYetExpired = lot3.id;
  });

  // Função auxiliar para criar lote expirado sem lances
  async function encurtarLoteSemLances(creatorId: string) {
    return prisma.lot.create({
      data: {
        title: 'Obra Encalhada',
        imageUrl: 'url',
        externalItemId: '222',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 10000000),
        endTime: new Date(Date.now() - 3600000), // Expirou há 1 hora
        status: 'LIVE',
        creatorId,
      },
    });
  }

  it('Não deve permitir que um LICITANTE liquide um lote', async () => {
    const response = await request(app)
      .post(`/lots/${lotIdExpiredWithWinner}/liquidate`)
      .set('Authorization', `Bearer ${licitanteToken}`);

    expect(response.status).toBe(403);
  });

  it('Não deve permitir liquidar um lote cujo prazo ainda não acabou', async () => {
    const response = await request(app)
      .post(`/lots/${lotIdNotYetExpired}/liquidate`)
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('O prazo de encerramento deste lote ainda não chegou.');
  });

  it('Deve liquidar com sucesso um lote expirado sem lances (sem vencedor)', async () => {
    const response = await request(app)
      .post(`/lots/${lotIdExpiredWithoutWinner}/liquidate`)
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(200);
    expect(response.body.winnerId).toBeNull();
    expect(response.body.winningAmount).toBe("0");
  });

  it('Deve liquidar com sucesso um lote expirado com vencedor, debitando o comprador e creditando o leiloeiro', async () => {
    const response = await request(app)
      .post(`/lots/${lotIdExpiredWithWinner}/liquidate`)
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(200);
    expect(response.body.winnerId).toBe(vencedorId);
    expect(response.body.winningAmount).toBe("1200");
    expect(response.body).toHaveProperty('receipt');

    // Valida se o saldo do vencedor foi deduzido definitivamente (5000 - 1200 = 3800) e o comprometido zerado
    const vencedorDb = await prisma.user.findUnique({ where: { id: vencedorId } });
    expect(vencedorDb?.balance).toEqual(new Prisma.Decimal(3800));
    expect(vencedorDb?.committedBalance).toEqual(new Prisma.Decimal(0));

    // Valida se o leiloeiro recebeu o crédito (0 + 1200 = 1200)
    const leiloeiroDb = await prisma.user.findUnique({ where: { id: leiloeiroId } });
    expect(leiloeiroDb?.balance).toEqual(new Prisma.Decimal(1200));
  });

  it('Não deve permitir liquidar um lote que já foi encerrado', async () => {
    const response = await request(app)
      .post(`/lots/${lotIdExpiredWithWinner}/liquidate`) // Já foi liquidado no teste anterior
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Este lote já foi encerrado.');
  });
});