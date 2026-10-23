import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import jwt from 'jsonwebtoken';

describe('Integração: Rota de Auditoria Pública', () => {
  let lotId: string;
  let leiloeiroId: string;
  let licitanteId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro Audit', email: 'leiloeiro.audit@teste.com', password: 'hash', role: 'LEILOEIRO' },
    });
    leiloeiroId = leiloeiro.id;

    const licitante = await prisma.user.create({
      data: { name: 'Licitante Audit', email: 'licitante.audit@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });
    licitanteId = licitante.id;

    const lot = await prisma.lot.create({
      data: {
        title: 'Obra Auditada',
        imageUrl: 'url',
        externalItemId: '999',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        creatorId: leiloeiroId,
      },
    });
    lotId = lot.id;

    // Gerar um token de licitante apenas para dar o lance via API de bids
    const token = jwt.sign({ id: licitanteId, role: 'LICITANTE' }, process.env.JWT_SECRET || 'test-secret');

    // Dar dois lances reais para criar uma cadeia de hashes válida
    await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1200 });

    const licitante2 = await prisma.user.create({
      data: { name: 'Licitante Dois', email: 'licitante2@teste.com', password: 'hash', role: 'LICITANTE', balance: 5000 },
    });
    const token2 = jwt.sign({ id: licitante2.id, role: 'LICITANTE' }, process.env.JWT_SECRET || 'test-secret');

    await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ amount: 1500 });
  });

  it('Deve permitir que QUALQUER pessoa (sem token) consulte a auditoria e veja a integridade intacta', async () => {
    const response = await request(app)
      .get(`/lots/${lotId}/audit`); 

    expect(response.status).toBe(200);
    expect(response.body.lotId).toBe(lotId);
    expect(response.body.totalBids).toBe(2);
    expect(response.body.isIntegrityIntact).toBe(true);
    expect(Array.isArray(response.body.auditDetails)).toBe(true);
    expect(response.body.auditDetails[0].previousHash).toBe('GENESIS');
    expect(response.body.auditDetails[1].previousHash).toBe(response.body.auditDetails[0].storedHash);
  });

  it('Deve retornar 404 ao tentar auditar um lote inexistente', async () => {
    const response = await request(app)
      .get('/lots/id-que-nao-existe/audit');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Lote não encontrado.');
  });
});