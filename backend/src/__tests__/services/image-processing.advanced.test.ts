import axios from 'axios';
import sharp from 'sharp';
import { ImageProcessingService } from '../../services/image-processing.service';
import {
  createMockFirestoreService,
  createValidPNGBuffer,
  createValidJPGBuffer,
  createMockImageBuffer,
} from '../utils/test-helpers';
import { JobStatus } from '../../types/job.types';

// Mock dependencies
jest.mock('axios');
jest.mock('sharp');
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
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

describe('ImageProcessingService - Advanced Tests', () => {
  let service: ImageProcessingService;
  let mockFirestoreService: ReturnType<typeof createMockFirestoreService>;
  let mockSharp: any;

  beforeEach(() => {
    mockFirestoreService = createMockFirestoreService();
    service = new ImageProcessingService(mockFirestoreService as any);

    // Setup sharp mock
    mockSharp = {
      resize: jest.fn().mockReturnThis(),
      grayscale: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
      composite: jest.fn().mockReturnThis(),
    };
    (sharp as any).mockReturnValue(mockSharp);

    // Setup Firebase mock
    const mockFile = {
      save: jest.fn().mockResolvedValue(undefined),
      makePublic: jest.fn().mockResolvedValue(undefined),
    };
    mockBucket.file.mockReturnValue(mockFile);

    jest.clearAllMocks();
  });

  describe('Valid Image URLs (PNG, JPG)', () => {
    it('should successfully process a PNG image from valid URL', async () => {
      const jobId = 'test-png-123';
      const imageUrl = 'https://example.com/test-image.png';
      const pngBuffer = createValidPNGBuffer();

      (axios.get as jest.Mock).mockResolvedValue({
        data: pngBuffer,
        status: 200,
        headers: { 'content-type': 'image/png' },
      });

      const resultUrl = await service.processImage(jobId, imageUrl);

      expect(axios.get).toHaveBeenCalledWith(
        imageUrl,
        expect.objectContaining({
          responseType: 'arraybuffer',
        })
      );
      expect(sharp).toHaveBeenCalledWith(pngBuffer);
      expect(mockFirestoreService.updateJobStatus).toHaveBeenLastCalledWith(
        jobId,
        JobStatus.COMPLETED,
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.stringContaining('storage.googleapis.com')
      );
      expect(resultUrl).toContain('test-bucket');
    });

    it('should successfully process a JPG image from valid URL', async () => {
      const jobId = 'test-jpg-456';
      const imageUrl = 'https://example.com/test-image.jpg';
      const jpgBuffer = createValidJPGBuffer();

      (axios.get as jest.Mock).mockResolvedValue({
        data: jpgBuffer,
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });

      const resultUrl = await service.processImage(jobId, imageUrl);

      expect(sharp).toHaveBeenCalledWith(jpgBuffer);
      expect(resultUrl).toBeDefined();
      expect(mockFirestoreService.updateJobStatus).toHaveBeenLastCalledWith(
        jobId,
        JobStatus.COMPLETED,
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(String)
      );
    });

    it('should handle JPEG extension correctly', async () => {
      const jobId = 'test-jpeg-789';
      const imageUrl = 'https://example.com/test-image.jpeg';
      const jpegBuffer = createValidJPGBuffer();

      (axios.get as jest.Mock).mockResolvedValue({
        data: jpegBuffer,
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });

      await service.processImage(jobId, imageUrl);

      expect(axios.get).toHaveBeenCalledWith(imageUrl, expect.any(Object));
      expect(sharp).toHaveBeenCalled();
    });
  });

  describe('Invalid URL (404)', () => {
    it('should handle 404 error gracefully', async () => {
      const jobId = 'test-404';
      const imageUrl = 'https://example.com/non-existent-image.jpg';

      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 404 },
        message: 'Request failed with status code 404',
        isAxiosError: true,
      });

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to download image'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.stringContaining('Failed to download image')
      );
    });

    it('should handle 403 Forbidden error', async () => {
      const jobId = 'test-403';
      const imageUrl = 'https://example.com/forbidden-image.jpg';

      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 403 },
        message: 'Request failed with status code 403',
      });

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.any(String)
      );
    });

    it('should handle DNS resolution failure', async () => {
      const jobId = 'test-dns-error';
      const imageUrl = 'https://non-existent-domain-xyz123.com/image.jpg';

      (axios.get as jest.Mock).mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND non-existent-domain-xyz123.com',
      });

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();
      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.any(String)
      );
    });
  });

  describe('Non-Image URL', () => {
    it('should fail when URL returns HTML content', async () => {
      const jobId = 'test-html';
      const imageUrl = 'https://example.com/page.html';

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('<!DOCTYPE html><html><body>Not an image</body></html>'),
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      mockSharp.toBuffer = jest
        .fn()
        .mockRejectedValue(new Error('Input buffer contains unsupported image format'));

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to transform image'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.stringContaining('Failed to transform image')
      );
    });

    it('should fail when URL returns JSON data', async () => {
      const jobId = 'test-json';
      const imageUrl = 'https://api.example.com/data';

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from(JSON.stringify({ error: 'Not an image' })),
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      mockSharp.toBuffer = jest
        .fn()
        .mockRejectedValue(new Error('Input buffer contains unsupported image format'));

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();
      expect(mockFirestoreService.updateJobStatus).toHaveBeenLastCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.any(String)
      );
    });

    it('should fail when URL returns plain text', async () => {
      const jobId = 'test-text';
      const imageUrl = 'https://example.com/text-file.txt';

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('This is just plain text, not an image'),
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });

      mockSharp.toBuffer = jest
        .fn()
        .mockRejectedValue(new Error('Input buffer contains unsupported image format'));

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();
    });

    it('should fail when URL returns PDF', async () => {
      const jobId = 'test-pdf';
      const imageUrl = 'https://example.com/document.pdf';

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('%PDF-1.4 fake pdf content'),
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });

      mockSharp.toBuffer = jest
        .fn()
        .mockRejectedValue(new Error('Input buffer contains unsupported image format'));

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();
    });
  });

  describe('Very Large Image (>10MB)', () => {
    it('should process a 12MB image successfully', async () => {
      const jobId = 'test-large-12mb';
      const imageUrl = 'https://example.com/large-image-12mb.jpg';
      const largeBuffer = createMockImageBuffer(12); // 12MB

      (axios.get as jest.Mock).mockResolvedValue({
        data: largeBuffer,
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });

      await service.processImage(jobId, imageUrl);

      expect(sharp).toHaveBeenCalledWith(largeBuffer);
      expect(mockFirestoreService.updateJobStatus).toHaveBeenLastCalledWith(
        jobId,
        JobStatus.COMPLETED,
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(String)
      );
    });

    it('should process a 15MB image successfully', async () => {
      const jobId = 'test-large-15mb';
      const imageUrl = 'https://example.com/large-image-15mb.jpg';
      const largeBuffer = createMockImageBuffer(15); // 15MB

      (axios.get as jest.Mock).mockResolvedValue({
        data: largeBuffer,
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });

      const resultUrl = await service.processImage(jobId, imageUrl);

      expect(resultUrl).toBeDefined();
      expect(mockSharp.resize).toHaveBeenCalledWith(
        expect.any(Number),
        null,
        expect.objectContaining({
          fit: 'inside',
          withoutEnlargement: true,
        })
      );
    });

    it('should handle download timeout for very large image', async () => {
      const jobId = 'test-timeout';
      const imageUrl = 'https://example.com/extremely-large-image.jpg';

      (axios.get as jest.Mock).mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow(
        'Failed to download image'
      );

      expect(mockFirestoreService.updateJobStatus).toHaveBeenLastCalledWith(
        jobId,
        JobStatus.FAILED,
        expect.any(Number),
        undefined,
        expect.stringContaining('Failed to download image')
      );
    });

    it('should handle processing timeout for large image', async () => {
      const jobId = 'test-processing-timeout';
      const imageUrl = 'https://example.com/large-image.jpg';
      const largeBuffer = createMockImageBuffer(20);

      (axios.get as jest.Mock).mockResolvedValue({
        data: largeBuffer,
        status: 200,
      });

      // Simulate slow processing
      mockSharp.toBuffer = jest.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Processing timeout')), 100)
        )
      );

      await expect(service.processImage(jobId, imageUrl)).rejects.toThrow();
    });
  });
});
