import { Request, Response } from 'express';
import { LotService } from '../services/lot.service';

const lotService = new LotService();

export class LotController {
  async create(req: Request, res: Response) {
    try {
      const leiloeiroId = req.user!.id; 
      
      const lot = await lotService.createLot(leiloeiroId, req.body);
      
      return res.status(201).json({ 
        message: 'Lote criado com sucesso!', 
        lot 
      });
    } catch (error: any) {
      switch (error.message) {
        case 'FIELDS_MISSING':
          return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        case 'ITEM_NOT_FOUND':
          return res.status(404).json({ error: 'Obra não encontrada no The Met Museum.' });
        case 'EXTERNAL_API_UNAVAILABLE':
          return res.status(502).json({ error: 'Erro ao se comunicar com a API do museu. Tente novamente mais tarde.' });
        default:
          console.error('Erro ao criar lote:', error);
          return res.status(500).json({ error: 'Erro interno ao processar a criação do lote.' });
      }
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const leiloeiroId = req.user!.id;
      const lotId = req.params.id;

      if (typeof lotId !== 'string') {
        return res.status(400).json({ error: 'O ID do Lote deve ser uma string válida.' });
      }

      await lotService.cancelLot(leiloeiroId, lotId);

      return res.status(200).json({ message: 'Lote cancelado com sucesso.' });
    } catch (error: any) {
      switch (error.message) {
        case 'LOT_NOT_FOUND':
          return res.status(404).json({ error: 'Lote não encontrado.' });
        case 'UNAUTHORIZED':
          return res.status(403).json({ error: 'Você não tem permissão para cancelar este lote.' });
        case 'HAS_BIDS':
          return res.status(400).json({ error: 'Não é possível cancelar um lote que já possui lances.' });
        default:
          console.error('Erro ao cancelar lote:', error);
          return res.status(500).json({ error: 'Erro interno ao cancelar o lote.' });
      }
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { status } = req.query;
      
      const lots = await lotService.listLots(status as string);
      
      return res.status(200).json(lots);
    } catch (error) {
      console.error('Erro ao listar lotes:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar lotes.' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'O ID deve ser uma string válida.' });
      }

      const lot = await lotService.getLotById(id);
      
      return res.status(200).json(lot);
    } catch (error: any) {
      if (error.message === 'LOT_NOT_FOUND') {
        return res.status(404).json({ error: 'Lote não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro interno ao buscar o lote.' });
    }
  }
}