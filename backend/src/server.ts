import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[server] Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = () => {
  console.log('[server] Shutting down gracefully...');
  server.close(() => {
    console.log('[server] Process terminated');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default server;
