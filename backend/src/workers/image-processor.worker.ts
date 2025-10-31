import { Worker, Job } from 'bullmq';
import { logger } from '../config/logger';
import { createRedisConnection } from '../config/redis';
import { config } from '../config/env';
import { JobData } from '../types/job.types';
import { ImageProcessingService } from '../services/image-processing.service';

const QUEUE_NAME = 'imageProcessing';

export class ImageProcessorWorker {
  private worker: Worker<JobData>;
  private imageProcessingService: ImageProcessingService;

  constructor() {
    this.imageProcessingService = new ImageProcessingService();

    const connection = createRedisConnection();

    this.worker = new Worker<JobData>(
      QUEUE_NAME,
      async (job: Job<JobData>) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: config.worker.concurrency,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      }
    );

    this.setupEventListeners();
  }

  private async processJob(job: Job<JobData>): Promise<string> {
    const { jobId, imageUrl } = job.data;

    logger.info('Processing job', { jobId, imageUrl });

    try {
      const resultUrl = await this.imageProcessingService.processImage(jobId, imageUrl);
      logger.info('Job completed successfully', { jobId, resultUrl });
      return resultUrl;
    } catch (error) {
      logger.error('Job failed', { jobId, error });
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      logger.info('Job has completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Job has failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', { error: err });
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn('Job has stalled', { jobId });
    });

    logger.info('Worker initialized', { concurrency: config.worker.concurrency });
  }

  async close(): Promise<void> {
    await this.worker.close();
    logger.info('Worker closed');
  }

  getWorker(): Worker<JobData> {
    return this.worker;
  }
}
