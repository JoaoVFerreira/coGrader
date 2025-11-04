import { Request, Response } from 'express';
import { JobsController } from '../../controllers/jobs.controller';
import { QueueService } from '../../services/queue.service';
import { FirestoreService } from '../../services/firestore.service';
import { JobStatus } from '../../types/job.types';
import { AppError } from '../../middlewares/error.middleware';
import { StatusCodes } from 'http-status-codes';

// Mock dependencies
jest.mock('../../services/queue.service');
jest.mock('../../services/firestore.service');
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

describe('JobsController', () => {
  let controller: JobsController;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockFirestoreService: jest.Mocked<FirestoreService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mocks
    mockQueueService = {
      addJob: jest.fn(),
      close: jest.fn(),
    } as any;

    mockFirestoreService = {
      createJob: jest.fn(),
      getJob: jest.fn(),
      getAllJobs: jest.fn(),
      updateJobStatus: jest.fn(),
    } as any;

    // Create controller with mocked dependencies
    controller = new JobsController(mockQueueService, mockFirestoreService);

    // Setup mock request and response
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('Should create a job successfully', async () => {
      mockRequest.body = { imageUrl: 'https://example.com/image.jpg' };

      await controller.createJob(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockFirestoreService.createJob).toHaveBeenCalledWith(
        'test-uuid-1234',
        'https://example.com/image.jpg'
      );
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'test-uuid-1234',
        'https://example.com/image.jpg'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        jobId: 'test-uuid-1234',
        status: JobStatus.PENDING,
        message: 'Job created successfully',
      });
    });

    it('Should handle firestore errors', async () => {
      mockRequest.body = { imageUrl: 'https://example.com/image.jpg' };
      mockFirestoreService.createJob.mockRejectedValue(new Error('Firestore error'));

      await expect(
        controller.createJob(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Firestore error');
    });

    it('Should handle queue errors', async () => {
      mockRequest.body = { imageUrl: 'https://example.com/image.jpg' };
      mockQueueService.addJob.mockRejectedValue(new Error('Queue error'));

      await expect(
        controller.createJob(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Queue error');
    });
  });

  describe('getJob', () => {
    it('Should return a job by id', async () => {
      const mockJob = {
        jobId: 'test-uuid-1234',
        status: JobStatus.COMPLETED,
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: 'test-uuid-1234' };
      mockFirestoreService.getJob.mockResolvedValue(mockJob);

      await controller.getJob(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response
      );

      expect(mockFirestoreService.getJob).toHaveBeenCalledWith('test-uuid-1234');
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockJob);
    });

    it('Should throw AppError when job not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };
      mockFirestoreService.getJob.mockResolvedValue(null);

      await expect(
        controller.getJob(
          mockRequest as Request<{ id: string }>,
          mockResponse as Response
        )
      ).rejects.toThrow(AppError);

      await expect(
        controller.getJob(
          mockRequest as Request<{ id: string }>,
          mockResponse as Response
        )
      ).rejects.toMatchObject({
        message: 'Job not found',
        statusCode: StatusCodes.NOT_FOUND,
        code: 'JOB_NOT_FOUND',
      });
    });

    it('Should handle firestore errors when getting job', async () => {
      mockRequest.params = { id: 'test-uuid-1234' };
      mockFirestoreService.getJob.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getJob(
          mockRequest as Request<{ id: string }>,
          mockResponse as Response
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAllJobs', () => {
    it('Should return paginated jobs with default params', async () => {
      const mockPaginatedResponse = {
        data: [
          {
            jobId: 'job-1',
            status: JobStatus.COMPLETED,
            progress: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      mockRequest.query = {};
      mockFirestoreService.getAllJobs.mockResolvedValue(mockPaginatedResponse);

      await controller.getAllJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockFirestoreService.getAllJobs).toHaveBeenCalledWith(
        undefined,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('Should return paginated jobs with custom params', async () => {
      const mockPaginatedResponse = {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: true,
        },
      };

      mockRequest.query = { page: '2', limit: '10' };
      mockFirestoreService.getAllJobs.mockResolvedValue(mockPaginatedResponse);

      await controller.getAllJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockFirestoreService.getAllJobs).toHaveBeenCalledWith(2, 10);
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('Should handle firestore errors when getting all jobs', async () => {
      mockRequest.query = {};
      mockFirestoreService.getAllJobs.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        controller.getAllJobs(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });
  });
});
