import { Router, Request, Response } from 'express';
import commentController from '../controllers/comments';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();
router.use(verifyToken);

/**
 * GET /api/comments/stats
 * Retorna estatísticas dos comentários
 */
router.get('/stats', (req: Request, res: Response) => {
  commentController.getStats(req, res);
});

/**
 * GET /api/comments/period/:period
 * Retorna comentários de um período específico
 */
router.get('/period/:period', (req: Request, res: Response) => {
  commentController.getByPeriod(req, res);
});

/**
 * GET /api/comments
 * Retorna todos os comentários com paginação
 * Query params: page (default: 1), limit (default: 10, max: 100)
 */
router.get('/', (req: Request, res: Response) => {
  commentController.getAll(req, res);
});

/**
 * GET /api/comments/:id
 * Retorna um comentário específico
 * :id pode ser o ID do banco ou o annotation_id (1-300)
 */
router.get('/:id', (req: Request, res: Response) => {
  commentController.getById(req, res);
});

/**
 * POST /api/comments
 * Cria um novo comentário
 */
router.post('/', (req: Request, res: Response) => {
  commentController.create(req, res);
});

export default router;
