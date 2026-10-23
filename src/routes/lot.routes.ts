import { Router } from 'express';
import { LotController } from '../controllers/lot.controller';
import { authenticate, isLeiloeiro, isLicitante } from '../middlewares/auth.middleware';
import { BidController } from '../controllers/bid.controller';

const router = Router();
const lotController = new LotController();
const bidController = new BidController();

// Rota de pesquisa na API externa (Auxilia o leiloeiro a encontrar o externalItemId)
router.get('/search', authenticate, isLeiloeiro, (req, res) => lotController.search(req, res));
router.get('/my-lots', authenticate, isLeiloeiro, (req, res) => lotController.listMyLots(req, res));

// Listar lotes da vitrine (público ou geral)
router.get('/', (req, res) => lotController.list(req, res));

// Rota de Lotes Arrematados (Apenas LICITANTE)
router.get('/my-winnings', authenticate, isLicitante, (req, res) => lotController.getMyWinnings(req, res));

router.get('/:id/live-room', authenticate, isLicitante, (req, res) => lotController.getLiveRoom(req, res));

// Detalhes de um lote específico
router.get('/:id', (req, res) => lotController.getById(req, res));

router.post('/:id/bids', authenticate, isLicitante, (req, res) => bidController.placeBid(req, res));

// Apenas LEILOEIROS podem acessar estas rotas
router.post('/', authenticate, isLeiloeiro, (req, res) => lotController.create(req, res));
// Rota de Liquidação de Lote
router.post('/:id/liquidate', authenticate, isLeiloeiro, (req, res) => lotController.liquidate(req, res));
router.delete('/:id', authenticate, isLeiloeiro, (req, res) => lotController.cancel(req, res));

export default router;