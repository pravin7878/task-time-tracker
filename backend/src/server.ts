import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`[server] Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const gracefulShutdown = async () => {
      console.log('[server] Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        console.log('[server] Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return server;
  } catch {
    console.error('[server] Failed to start server due to database connection error');
    process.exit(1);
  }
};

const serverPromise = startServer();

export default serverPromise;

