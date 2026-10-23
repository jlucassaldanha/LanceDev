import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';

let leiloeiroToken: string;
let licitanteToken: string;
let lotIdToCancel: string;

beforeAll(async () => {
  // A ordem de exclusão importa por conta da chave estrangeira
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.user.deleteMany();

  await request(app).post('/auth/register').send({
    name: 'Leiloeiro Teste',
    email: 'leiloeiro@lotes.com',
    password: '123',
    role: 'LEILOEIRO',
  });

  await request(app).post('/auth/register').send({
    name: 'Licitante Teste',
    email: 'licitante@lotes.com',
    password: '123',
    role: 'LICITANTE',
  });

  const loginLeiloeiro = await request(app).post('/auth/login').send({ email: 'leiloeiro@lotes.com', password: '123' });
  leiloeiroToken = loginLeiloeiro.body.token;

  const loginLicitante = await request(app).post('/auth/login').send({ email: 'licitante@lotes.com', password: '123' });
  licitanteToken = loginLicitante.body.token;
});

afterAll(async () => {
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
  vi.restoreAllMocks();
});

describe('Integração: Lotes', () => {
  it('Deve bloquear a criação de lotes por um LICITANTE', async () => {
    const response = await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${licitanteToken}`)
      .send({
        externalItemId: '436532',
        startingBid: 1000,
        minimumIncrement: 100,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });

    expect(response.status).toBe(403);
  });

  it('Deve criar um lote com sucesso sendo um LEILOEIRO (Mock da API Externa)', async () => {
    // Intercepta a requisição do Node.js e finge que The Met respondeu com sucesso
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Obra de Arte Falsa',
        primaryImage: 'http://imagem.com/obra.jpg',
      }),
    });

    const response = await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({
        externalItemId: '999999',
        startingBid: 5000,
        minimumIncrement: 500,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(), // +1 dia
      });

    expect(response.status).toBe(201);
    expect(response.body.lot).toHaveProperty('id');
    expect(response.body.lot.title).toBe('Obra de Arte Falsa');
    
    lotIdToCancel = response.body.lot.id; // Guarda o ID para o teste de exclusão
  });

  it('Deve retornar erro 502 se a API Externa estiver fora do ar', async () => {
    // Finge que a API do museu caiu (Regra de resiliência sendo testada)
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const response = await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({
        externalItemId: '999999',
        startingBid: 5000,
        minimumIncrement: 500,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('Erro ao se comunicar com a API do museu. Tente novamente mais tarde.');
  });

  it('Deve cancelar um lote com sucesso (se ainda não tiver lances)', async () => {
    const response = await request(app)
      .delete(`/lots/${lotIdToCancel}`)
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lote cancelado com sucesso.');
  });

  it('Não deve permitir o cancelamento de um lote que já possui lances', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Obra para Teste de Bloqueio', primaryImage: 'url' }),
    });

    const createResponse = await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({
        externalItemId: '777777',
        startingBid: 2000,
        minimumIncrement: 200,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    const lotId = createResponse.body.lot.id;

    const licitante = await prisma.user.findFirst({ where: { role: 'LICITANTE' } });

    await prisma.bid.create({
      data: {
        amount: 2500,
        lotId: lotId,
        bidderId: licitante!.id,
        hash: 'hash-criptografico-simulado',
      }
    });

    const deleteResponse = await request(app)
      .delete(`/lots/${lotId}`)
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(deleteResponse.status).toBe(400);
    expect(deleteResponse.body.error).toBe('Não é possível cancelar um lote que já possui lances.');
  });

  it('Deve listar os lotes disponíveis na vitrine', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Obra para Vitrine', primaryImage: 'url' }),
    });

    await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({
        externalItemId: '888888',
        startingBid: 3000,
        minimumIncrement: 300,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    const response = await request(app).get('/lots');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const obraEncontrada = response.body.find((lot: any) => lot.title === 'Obra para Vitrine');
    expect(obraEncontrada).toBeDefined();
    expect(obraEncontrada.startingBid).toBe(3000);
  });

  it('Deve retornar os detalhes de um lote específico pelo ID', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Obra Detalhada', primaryImage: 'url' }),
    });

    const createRes = await request(app)
      .post('/lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`)
      .send({
        externalItemId: '555555',
        startingBid: 1500,
        minimumIncrement: 150,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    const lotId = createRes.body.lot.id;

    const response = await request(app).get(`/lots/${lotId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', lotId);
    expect(response.body).toHaveProperty('title', 'Obra Detalhada');
    expect(response.body).toHaveProperty('creator');
  });

  it('Deve retornar 404 ao buscar um lote com ID inexistente', async () => {
    const response = await request(app).get('/lots/id-que-nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Lote não encontrado.');
  });

  it('Deve pesquisar itens na API externa com sucesso sendo um LEILOEIRO', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/public/collection/v1.1/search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ objectIDs: [436532] }),
        });
      }
      if (url.includes('/public/collection/v1/objects/436532')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            objectID: 436532,
            title: 'Sunflowers',
            primaryImageSmall: 'http://imagem.com/sunflowers.jpg',
            artistDisplayName: 'Vincent van Gogh',
            objectDate: '1888',
          }),
        });
      }
      return Promise.reject(new Error('URL desconhecida no mock'));
    });

    const response = await request(app)
      .get('/lots/search?q=sunflowers')
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toHaveProperty('title', 'Sunflowers');
    expect(response.body[0]).toHaveProperty('artistDisplayName', 'Vincent van Gogh');
  });

  it('Não deve permitir a busca sem o parâmetro "q"', async () => {
    const response = await request(app)
      .get('/lots/search')
      .set('Authorization', `Bearer ${leiloeiroToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('O parâmetro de busca "q" é obrigatório.');
  });

  it('Deve bloquear a busca realizada por um LICITANTE', async () => {
    const response = await request(app)
      .get('/lots/search?q=sunflowers')
      .set('Authorization', `Bearer ${licitanteToken}`);

    expect(response.status).toBe(403);
  });

  it('Deve listar os lotes do leiloeiro autenticado com sucesso', async () => {
    const response = await request(app)
      .get('/lots/my-lots')
      .set('Authorization', `Bearer ${leiloeiroToken}`); 

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('Não deve permitir acesso aos "meus lotes" sem estar autenticado (Sem Token)', async () => {
    const response = await request(app)
      .get('/lots/my-lots');

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('Não deve permitir que um LICITANTE acesse a rota de "meus lotes" do leiloeiro', async () => {
    const response = await request(app)
      .get('/lots/my-lots')
      .set('Authorization', `Bearer ${licitanteToken}`);

    expect(response.status).toBe(403);
  });
});