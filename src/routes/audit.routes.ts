import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';

const router = Router();
const auditController = new AuditController();

// Rota Pública de Auditoria (Sem autenticação)
router.get('/lots/:id/audit', (req, res) => auditController.audit(req, res));

export default router;