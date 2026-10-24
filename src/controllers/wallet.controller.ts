import { Request, Response } from 'express';
import { WalletService } from '../services/wallet.service';
import { Prisma } from '@prisma/client';

const walletService = new WalletService();

export class WalletController {
  async deposit(req: Request, res: Response) {
    try {
      const userId = req.user!.id; 
      const { amount } = req.body;

      if (amount === undefined || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'O valor (amount) é obrigatório e deve ser numérico.' });
      }

      const result = await walletService.deposit(userId, new Prisma.Decimal(amount));
      return res.status(200).json({ 
        message: 'Depósito simulado realizado com sucesso.', 
        wallet: result 
      });
    } catch (error: any) {
      if (error.message === 'INVALID_AMOUNT') {
        return res.status(400).json({ error: 'O valor do depósito deve ser maior que zero.' });
      }
      console.error('Erro ao processar depósito:', error);
      return res.status(500).json({ error: 'Erro interno ao processar o depósito.' });
    }
  }

  async getBalance(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const wallet = await walletService.getBalance(userId);
      return res.status(200).json(wallet);
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro interno ao buscar a carteira.' });
    }
  }
}