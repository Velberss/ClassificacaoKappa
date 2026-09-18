import { Router } from 'express';
import annotationController from '../controllers/annotations';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.use(verifyToken);
router.get('/', (req, res) => annotationController.getMine(req, res));
router.get('/progress', (req, res) => annotationController.getProgress(req, res));
router.put('/:commentId', (req, res) => annotationController.save(req, res));

export default router;
