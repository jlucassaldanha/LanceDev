import { Prisma, PrismaClient } from '@prisma/client';
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
      balance: 1500.0,
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
      balance: 8500.0,
      committedBalance: 2000.0,
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
  const pastStartTime = new Date(now.getTime() - 86400000 * 2); // Há 2 dias
  const pastEndTime = new Date(now.getTime() - 86400000);     // Há 1 dia
  const activeStartTime = new Date(now.getTime() - 3600000);  // Há 1 hora
  const activeEndTime = new Date(now.getTime() + 86400000);  

  await prisma.lot.create({
    data: {
      title: 'Women Picking Olives',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP-17161-001.jpg',
      externalItemId: '436536',
      startingBid: 800.0,
      minimumIncrement: 50.0,
      startTime: pastStartTime,
      endTime: pastEndTime,
      status: 'FINISHED',
      creatorId: leiloeiro.id,
    },
  });

  const lotFinishedWithWinner = await prisma.lot.create({
    data: {
      title: 'Washington Crossing the Delaware',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ad/web-large/DP215410.jpg',
      externalItemId: '11417',
      startingBid: 1000.0,
      minimumIncrement: 100.0,
      startTime: pastStartTime,
      endTime: pastEndTime,
      status: 'FINISHED',
      creatorId: leiloeiro.id,
    },
  });

  // 5. Simular um lance válido com encadeamento de hash (Blockchain Pattern)
  const prevHashFinished = 'GENESIS';
  const bidDataFinished = `${lotFinishedWithWinner.id}:${licitante1.id}:${new Prisma.Decimal(1500).toFixed(2)}:${prevHashFinished}`;
  const hashFinished = crypto.createHash('sha256').update(bidDataFinished).digest('hex');

  await prisma.bid.create({
    data: {
      amount: 1500.0,
      lotId: lotFinishedWithWinner.id,
      bidderId: licitante1.id,
      hash: hashFinished,
      previousHash: prevHashFinished,
      createdAt: pastEndTime,
    },
  });

  const lotActive = await prisma.lot.create({
    data: {
      title: 'Fur Traders Descending the Missouri',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ad/web-large/DT73.jpg',
      externalItemId: '10159',
      startingBid: 1500.0,
      minimumIncrement: 150.0,
      startTime: activeStartTime,
      endTime: activeEndTime,
      status: 'LIVE',
      creatorId: leiloeiro.id,
    },
  });

  const prevHashActive = 'GENESIS';
  const bidDataActive = `${lotActive.id}:${licitante1.id}:${new Prisma.Decimal(2000).toFixed(2)}:${prevHashActive}`;
  const hashActive = crypto.createHash('sha256').update(bidDataActive).digest('hex');

  await prisma.bid.create({
    data: {
      amount: 2000.0,
      lotId: lotActive.id,
      bidderId: licitante1.id,
      hash: hashActive,
      previousHash: prevHashActive,
    },
  });

  await prisma.lot.create({
    data: {
      title: 'Young Woman with a Water Pitche',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP353257.jpg',
      externalItemId: '437881',
      startingBid: 300.0,
      minimumIncrement: 20.0,
      startTime: pastStartTime,
      endTime: activeEndTime,
      status: 'CANCELLED', 
      creatorId: leiloeiro.id,
    },
  });

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