import { logger } from './config/logger';
import { initializeFirebase } from './config/firebase';
import { ImageProcessorWorker } from './workers/image-processor.worker';

// Initialize Firebase
initializeFirebase();

// Initialize Worker
const worker = new ImageProcessorWorker();

const gracefulShutdown = async () => {
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

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown();
});
