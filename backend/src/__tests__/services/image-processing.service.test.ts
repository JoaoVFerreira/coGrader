import { ImageProcessingService } from '../../services/image-processing.service';
import { FirestoreService } from '../../services/firestore.service';
import { JobStatus, ProcessingStep } from '../../types/job.types';
import { PROGRESS } from '../../constants';
import axios from 'axios';
import sharp from 'sharp';

// Mock dependencies
jest.mock('axios');
jest.mock('sharp');
jest.mock('../../services/firestore.service');
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockBucket = {
  file: jest.fn(),
  name: 'test-bucket',
};

jest.mock('../../config/firebase', () => ({
  getStorage: jest.fn(() => ({
    bucket: () => mockBucket,
  })),
}));

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;
  let mockFirestoreService: jest.Mocked<FirestoreService>;

  beforeEach(() => {
    mockFirestoreService = {
      updateJobStatus: jest.fn(),
      createJob: jest.fn(),
      getJob: jest.fn(),
      getAllJobs: jest.fn(),
    } as any;

    service = new ImageProcessingService(mockFirestoreService);
    jest.clearAllMocks();
  });

  describe('processImage', () => {
    const jobId = 'test-job-123';
    const imageUrl = 'https://example.com/image.jpg';
    const mockImageBuffer = Buffer.from('mock-image-data');
    const mockProcessedBuffer = Buffer.from('processed-image-data');

    beforeEach(() => {
      // Mock axios download
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockImageBuffer,
      });

      // Mock sharp processing
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        grayscale: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockProcessedBuffer),
        composite: jest.fn().mockReturnThis(),
      };
      (sharp as any).mockReturnValue(mockSharp);

      // Mock Firebase storage
      const mockFile = {
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockFile);
    });

    it('Should process image successfully', async () => {
      const result = await service.processImage(jobId, imageUrl);

      // Should update status to PROCESSING (download)
      expect(mockFirestoreService.updateJobStatus).toHaveBeenNthCalledWith(
        1,
        jobId,
        JobStatus.PROCESSING,
        PROGRESS.DOWNLOAD,
        ProcessingStep.DOWNLOAD
      );

      // Should update status to PROCESSING (transform)
      expect(mockFirestoreService.updateJobStatus).toHaveBeenNthCalledWith(
        2,
        jobId,
        JobStatus.PROCESSING,
        PROGRESS.TRANSFORM,
        ProcessingStep.TRANSFORM
      );

      // Should update status to UPLOADING
      expect(mockFirestoreService.updateJobStatus).toHaveBeenNthCalledWith(
        3,
        jobId,
        JobStatus.UPLOADING,
        PROGRESS.UPLOAD,
        ProcessingStep.UPLOAD
      );

      // Should update status to COMPLETED
      expect(mockFirestoreService.updateJobStatus).toHaveBeenNthCalledWith(
        4,
        jobId,
        JobStatus.COMPLETED,
        PROGRESS.COMPLETE,
        ProcessingStep.COMPLETE,
        undefined,
        expect.stringContaining('test-bucket')
      );

      expect(result).toContain('test-bucket');
    });

    it('Should download image with correct timeout', async () => {
      await service.processImage(jobId, imageUrl);

      expect(axios.get).toHaveBeenCalledWith(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
    });

    it('Should handle download errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to download image'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        PROGRESS.PENDING,
        undefined,
        expect.stringContaining('Failed to download image')
      );
    });

    it('Should handle transform errors', async () => {
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        grayscale: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Sharp error')),
      };
      (sharp as any).mockReturnValue(mockSharp);

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to transform image'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        PROGRESS.PENDING,
        undefined,
        expect.stringContaining('Failed to transform image')
      );
    });

    it('Should handle upload errors', async () => {
      const mockFile = {
        save: jest.fn().mockRejectedValue(new Error('Upload error')),
        makePublic: jest.fn(),
      };
      mockBucket.file.mockReturnValue(mockFile);

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to upload to Firebase'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        PROGRESS.PENDING,
        undefined,
        expect.stringContaining('Failed to upload to Firebase')
      );
    });

    it('Should handle upload timeout', async () => {
      const mockFile = {
        save: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(resolve, 70000))
        ),
        makePublic: jest.fn(),
      };
      mockBucket.file.mockReturnValue(mockFile);

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        PROGRESS.PENDING,
        undefined,
        expect.any(String)
      );
    }, 75000);

    it('Should transform image with correct settings', async () => {
      await service.processImage(jobId, imageUrl);

      const mockSharpInstance = (sharp as unknown as jest.Mock).mock.results[0].value;

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.grayscale).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('Should add watermark to image', async () => {
      await service.processImage(jobId, imageUrl);

      // Second sharp call is for watermark
      expect(sharp).toHaveBeenCalledTimes(2);
      const watermarkCall = (sharp as unknown as jest.Mock).mock.calls[1][0];
      expect(watermarkCall).toEqual(mockProcessedBuffer);

      const mockSharpInstance = (sharp as unknown as jest.Mock).mock.results[1].value;
      expect(mockSharpInstance.composite).toHaveBeenCalledWith([
        {
          input: expect.any(Buffer),
          gravity: 'southeast',
        },
      ]);
    });

    it('Should save file with correct metadata', async () => {
      await service.processImage(jobId, imageUrl);

      const mockFile = mockBucket.file.mock.results[0].value;
      expect(mockFile.save).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          metadata: {
            contentType: 'image/jpeg',
            metadata: {
              jobId,
              processedAt: expect.any(String),
            },
          },
        })
      );
    });

    it('Should make file public after upload', async () => {
      await service.processImage(jobId, imageUrl);

      const mockFile = mockBucket.file.mock.results[0].value;
      expect(mockFile.makePublic).toHaveBeenCalled();
    });
  });
});
