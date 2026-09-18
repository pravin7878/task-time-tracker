import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(requireAuth);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
