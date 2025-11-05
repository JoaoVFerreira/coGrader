import request from 'supertest';
import express, { Express } from 'express';
import { createMockQueueService } from '../utils/test-helpers';
import { createJobsRouter } from '../../routes/jobs.routes';
import { errorHandler } from '../../middlewares/error.middleware';

// Mock Firestore Service
const mockFirestoreService = {
  createJob: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn(),
  getAllJobs: jest.fn(),
  updateJobStatus: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../services/firestore.service', () => ({
  FirestoreService: jest.fn().mockImplementation(() => mockFirestoreService),
}));

describe('Jobs API Integration Tests', () => {
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

  describe('POST /api/jobs - Valid Image URLs', () => {
    it('should create job with valid PNG URL', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: 'https://example.com/image.png' })
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('message', 'Job created successfully');
      expect(mockFirestoreService.createJob).toHaveBeenCalledWith(
        expect.any(String),
        'https://example.com/image.png'
      );
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        expect.any(String),
        'https://example.com/image.png'
      );
    });

    it('should create job with valid JPG URL', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: 'https://example.com/image.jpg' })
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should create job with valid JPEG URL', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: 'https://example.com/image.jpeg' })
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'pending');
    });
  });

  describe('POST /api/jobs - Invalid URLs', () => {
    it('should reject missing imageUrl', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid URL format', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: 'not-a-valid-url' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject empty string', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({ imageUrl: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return job details when job exists', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      mockFirestoreService.getJob.mockResolvedValueOnce({
        id: jobId,
        imageUrl: 'https://example.com/image.jpg',
        status: 'processing',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', jobId);
      expect(response.body).toHaveProperty('status', 'processing');
      expect(mockFirestoreService.getJob).toHaveBeenCalledWith(jobId);
    });

    it('should return 404 when job does not exist', async () => {
      const nonExistentJobId = '550e8400-e29b-41d4-a716-446655440001';
      mockFirestoreService.getJob.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/jobs/${nonExistentJobId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/jobs', () => {
    it('should return all jobs', async () => {
      mockFirestoreService.getAllJobs.mockResolvedValueOnce({
        jobs: [
          {
            id: 'job-1',
            imageUrl: 'https://example.com/1.jpg',
            status: 'completed',
            progress: 100,
          },
          {
            id: 'job-2',
            imageUrl: 'https://example.com/2.jpg',
            status: 'processing',
            progress: 50,
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      });

      const response = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(response.body.jobs).toHaveLength(2);
      expect(response.body).toHaveProperty('total', 2);
    });

    it('should support pagination', async () => {
      await request(app)
        .get('/api/jobs?page=2&limit=5')
        .expect(200);

      expect(mockFirestoreService.getAllJobs).toHaveBeenCalledWith(2, 5);
    });
  });
});
