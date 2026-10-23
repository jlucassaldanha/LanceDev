import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService();

export class AuditController {
  async audit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'O ID deve ser uma string válida.' });
      }

      const result = await auditService.auditLotBids(id);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'LOT_NOT_FOUND') {
        return res.status(404).json({ error: 'Lote não encontrado.' });
      }
      console.error('Erro na auditoria:', error);
      return res.status(500).json({ error: 'Erro interno ao auditar o lote.' });
    }
  }
}