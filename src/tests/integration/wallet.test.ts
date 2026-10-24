import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';

let licitanteToken: string;
let leiloeiroToken: string;

beforeAll(async () => {
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.user.deleteMany();

  // Criação dos usuários para o teste
  const licitante = await request(app).post('/auth/register').send({
    name: 'Cliente Licitante',
    email: 'cliente@wallet.com',
    password: '123',
    role: 'LICITANTE',
  });

  const leiloeiro = await request(app).post('/auth/register').send({
    name: 'Vendedor Leiloeiro',
    email: 'vendedor@wallet.com',
    password: '123',
    role: 'LEILOEIRO',
  });

  // Login para capturar os tokens
  const loginLicitante = await request(app).post('/auth/login').send({ email: 'cliente@wallet.com', password: '123' });
  licitanteToken = loginLicitante.body.token;

  const loginLeiloeiro = await request(app).post('/auth/login').send({ email: 'vendedor@wallet.com', password: '123' });
  leiloeiroToken = loginLeiloeiro.body.token;
});

afterAll(async () => {
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Integração: Carteira (Depósito)', () => {
  it('Deve permitir que um LICITANTE realize um depósito com sucesso', async () => {
    const response = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${licitanteToken}`)
      .send({ amount: 500.0 });

    expect(response.status).toBe(200);
    expect(response.body.wallet.totalBalance).toBe("500");
    expect(response.body.wallet.availableBalance).toBe("500");
  });

  it('Não deve permitir depósitos com valor zero ou negativo', async () => {
    const response = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${licitanteToken}`)
      .send({ amount: -100 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('O valor do depósito deve ser maior que zero.');
  });

  it('Deve retornar os dados da carteira do LICITANTE corretamente', async () => {
    const response = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${licitanteToken}`);

    expect(response.status).toBe(200);
    // Como depositamos 500 no teste anterior, o saldo deve refletir isso
    expect(response.body.totalBalance).toBe("500");
    expect(response.body.committedBalance).toBe("0");
    expect(response.body.availableBalance).toBe("500");
  });

  it('Deve retornar os dados da carteira do LEILOEIRO corretamente', async () => {
    const response = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(200);
    // Como o leiloeiro não realiza depósitos, o saldo deve ser 0
    expect(response.body.totalBalance).toBe("0");
    expect(response.body.committedBalance).toBe("0");
    expect(response.body.availableBalance).toBe("0");
  });
});