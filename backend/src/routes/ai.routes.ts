import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getTaskSuggestion } from '../controllers/ai.controller';

const router = Router();

// All AI suggestion routes require authentication
router.use(requireAuth);

router.post('/task-suggestion', getTaskSuggestion);

export default router;
