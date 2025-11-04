import { FirestoreService } from '../../services/firestore.service';
import { JobStatus, ProcessingStep } from '../../types/job.types';
import { PROGRESS } from '../../constants';

// Mock Firestore
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  set: mockSet,
  update: mockUpdate,
  get: mockGet,
}));
const mockOrderBy = jest.fn();
const mockOffset = jest.fn();
const mockLimit = jest.fn();
const mockCount = jest.fn();
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  orderBy: mockOrderBy,
  count: mockCount,
}));

const mockFirestore = {
  collection: mockCollection,
} as any;

// Mock getFirestore
jest.mock('../../config/firebase', () => ({
  getFirestore: jest.fn(() => mockFirestore),
}));

describe('FirestoreService', () => {
  let service: FirestoreService;

  beforeEach(() => {
    service = new FirestoreService(mockFirestore);
    jest.clearAllMocks();
    mockOrderBy.mockReturnValue({
      offset: mockOffset,
      count: mockCount,
    });
    mockOffset.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      get: mockGet,
    });
    mockCount.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: () => ({ count: 0 }),
      }),
    });
  });

  describe('createJob', () => {
    it('Should create a job in Firestore', async () => {
      await service.createJob('job-123', 'https://example.com/image.jpg');

      expect(mockCollection).toHaveBeenCalledWith('jobs');
      expect(mockDoc).toHaveBeenCalledWith('job-123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-123',
          imageUrl: 'https://example.com/image.jpg',
          status: JobStatus.PENDING,
          progress: PROGRESS.PENDING,
        })
      );
    });

    it('Should set createdAt and updatedAt timestamps', async () => {
      const beforeCreate = new Date();
      await service.createJob('job-123', 'https://example.com/image.jpg');
      const afterCreate = new Date();

      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.createdAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
      expect(callArgs.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(callArgs.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
    });
  });

  describe('updateJobStatus', () => {
    it('Should update job status with all fields', async () => {
      await service.updateJobStatus(
        'job-123',
        JobStatus.PROCESSING,
        50,
        ProcessingStep.TRANSFORM,
        undefined,
        'https://example.com/result.jpg'
      );

      expect(mockCollection).toHaveBeenCalledWith('jobs');
      expect(mockDoc).toHaveBeenCalledWith('job-123');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.PROCESSING,
          progress: 50,
          step: ProcessingStep.TRANSFORM,
          resultUrl: 'https://example.com/result.jpg',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('Should update job status with error', async () => {
      await service.updateJobStatus(
        'job-123',
        JobStatus.FAILED,
        0,
        undefined,
        'Processing failed'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.FAILED,
          progress: 0,
          error: 'Processing failed',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('Should only include defined optional fields', async () => {
      await service.updateJobStatus('job-123', JobStatus.UPLOADING, 75);

      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('step');
      expect(callArgs).not.toHaveProperty('error');
      expect(callArgs).not.toHaveProperty('resultUrl');
    });
  });

  describe('getJob', () => {
    it('Should return a job by id', async () => {
      const mockJobData = {
        jobId: 'job-123',
        status: JobStatus.COMPLETED,
        progress: 100,
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-02') },
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockJobData,
      });

      const result = await service.getJob('job-123');

      expect(mockCollection).toHaveBeenCalledWith('jobs');
      expect(mockDoc).toHaveBeenCalledWith('job-123');
      expect(result).toEqual({
        ...mockJobData,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
    });

    it('Should return null when job does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await service.getJob('non-existent');

      expect(result).toBeNull();
    });

    it('Should handle timestamps that are already Date objects', async () => {
      const createdDate = new Date('2024-01-01');
      const updatedDate = new Date('2024-01-02');

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          jobId: 'job-123',
          createdAt: createdDate,
          updatedAt: updatedDate,
        }),
      });

      const result = await service.getJob('job-123');

      expect(result?.createdAt).toBe(createdDate);
      expect(result?.updatedAt).toBe(updatedDate);
    });
  });

  describe('getAllJobs', () => {
    it('Should return paginated jobs with default params', async () => {
      const mockDocs = [
        {
          data: () => ({
            jobId: 'job-1',
            status: JobStatus.COMPLETED,
            createdAt: { toDate: () => new Date('2024-01-01') },
            updatedAt: { toDate: () => new Date('2024-01-01') },
          }),
        },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });
      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 1 }),
        }),
      });

      const result = await service.getAllJobs();

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(result.data).toHaveLength(1);
    });

    it('Should handle custom pagination params', async () => {
      mockGet.mockResolvedValue({ docs: [] });
      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 100 }),
        }),
      });

      const result = await service.getAllJobs(3, 10);

      expect(mockOffset).toHaveBeenCalledWith(20); // (page 3 - 1) * 10
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('Should enforce max limit of 100', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await service.getAllJobs(1, 200);

      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('Should normalize negative page numbers to 1', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await service.getAllJobs(-5, 20);

      expect(mockOffset).toHaveBeenCalledWith(0);
    });

    it('Should convert Firestore timestamps to Date objects', async () => {
      const mockDocs = [
        {
          data: () => ({
            jobId: 'job-1',
            createdAt: { toDate: () => new Date('2024-01-01') },
            updatedAt: { toDate: () => new Date('2024-01-02') },
          }),
        },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await service.getAllJobs();

      expect(result.data[0].createdAt).toEqual(new Date('2024-01-01'));
      expect(result.data[0].updatedAt).toEqual(new Date('2024-01-02'));
    });
  });
});
