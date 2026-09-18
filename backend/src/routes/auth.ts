import { Router } from 'express';
import { login, logout, refresh } from '../controllers/auth';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', verifyToken, logout);

export default router;
