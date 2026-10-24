import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './database/connection';

const startServer = async () => {
  // Check database connectivity
  await checkDatabaseConnection();

  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`AEGIS Emergency Backend listening on http://${config.HOST}:${config.PORT}`);
    logger.info(`Health check available at http://${config.HOST}:${config.PORT}/health`);
    logger.info(`API v1 mounted at http://${config.HOST}:${config.PORT}${config.API_PREFIX}`);
    logger.info(`Default City: ${config.DEFAULT_CITY} (${config.DEFAULT_LATITUDE}, ${config.DEFAULT_LONGITUDE})`);
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down AEGIS server gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Fatal server startup error:', { error: err.message });
  process.exit(1);
});
