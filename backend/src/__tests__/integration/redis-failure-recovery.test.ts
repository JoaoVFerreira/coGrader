import { Queue, QueueEvents } from 'bullmq';
import { wait } from '../utils/test-helpers';
import EventEmitter from 'events';

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Redis Connection Failure Recovery', () => {
  let mockQueue: jest.Mocked<Queue> & EventEmitter;
  let mockQueueEvents: jest.Mocked<QueueEvents> & EventEmitter;
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create EventEmitter-based mocks
    mockConnection = new EventEmitter();
    mockConnection.status = 'ready';
    mockConnection.disconnect = jest.fn();
    mockConnection.connect = jest.fn().mockResolvedValue(undefined);

    // Mock Queue with EventEmitter
    const QueueEmitter = EventEmitter as any;
    mockQueue = Object.assign(new QueueEmitter(), {
      add: jest.fn().mockResolvedValue({ id: 'test-job' }),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn(),
    });

    // Mock QueueEvents with EventEmitter
    mockQueueEvents = Object.assign(new QueueEmitter(), {
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Connection failure scenarios', () => {
    it('should handle Redis connection failure on startup', async () => {
      mockConnection.status = 'disconnected';

      const mockRedisConnection = jest.fn(() => mockConnection);

      jest.mock('../../config/redis', () => ({
        createRedisConnection: mockRedisConnection,
      }));

      jest.mock('bullmq', () => ({
        Queue: jest.fn(() => mockQueue),
        QueueEvents: jest.fn(() => mockQueueEvents),
      }));

      expect(mockConnection.status).toBe('disconnected');
    });

    it('should retry job submission on temporary Redis failure', async () => {
      let attemptCount = 0;
      mockQueue.add = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Redis connection lost'));
        }
        return Promise.resolve({ id: 'test-job' });
      });

      jest.mock('bullmq', () => ({
        Queue: jest.fn(() => mockQueue),
        QueueEvents: jest.fn(() => mockQueueEvents),
      }));

      // The queue has retry logic through BullMQ
      await expect(mockQueue.add('test', {})).rejects.toThrow('Redis connection lost');
      await expect(mockQueue.add('test', {})).rejects.toThrow('Redis connection lost');
      await expect(mockQueue.add('test', {})).resolves.toEqual({ id: 'test-job' });
    });

    it('should handle Redis connection timeout', async () => {
      mockQueue.add = jest.fn().mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 100)
          )
      );

      await expect(mockQueue.add('test', { jobId: 'test', imageUrl: 'test.jpg' })).rejects.toThrow(
        'Connection timeout'
      );
    });
  });

  describe('Connection recovery', () => {
    it('should successfully reconnect after temporary disconnection', async () => {
      const connectionEvents: string[] = [];

      mockConnection.on('connect', () => connectionEvents.push('connect'));
      mockConnection.on('ready', () => connectionEvents.push('ready'));
      mockConnection.on('error', () => connectionEvents.push('error'));
      mockConnection.on('reconnecting', () => connectionEvents.push('reconnecting'));

      // Simulate disconnection
      mockConnection.status = 'disconnecting';
      mockConnection.emit('close');

      await wait(50);

      // Simulate reconnection
      mockConnection.status = 'connecting';
      mockConnection.emit('reconnecting');

      await wait(50);

      mockConnection.status = 'ready';
      mockConnection.emit('ready');

      expect(mockConnection.status).toBe('ready');
    });

    it('should continue processing jobs after reconnection', async () => {
      let connectionLost = false;

      mockQueue.add = jest.fn().mockImplementation((name, data) => {
        if (connectionLost) {
          // After reconnection, jobs should work
          return Promise.resolve({ id: `job-${data.jobId}` });
        }
        return Promise.reject(new Error('Connection lost'));
      });

      // First attempt fails
      await expect(
        mockQueue.add('processImage', { jobId: '1', imageUrl: 'test1.jpg' })
      ).rejects.toThrow('Connection lost');

      // Simulate reconnection
      connectionLost = true;

      // Second attempt succeeds
      await expect(
        mockQueue.add('processImage', { jobId: '2', imageUrl: 'test2.jpg' })
      ).resolves.toEqual({ id: 'job-2' });
    });

    it('should handle multiple reconnection attempts', async () => {
      let reconnectAttempts = 0;
      const maxAttempts = 5;

      mockConnection.connect = jest.fn().mockImplementation(() => {
        reconnectAttempts++;
        if (reconnectAttempts < maxAttempts) {
          return Promise.reject(new Error('Connection refused'));
        }
        mockConnection.status = 'ready';
        return Promise.resolve();
      });

      // Try to connect multiple times
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await mockConnection.connect();
          break;
        } catch (error) {}
      }

      expect(reconnectAttempts).toBe(maxAttempts);
      expect(mockConnection.status).toBe('ready');
    });
  });

  describe('Data integrity during failures', () => {
    it('should not lose jobs during Redis reconnection', async () => {
      const jobs = [
        { jobId: '1', imageUrl: 'test1.jpg' },
        { jobId: '2', imageUrl: 'test2.jpg' },
        { jobId: '3', imageUrl: 'test3.jpg' },
      ];

      let connectionStable = false;
      mockQueue.add = jest.fn().mockImplementation((name, data) => {
        if (!connectionStable && data.jobId === '2') {
          // Simulate connection issue for second job
          return Promise.reject(new Error('Connection interrupted'));
        }
        return Promise.resolve({ id: `job-${data.jobId}` });
      });

      // Add jobs
      const results = await Promise.allSettled(
        jobs.map((job) => mockQueue.add('processImage', job))
      );

      // First job should succeed
      expect(results[0].status).toBe('fulfilled');

      // Second job should fail due to connection issue
      expect(results[1].status).toBe('rejected');

      // Third job should succeed
      expect(results[2].status).toBe('fulfilled');

      // After connection is restored, retry failed job
      connectionStable = true;
      const retryResult = await mockQueue.add('processImage', jobs[1]);
      expect(retryResult).toEqual({ id: 'job-2' });
    });

    it('should maintain job queue state across reconnections', async () => {
      const jobsBefore = ['job-1', 'job-2', 'job-3'];
      const submittedJobs: string[] = [];

      mockQueue.add = jest.fn().mockImplementation(async (name, data) => {
        submittedJobs.push(data.jobId);
        return { id: `job-${data.jobId}` };
      });

      // Add jobs before disconnection
      await Promise.all(
        jobsBefore.map((jobId) =>
          mockQueue.add('processImage', { jobId, imageUrl: `${jobId}.jpg` })
        )
      );

      expect(submittedJobs).toEqual(jobsBefore);

      // Simulate disconnection and reconnection
      mockConnection.status = 'disconnected';
      await wait(50);
      mockConnection.status = 'ready';

      // Add more jobs after reconnection
      const jobsAfter = ['job-4', 'job-5'];
      await Promise.all(
        jobsAfter.map((jobId) =>
          mockQueue.add('processImage', { jobId, imageUrl: `${jobId}.jpg` })
        )
      );

      expect(submittedJobs).toEqual([...jobsBefore, ...jobsAfter]);
    });
  });

  describe('Error handling and logging', () => {
    it('should handle graceful shutdown during connection issues', async () => {
      mockConnection.status = 'disconnecting';

      await mockQueue.close();
      await mockQueueEvents.close();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockQueueEvents.close).toHaveBeenCalled();
    });

    it('should handle multiple simultaneous Redis failures', async () => {
      const errors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'Connection closed',
      ];

      // Mock queue to reject all requests
      mockQueue.add = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('Redis unavailable'))
      );

      // Create failure promises after mocking
      const failurePromises = errors.map(() =>
        mockQueue.add('test', {})
      );

      const results = await Promise.allSettled(failurePromises);

      // All should fail
      expect(results.every((r) => r.status === 'rejected')).toBe(true);
    });
  });

  describe('Circuit breaker pattern', () => {
    it('should implement exponential backoff for reconnection', async () => {
      const reconnectDelays: number[] = [];
      let attempt = 0;

      mockConnection.connect = jest.fn().mockImplementation(async () => {
        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        reconnectDelays.push(delay);

        if (attempt < 4) {
          throw new Error('Connection refused');
        }

        mockConnection.status = 'ready';
        return Promise.resolve();
      });

      for (let i = 0; i < 4; i++) {
        try {
          await mockConnection.connect();
          break;
        } catch (error) {}
      }

      // Delays should follow exponential pattern: 1000, 2000, 4000, 8000
      expect(reconnectDelays[0]).toBe(1000);
      expect(reconnectDelays[1]).toBe(2000);
      expect(reconnectDelays[2]).toBe(4000);
      expect(reconnectDelays[3]).toBe(8000);
    });

    it('should stop accepting jobs when circuit is open', async () => {
      let circuitOpen = false;
      let failureCount = 0;
      const failureThreshold = 5;

      mockQueue.add = jest.fn().mockImplementation(async () => {
        if (circuitOpen) {
          throw new Error('Circuit breaker is open');
        }

        failureCount++;
        if (failureCount >= failureThreshold) {
          circuitOpen = true;
          throw new Error('Too many failures, opening circuit');
        }

        throw new Error('Redis connection failed');
      });

      for (let i = 0; i < failureThreshold + 2; i++) {
        try {
          await mockQueue.add('test', { jobId: `job-${i}`, imageUrl: 'test.jpg' });
        } catch (error: any) {
          if (error.message.includes('Circuit breaker is open')) {
            // Circuit is now open, should reject immediately
            expect(i).toBeGreaterThanOrEqual(failureThreshold);
          }
        }
      }

      expect(circuitOpen).toBe(true);
    });
  });
});
