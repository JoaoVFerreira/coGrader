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
import { getRoutes } from './utils/extract.route.paths';
import { TIMEOUT } from './constants';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req) => req.url === '/health',
}));

// Initialize Firebase
initializeFirebase();

const queueService = new QueueService();
app.use('/api/jobs', createJobsRouter(queueService));

app.get('/health', (_req, res) => {
  const routes = getRoutes(app);
  res.status(StatusCodes.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'coGrader API',
    endpoints: routes,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
});

const gracefulShutdown = async () => {
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

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, TIMEOUT.GRACEFUL_SHUTDOWN);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
