import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate, isLicitante } from '../middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();

router.get('/', authenticate, isLicitante, (req, res) => walletController.getBalance(req, res));
// Apenas usuários com o papel LICITANTE podem acessar esta rota
router.post('/deposit', authenticate, isLicitante, (req, res) => walletController.deposit(req, res));

export default router;