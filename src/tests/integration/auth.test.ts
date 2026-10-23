import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';

beforeAll(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect(); 
});

describe('Integração: Autenticação de Usuários', () => {
  
  const mockUser = {
    name: 'Teste Licitante',
    email: 'teste@licitante.com',
    password: 'senhaforte123',
    role: 'LICITANTE',
  };

  it('Deve registrar um novo usuário com sucesso', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(mockUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(mockUser.email);
    expect(response.body).not.toHaveProperty('password'); 
  });

  it('Não deve permitir registro com e-mail duplicado', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(mockUser);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Este e-mail já está em uso.');
  });

  it('Deve realizar login com as credenciais corretas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: mockUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.role).toBe('LICITANTE');
  });

  it('Não deve realizar login com senha incorreta', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'senhaerrada',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciais inválidas.');
  });

  it('Não deve permitir registro com campos faltando', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Teste Incompleto',
        email: 'incompleto@teste.com',
        // password faltando propositalmente
        role: 'LICITANTE',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Todos os campos são obrigatórios.');
  });

  it('Não deve permitir registro com um papel (role) inválido', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker@teste.com',
        password: 'senhaforte123',
        role: 'ADMIN', // Role inexistente no schema
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Papel inválido.');
  });

  it('Não deve realizar login se faltarem credenciais', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: mockUser.email,
        // password faltando
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Todos os campos são obrigatórios.');
  });
});