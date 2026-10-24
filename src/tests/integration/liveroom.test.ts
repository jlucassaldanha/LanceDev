import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import jwt from 'jsonwebtoken';

describe('Integração: Sala do Lote ao Vivo (Live Room)', () => {
  let user1Token: string;
  let user2Token: string;
  let lotId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro Teste', email: 'leiloeiro.live@teste.com', password: 'hash', role: 'LEILOEIRO' },
    });

    const user1 = await prisma.user.create({
      data: { name: 'Carlos Silva', email: 'carlos@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });

    const user2 = await prisma.user.create({
      data: { name: 'Ana Souza', email: 'ana@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });

    user1Token = jwt.sign({ id: user1.id, role: user1.role }, process.env.JWT_SECRET || 'test-secret');
    user2Token = jwt.sign({ id: user2.id, role: user2.role }, process.env.JWT_SECRET || 'test-secret');

    // Criar um Lote Ativo ("LIVE")
    const lot = await prisma.lot.create({
      data: {
        title: 'Quadro Famoso',
        imageUrl: 'url',
        externalItemId: 'live-123',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        status: 'LIVE',
        creatorId: leiloeiro.id,
      },
    });
    lotId = lot.id;

    // Ana (user2) faz o primeiro lance de 1200
    await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ amount: 1200 });
  });

  it('Deve retornar 401 se o usuário não estiver autenticado', async () => {
    const response = await request(app).get(`/lots/${lotId}/live-room`);
    expect(response.status).toBe(401);
  });

  it('Deve retornar 404 se o lote não existir', async () => {
    const response = await request(app)
      .get('/lots/id-inexistente-uuid/live-room')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Lote não encontrado.');
  });

  it('Deve retornar os dados consolidados com isWinning = false quando o usuário não estiver liderando', async () => {
    const response = await request(app)
      .get(`/lots/${lotId}/live-room`)
      .set('Authorization', `Bearer ${user1Token}`); // Carlos ainda não deu lance, Ana está a ganhar

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('serverTime');
    expect(response.body.lot.id).toBe(lotId);
    expect(response.body.currentLeader.amount).toBe("1200");
    expect(response.body.currentLeader.bidderName).toBe('Ana S.'); // Valida o mascaramento do nome
    expect(response.body.userStatus.isWinning).toBe(false);
    expect(response.body.bidsHistory.length).toBe(1);
    expect(response.body.bidsHistory[0].isUserBid).toBe(false);
  });

  it('Deve retornar isWinning = true e marcar o lance como próprio quando o usuário assumir a liderança', async () => {
    // Carlos (user1) supera o lance com 1500
    await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ amount: 1500 });

    const response = await request(app)
      .get(`/lots/${lotId}/live-room`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.userStatus.isWinning).toBe(true);
    expect(response.body.currentLeader.amount).toBe("1500");
    expect(response.body.currentLeader.bidderName).toBe('Carlos S.');
    expect(response.body.bidsHistory[0].isUserBid).toBe(true); // O lance topo é dele
  });
});