import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Iniciando o processo de Seed do banco de dados...');

  // 1. Limpar dados anteriores (opcional, para evitar duplicatas em ambiente dev)
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. Criar Leiloeiro
  const leiloeiro = await prisma.user.create({
    data: {
      name: 'Leiloeiro Oficial',
      email: 'leiloeiro@leilodedev.com',
      password: passwordHash,
      role: 'LEILOEIRO',
    },
  });
  console.log(`Leiloeiro criado: ${leiloeiro.email}`);

  // 3. Criar Licitantes com saldo simulado
  const licitante1 = await prisma.user.create({
    data: {
      name: 'Carlos Colecionador',
      email: 'licitante1@leilodedev.com',
      password: passwordHash,
      role: 'LICITANTE',
      balance: 10000.0,
      committedBalance: 1500.0,
    },
  });

  const licitante2 = await prisma.user.create({
    data: {
      name: 'Beatriz Arte',
      email: 'licitante2@leilodedev.com',
      password: passwordHash,
      role: 'LICITANTE',
      balance: 5000.0,
      committedBalance: 0.0,
    },
  });
  console.log(`Licitantes criados: ${licitante1.email}, ${licitante2.email}`);

  // 4. Criar Lote Publicado (Ativo / Ao Vivo)
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000); // Começou há 1 hora
  const endTime = new Date(now.getTime() + 7200000);   // Termina daqui a 2 horas

  const lot = await prisma.lot.create({
    data: {
      title: 'Retrato de Homem Nobre (The Met Collection)',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP159802.jpg',
      externalItemId: '436532',
      startingBid: 1000.0,
      minimumIncrement: 100.0,
      startTime,
      endTime,
      status: 'LIVE',
      creatorId: leiloeiro.id,
    },
  });
  console.log(`Lote criado: "${lot.title}" (ID: ${lot.id})`);

  // 5. Simular um lance válido com encadeamento de hash (Blockchain Pattern)
  const previousHash = 'GENESIS';
  const bidData = `${lot.id}:${licitante1.id}:1500:${previousHash}`;
  const hash = crypto.createHash('sha256').update(bidData).digest('hex');

  await prisma.bid.create({
    data: {
      amount: 1500.0,
      lotId: lot.id,
      bidderId: licitante1.id,
      hash,
      previousHash,
    },
  });
  console.log('Lance inicial registrado e auditado com sucesso!');

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });