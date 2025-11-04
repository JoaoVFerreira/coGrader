import { QueueService } from '../../services/queue.service';
import { Queue, QueueEvents } from 'bullmq';
import { QUEUE } from '../../constants';

// Mock BullMQ
jest.mock('bullmq');
jest.mock('../../config/redis', () => ({
  createRedisConnection: jest.fn(() => ({
    host: 'localhost',
    port: 6379,
  })),
}));
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: jest.Mocked<Queue>;
  let mockQueueEvents: jest.Mocked<QueueEvents>;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn(),
      close: jest.fn(),
    } as any;

    mockQueueEvents = {
      close: jest.fn(),
    } as any;

    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(
      () => mockQueue
    );
    (QueueEvents as jest.MockedClass<typeof QueueEvents>).mockImplementation(
      () => mockQueueEvents
    );

    service = new QueueService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('Should initialize Queue with correct configuration', () => {
      expect(Queue).toHaveBeenCalledWith(
        QUEUE.NAME,
        expect.objectContaining({
          connection: expect.any(Object),
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
        })
      );
    });

    it('Should initialize QueueEvents with same connection', () => {
      expect(QueueEvents).toHaveBeenCalledWith(
        QUEUE.NAME,
        expect.objectContaining({
          connection: expect.any(Object),
        })
      );
    });
  });

  describe('addJob', () => {
    it('Should add a job to the queue', async () => {
      const jobId = 'test-job-123';
      const imageUrl = 'https://example.com/image.jpg';

      await service.addJob(jobId, imageUrl);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'processImage',
        {
          jobId,
          imageUrl,
        },
        {
          jobId,
        }
      );
    });

    it('Should handle queue errors', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(
        service.addJob('job-123', 'https://example.com/image.jpg')
      ).rejects.toThrow('Queue error');
    });
  });

  describe('close', () => {
    it('Should close both queue and queueEvents', async () => {
      await service.close();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockQueueEvents.close).toHaveBeenCalled();
    });

    it('Should handle close errors', async () => {
      mockQueue.close.mockRejectedValue(new Error('Close error'));

      await expect(service.close()).rejects.toThrow('Close error');
    });
  });
});
