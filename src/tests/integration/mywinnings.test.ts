import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index'; // Ajuste o caminho se necessário
import { prisma } from '../../config/database'; // Ajuste o caminho se necessário
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('Integração: Meus Arremates (My Winnings)', () => {
  let winnerToken: string;
  let loserToken: string;
  let leiloeiroToken: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro Teste', email: 'leiloeiro.winnings@teste.com', password: 'hash', role: 'LEILOEIRO' },
    });

    const winner = await prisma.user.create({
      data: { name: 'Carlos Vencedor', email: 'carlos.winnings@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });

    const loser = await prisma.user.create({
      data: { name: 'Ana Perdedora', email: 'ana.winnings@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });

    leiloeiroToken = jwt.sign({ id: leiloeiro.id, role: leiloeiro.role }, process.env.JWT_SECRET || 'test-secret');
    winnerToken = jwt.sign({ id: winner.id, role: winner.role }, process.env.JWT_SECRET || 'test-secret');
    loserToken = jwt.sign({ id: loser.id, role: loser.role }, process.env.JWT_SECRET || 'test-secret');

    const lot = await prisma.lot.create({
      data: {
        title: 'Vaso Dinastia Ming',
        imageUrl: 'url',
        externalItemId: 'winnings-123',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 7200000), // Começou há 2 horas
        endTime: new Date(Date.now() - 3600000),   // Terminou há 1 hora
        status: 'FINISHED',
        creatorId: leiloeiro.id,
      },
    });

    // Criar o lance vencedor do Carlos aplicando a regra de auditoria (Blockchain Pattern)
    const previousHash = 'GENESIS';
    const bidData = `${lot.id}:${winner.id}:1500:${previousHash}`;
    const hash = crypto.createHash('sha256').update(bidData).digest('hex');

    await prisma.bid.create({
      data: {
        amount: 1500.0,
        lotId: lot.id,
        bidderId: winner.id,
        hash,
        previousHash,
      },
    });
  });

  it('Deve retornar 401 se o usuário não estiver autenticado', async () => {
    const response = await request(app).get('/lots/my-winnings');
    expect(response.status).toBe(401);
  });

  it('Deve retornar 403 (Forbidden) se um LEILOEIRO tentar acessar a rota', async () => {
    const response = await request(app)
      .get('/lots/my-winnings')
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(403);
  });

  it('Deve retornar 200 e um array vazio se o licitante não tiver nenhum arremate', async () => {
    const response = await request(app)
      .get('/lots/my-winnings')
      .set('Authorization', `Bearer ${loserToken}`); // Ana não venceu nada

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('Deve retornar 200 e a lista com o lote arrematado se o licitante for o vencedor', async () => {
    const response = await request(app)
      .get('/lots/my-winnings')
      .set('Authorization', `Bearer ${winnerToken}`); // Carlos venceu o Vaso

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    
    expect(response.body[0].title).toBe('Vaso Dinastia Ming');
  });
});