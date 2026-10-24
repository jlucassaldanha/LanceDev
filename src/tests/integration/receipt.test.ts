import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index'; 
import { prisma } from '../../config/database';
import crypto from 'crypto';

describe('Integração: Comprovante de Arremate Público (Receipt)', () => {
  let lotFinishedId: string;
  let lotActiveId: string;
  let lotNoBidsId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro Oficial', email: 'leiloeiro.receipt@teste.com', password: 'hash', role: 'LEILOEIRO' },
    });

    const winner = await prisma.user.create({
      data: { name: 'Carlos Colecionador', email: 'carlos.receipt@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });

    // Criar Lote 1: Finalizado COM lance vencedor
    const lotFinished = await prisma.lot.create({
      data: {
        title: 'Estátua de Bronze',
        imageUrl: 'url',
        externalItemId: 'receipt-1',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 7200000), // Começou há 2 horas
        endTime: new Date(Date.now() - 3600000),   // Terminou há 1 hora
        status: 'FINISHED',
        creatorId: leiloeiro.id,
      },
    });
    lotFinishedId = lotFinished.id;

    // Inserir o lance do lote 1
    const previousHash = 'GENESIS';
    const bidData = `${lotFinished.id}:${winner.id}:1500:${previousHash}`;
    const hash = crypto.createHash('sha256').update(bidData).digest('hex');

    await prisma.bid.create({
      data: { amount: 1500.0, lotId: lotFinished.id, bidderId: winner.id, hash, previousHash },
    });

    // Criar Lote 2: Finalizado SEM nenhum lance
    const lotNoBids = await prisma.lot.create({
      data: {
        title: 'Quadro Sem Interesse',
        imageUrl: 'url2',
        externalItemId: 'receipt-2',
        startingBid: 500,
        minimumIncrement: 50,
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 3600000),
        status: 'FINISHED',
        creatorId: leiloeiro.id,
      },
    });
    lotNoBidsId = lotNoBids.id;

    // Criar Lote 3: Ainda ativo
    const lotActive = await prisma.lot.create({
      data: {
        title: 'Leilão em Andamento',
        imageUrl: 'url3',
        externalItemId: 'receipt-3',
        startingBid: 2000,
        minimumIncrement: 200,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        status: 'LIVE',
        creatorId: leiloeiro.id,
      },
    });
    lotActiveId = lotActive.id;
  });

  it('Deve retornar 404 se o lote não existir', async () => {
    const response = await request(app).get('/lots/id-inexistente/receipt');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Lote não encontrado.');
  });

  it('Deve retornar 400 se o lote ainda não estiver finalizado', async () => {
    const response = await request(app).get(`/lots/${lotActiveId}/receipt`);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Este lote ainda não foi encerrado.');
  });

  it('Deve retornar 200 informando que não houve arrematante se o lote encerrou sem lances', async () => {
    const response = await request(app).get(`/lots/${lotNoBidsId}/receipt`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lote encerrado sem arrematante.');
    expect(response.body.title).toBe('Quadro Sem Interesse');
  });

  it('Deve retornar 200 com os dados do recibo e o NOME MASCARADO por privacidade', async () => {
    const response = await request(app).get(`/lots/${lotFinishedId}/receipt`);
    
    expect(response.status).toBe(200);
    expect(response.body.lotId).toBe(lotFinishedId);
    expect(response.body.title).toBe('Estátua de Bronze');
    expect(response.body.amount).toBe(1500);
    
    // Testa ativamente a regra de negócio de Privacidade Exigida pelo Desafio
    expect(response.body.winnerName).toBe('Carlos C.'); 
  });
});