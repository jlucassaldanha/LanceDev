import { UserRepository } from '../repositories/user.repository';

const userRepository = new UserRepository();

export class WalletService {
  async deposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const updatedUser = await userRepository.addBalance(userId, amount);
    
    // Calcula o saldo disponível (saldo total - saldo comprometido)
    const availableBalance = updatedUser.balance - updatedUser.committedBalance;

    return { 
      id: updatedUser.id,
      totalBalance: updatedUser.balance,
      committedBalance: updatedUser.committedBalance,
      availableBalance 
    };
  }

  async getBalance(userId: string) {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const availableBalance = user.balance - user.committedBalance;

    return {
      userId,
      totalBalance: user.balance,
      committedBalance: user.committedBalance,
      availableBalance,
    };
  }
}