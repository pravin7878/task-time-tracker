import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getTodaySummary } from '../controllers/summary.controller';

const router = Router();

// All daily summary endpoints require authentication
router.use(requireAuth);

router.get('/today', getTodaySummary);

export default router;
