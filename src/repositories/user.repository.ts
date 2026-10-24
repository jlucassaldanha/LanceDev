import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { Decimal } from '@prisma/client/runtime/client';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }

  async addBalance(userId: string, amount: Decimal) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount,
        },
      },
      select: {
        id: true,
        balance: true,
        committedBalance: true,
      }
    });
  }
}