import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

describe('Integração: Motor de Lances', () => {
  let leiloeiroToken: string;
  let licitanteToken: string;
  let licitantePobreToken: string;
  let lotId: string;
  let licitanteId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.user.deleteMany();

    const leiloeiro = await prisma.user.create({
      data: { name: 'Leiloeiro', email: 'leiloeiro.bids@teste.com', password: 'hash', role: 'LEILOEIRO' },
    });
    const licitante = await prisma.user.create({
      data: { name: 'Licitante Rico', email: 'rico@teste.com', password: 'hash', role: 'LICITANTE', balance: 10000 },
    });
    const licitantePobre = await prisma.user.create({
      data: { name: 'Licitante Pobre', email: 'pobre@teste.com', password: 'hash', role: 'LICITANTE', balance: 100 },
    });

    licitanteId = licitante.id;

    leiloeiroToken = jwt.sign({ id: leiloeiro.id, role: leiloeiro.role }, process.env.JWT_SECRET || 'test-secret');
    licitanteToken = jwt.sign({ id: licitante.id, role: licitante.role }, process.env.JWT_SECRET || 'test-secret');
    licitantePobreToken = jwt.sign({ id: licitantePobre.id, role: licitantePobre.role }, process.env.JWT_SECRET || 'test-secret');

    // Criar um Lote Ativo ("Ao Vivo")
    const lot = await prisma.lot.create({
      data: {
        title: 'Obra Rara',
        imageUrl: 'url',
        externalItemId: '123',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date(Date.now() - 3600000), // Começou há 1 hora
        endTime: new Date(Date.now() + 3600000),   // Termina daqui a 1 hora
        creatorId: leiloeiro.id,
      },
    });
    lotId = lot.id;
  });

  it('Não deve permitir que um LEILOEIRO faça um lance', async () => {
    const response = await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({ amount: 1200 });

    expect(response.status).toBe(403);
  });

  it('Deve rejeitar um lance menor que o lance inicial (startingBid)', async () => {
    const response = await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${licitanteToken}`)
      .send({ amount: 500 }); // startingBid é 1000

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('O valor do lance está abaixo do mínimo permitido.');
  });

  it('Deve rejeitar um lance se o licitante não tiver saldo suficiente', async () => {
    const response = await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${licitantePobreToken}`)
      .send({ amount: 1000 }); // Ele só tem 100 de saldo

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Saldo disponível insuficiente para este lance.');
  });

  it('Deve registar um lance válido, gerando hash e comprometendo o saldo', async () => {
    const response = await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${licitanteToken}`)
      .send({ amount: 1500 });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Lance registrado com sucesso.');

    // Validar se o saldo foi comprometido na base de dados
    const userDb = await prisma.user.findUnique({ where: { id: licitanteId } });
    expect(userDb?.committedBalance).toEqual(new Prisma.Decimal(1500));

    // Validar se o hash foi gerado
    const bidDb = await prisma.bid.findFirst({ where: { lotId }, orderBy: { amount: 'desc' } });
    expect(bidDb?.hash).not.toBe('hash-pendente');
    expect(bidDb?.previousHash).toBe('GENESIS');
  });

  it('Não deve permitir que o líder atual cubra o próprio lance', async () => {
    const response = await request(app)
      .post(`/lots/${lotId}/bids`)
      .set('Authorization', `Bearer ${licitanteToken}`) // O mesmo licitante que já está a ganhar
      .send({ amount: 2000 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Você não pode fazer um novo lance pois já está ganhando este lote.');
  });
});