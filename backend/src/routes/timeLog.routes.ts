import { Router } from 'express';
import { getTimeLogs } from '../controllers/timer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All time log routes require authentication
router.use(requireAuth);

router.get('/', getTimeLogs);

export default router;
