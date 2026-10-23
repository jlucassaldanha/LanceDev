import { Router } from 'express';
import { LotController } from '../controllers/lot.controller';
import { authenticate, isLeiloeiro } from '../middlewares/auth.middleware';

const router = Router();
const lotController = new LotController();

// Rota de pesquisa na API externa (Auxilia o leiloeiro a encontrar o externalItemId)
router.get('/search', authenticate, isLeiloeiro, (req, res) => lotController.search(req, res));
router.get('/my-lots', authenticate, isLeiloeiro, (req, res) => lotController.listMyLots(req, res));

// Listar lotes da vitrine (público ou geral)
router.get('/', (req, res) => lotController.list(req, res));

// Detalhes de um lote específico
router.get('/:id', (req, res) => lotController.getById(req, res));

// Apenas LEILOEIROS podem acessar estas rotas
router.post('/', authenticate, isLeiloeiro, (req, res) => lotController.create(req, res));
router.delete('/:id', authenticate, isLeiloeiro, (req, res) => lotController.cancel(req, res));

export default router;