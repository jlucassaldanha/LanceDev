import { Request, Response } from 'express';
import { BidService } from '../services/bid.service';

const bidService = new BidService();

export class BidController {
  async placeBid(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const bidderId = req.user.id;
      const lotId = req.params.id;
      const { amount } = req.body;

      if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Informe um valor numérico válido para o lance.' });
      }

      if (typeof lotId !== 'string') {
        return res.status(400).json({ error: 'O ID do Lote deve ser uma string válida.' });
      }
      
      const result = await bidService.placeBid(bidderId, lotId, amount);
      
      return res.status(201).json(result);

    } catch (error: any) {
      switch (error.message) {
        case 'LOT_NOT_FOUND':
          return res.status(404).json({ error: 'Lote não encontrado.' });
        case 'LOT_NOT_STARTED':
          return res.status(400).json({ error: 'O leilão para este lote ainda não começou.' });
        case 'LOT_FINISHED':
          return res.status(400).json({ error: 'Este lote já foi encerrado.' });
        case 'USER_NOT_FOUND':
          return res.status(404).json({ error: 'Licitante não encontrado.' });
        case 'ALREADY_WINNING':
          return res.status(400).json({ error: 'Você já está ganhando este lote.' });
        case 'BID_TOO_LOW':
          return res.status(400).json({ error: 'O valor do lance está abaixo do mínimo permitido.' });
        case 'INSUFFICIENT_FUNDS':
          return res.status(400).json({ error: 'Saldo disponível insuficiente para este lance.' });
        default:
          console.error('Erro no Motor de Lances:', error);
          return res.status(500).json({ error: 'Erro interno ao processar o lance.' });
      }
    }
  }
}