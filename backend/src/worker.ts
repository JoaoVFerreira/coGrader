import { logger } from './config/logger';
import { initializeFirebase } from './config/firebase';
import { ImageProcessorWorker } from './workers/image-processor.worker';

logger.info('Starting Image Processing Worker...');

// Initialize Firebase
initializeFirebase();

// Initialize Worker
const worker = new ImageProcessorWorker();

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing worker gracefully...');

  try {
    await worker.close();
    logger.info('Worker closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown();
});

logger.info('Worker is ready to process jobs');
