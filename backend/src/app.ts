import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import timerRoutes from './routes/timer.routes';
import timeLogRoutes from './routes/timeLog.routes';
import summaryRoutes from './routes/summary.routes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL.split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Baseline health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/time-logs', timeLogRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler for unknown API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;

