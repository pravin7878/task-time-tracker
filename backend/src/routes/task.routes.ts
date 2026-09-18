import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';
import {
  startTimer,
  stopTimer,
  getTaskTimeLogs,
} from '../controllers/timer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(requireAuth);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

// Task-specific time tracking routes
router.post('/:taskId/timer/start', startTimer);
router.post('/:taskId/timer/stop', stopTimer);
router.get('/:taskId/time-logs', getTaskTimeLogs);

export default router;
