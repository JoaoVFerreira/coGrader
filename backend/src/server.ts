import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import helmet from 'helmet';
import expressWinston from 'express-winston';
import { StatusCodes } from 'http-status-codes';
import { logger } from './config/logger';
import { config } from './config/env';
import { initializeFirebase } from './config/firebase';
import { QueueService } from './services/queue.service';
import { createJobsRouter } from './routes/jobs.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging with Winston
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req) => req.url === '/health', // Ignore health check logs
}));

// Initialize Firebase
initializeFirebase();

// Initialize Queue Service
const queueService = new QueueService();

// Routes
app.use('/api/jobs', createJobsRouter(queueService));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'coGrader API',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing gracefully...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await queueService.close();
      logger.info('Queue service closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
