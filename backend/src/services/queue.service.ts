import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../config/logger';
import { createRedisConnection } from '../config/redis';
import { JobData } from '../types/job.types';

const QUEUE_NAME = 'imageProcessing';

export class QueueService {
  private queue: Queue<JobData>;
  private queueEvents: QueueEvents;

  constructor() {
    const connection = createRedisConnection();

    this.queue = new Queue<JobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 1000,
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });

    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: createRedisConnection() });

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

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    return job;
  }

  getQueue(): Queue<JobData> {
    return this.queue;
  }

  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
  }
}
