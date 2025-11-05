import request from 'supertest';
import express, { Express } from 'express';
import { createMockQueueService, wait } from '../utils/test-helpers';
import { createJobsRouter } from '../../routes/jobs.routes';
import { errorHandler } from '../../middlewares/error.middleware';

// Mock Firestore Service
const mockFirestoreService = {
  createJob: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn().mockResolvedValue({
    id: '550e8400-e29b-41d4-a716-446655440000',
    imageUrl: 'https://example.com/image.jpg',
    status: 'processing',
    progress: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getAllJobs: jest.fn().mockResolvedValue({
    jobs: [],
    total: 0,
    page: 1,
    limit: 10,
  }),
  updateJobStatus: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../services/firestore.service', () => ({
  FirestoreService: jest.fn().mockImplementation(() => mockFirestoreService),
}));

describe('Multiple Simultaneous Job Submissions', () => {
  let app: Express;
  let mockQueueService: ReturnType<typeof createMockQueueService>;

  beforeEach(() => {
    mockQueueService = createMockQueueService();

    app = express();
    app.use(express.json());

    app.use('/api/jobs', createJobsRouter(mockQueueService as any));
    app.use(errorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent job submissions', () => {
    it('should handle 5 simultaneous job submissions successfully', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg',
        'https://example.com/image5.jpg',
      ];

      const promises = imageUrls.map((imageUrl) =>
        request(app).post('/api/jobs').send({ imageUrl })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('jobId');
        expect(response.body).toHaveProperty('status', 'pending');
      });

      // Should have created 5 jobs in queue
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(5);

      // All job IDs should be unique
      const jobIds = responses.map((r) => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(5);
    });

    it('should handle 10 simultaneous job submissions successfully', async () => {
      const imageUrls = Array.from(
        { length: 10 },
        (_, i) => `https://example.com/image${i + 1}.jpg`
      );

      const promises = imageUrls.map((imageUrl) =>
        request(app).post('/api/jobs').send({ imageUrl })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      expect(responses.every((r) => r.status === 201)).toBe(true);

      // Should have added 10 jobs to queue
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(10);

      // All job IDs should be unique
      const jobIds = responses.map((r) => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(10);
    });

    it('should handle 50 simultaneous job submissions successfully', async () => {
      const imageUrls = Array.from(
        { length: 50 },
        (_, i) => `https://example.com/image${i + 1}.jpg`
      );

      const promises = imageUrls.map((imageUrl) =>
        request(app).post('/api/jobs').send({ imageUrl })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      expect(responses.every((r) => r.status === 201)).toBe(true);

      // Should have added 50 jobs to queue
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(50);

      // All job IDs should be unique
      const jobIds = responses.map((r) => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(50);
    });

    it('should handle mix of valid and invalid submissions concurrently', async () => {
      const submissions = [
        { imageUrl: 'https://example.com/valid1.jpg' }, // valid
        { imageUrl: 'invalid-url' }, // invalid
        { imageUrl: 'https://example.com/valid2.jpg' }, // valid
        { imageUrl: '' }, // invalid
        { imageUrl: 'https://example.com/valid3.jpg' }, // valid
      ];

      const promises = submissions.map((data) =>
        request(app).post('/api/jobs').send(data)
      );

      const responses = await Promise.all(promises);

      // Check status codes
      expect(responses[0].status).toBe(201); // valid
      expect(responses[1].status).toBe(400); // invalid
      expect(responses[2].status).toBe(201); // valid
      expect(responses[3].status).toBe(400); // invalid
      expect(responses[4].status).toBe(201); // valid

      // Only 3 jobs should be added to queue
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(3);
    });

    it('should maintain data integrity with concurrent submissions', async () => {
      const imageUrl1 = 'https://example.com/test1.jpg';
      const imageUrl2 = 'https://example.com/test2.jpg';

      await Promise.all([
        request(app).post('/api/jobs').send({ imageUrl: imageUrl1 }),
        request(app).post('/api/jobs').send({ imageUrl: imageUrl2 }),
      ]);

      // Check that Queue was called with correct data for both jobs
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(2);
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        expect.any(String),
        imageUrl1
      );
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        expect.any(String),
        imageUrl2
      );
    });

    it('should handle queue errors gracefully', async () => {
      // Make Queue fail for all jobs
      mockQueueService.addJob.mockRejectedValue(new Error('Queue temporarily unavailable'));

      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: 'https://example.com/image.jpg' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Sequential vs Concurrent performance', () => {
    it('concurrent submissions should be faster than sequential', async () => {
      const imageUrls = Array.from(
        { length: 10 },
        (_, i) => `https://example.com/image${i + 1}.jpg`
      );

      // Add artificial delay to Queue
      mockQueueService.addJob.mockImplementation(
        async (jobId) => {
          await wait(50);
          return { id: jobId };
        }
      );

      // Sequential timing
      const sequentialStart = Date.now();
      for (const imageUrl of imageUrls) {
        await request(app).post('/api/jobs').send({ imageUrl });
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Clear calls
      jest.clearAllMocks();

      // Concurrent timing
      const concurrentStart = Date.now();
      await Promise.all(
        imageUrls.map((imageUrl) =>
          request(app).post('/api/jobs').send({ imageUrl })
        )
      );
      const concurrentTime = Date.now() - concurrentStart;
      expect(concurrentTime).toBeLessThan(sequentialTime / 2);
    }, 10000);
  });

  describe('Race condition handling', () => {
    it('should not have race conditions with UUID generation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .post('/api/jobs')
          .send({ imageUrl: `https://example.com/image${i}.jpg` })
      );

      const responses = await Promise.all(promises);
      const jobIds = responses.map((r) => r.body.jobId);

      // All job IDs should be unique
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(100);

      // No undefined or null IDs
      expect(jobIds.every((id) => id && typeof id === 'string')).toBe(true);
    });

    it('should handle concurrent reads and writes correctly', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440002';
      mockFirestoreService.getJob.mockResolvedValue({
        id: jobId,
        imageUrl: 'https://example.com/test.jpg',
        status: 'processing',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Simulate concurrent create and read operations
      const [createResponse, getResponse] = await Promise.all([
        request(app).post('/api/jobs').send({ imageUrl: 'https://example.com/new.jpg' }),
        request(app).get(`/api/jobs/${jobId}`),
      ]);

      expect(createResponse.status).toBe(201);
      expect(getResponse.status).toBe(200);
    });
  });
});
