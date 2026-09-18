import { Router } from 'express';
import { getActiveTimer } from '../controllers/timer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All timer routes require authentication
router.use(requireAuth);

router.get('/active', getActiveTimer);

export default router;
