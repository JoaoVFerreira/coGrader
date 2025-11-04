import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../config/logger';
import { createRedisConnection } from '../config/redis';
import { JobData } from '../types/job.types';
import { QUEUE } from '../constants';

export class QueueService {
  private queue: Queue<JobData>;
  private queueEvents: QueueEvents;

  constructor() {
    const connection = createRedisConnection();

    this.queue = new Queue<JobData>(QUEUE.NAME, {
      connection,
      defaultJobOptions: {
        attempts: QUEUE.RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE.RETRY_DELAY,
        },
        removeOnComplete: {
          count: QUEUE.CLEANUP.COMPLETED_COUNT,
          age: QUEUE.CLEANUP.COMPLETED_AGE,
        },
        removeOnFail: {
          count: QUEUE.CLEANUP.FAILED_COUNT,
          age: QUEUE.CLEANUP.FAILED_AGE,
        },
      },
    });

    this.queueEvents = new QueueEvents(QUEUE.NAME, { connection });

    logger.info('Queue service initialized');
  }

  async addJob(jobId: string, imageUrl: string): Promise<void> {
    await this.queue.add(
      'processImage',
      {
        jobId,
        imageUrl,
      },
      {
        jobId,
      }
    );

    logger.info('Job added to queue', { jobId });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
  }
}
