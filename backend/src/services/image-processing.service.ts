import axios from 'axios';
import sharp from 'sharp';
import { logger } from '../config/logger';
import { getStorage } from '../config/firebase';
import { FirestoreService } from './firestore.service';
import { JobStatus, ProcessingStep } from '../types/job.types';
import { TIMEOUT, PROGRESS, IMAGE, STORAGE } from '../constants';

export class ImageProcessingService {
  private firestoreService: FirestoreService;

  constructor(firestoreService?: FirestoreService) {
    this.firestoreService = firestoreService || new FirestoreService();
  }

  async processImage(jobId: string, imageUrl: string): Promise<string> {
    try {
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        PROGRESS.DOWNLOAD,
        ProcessingStep.DOWNLOAD
      );

      const imageBuffer = await this.downloadImage(imageUrl);
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        PROGRESS.TRANSFORM,
        ProcessingStep.TRANSFORM
      );

      const processedBuffer = await this.transformImage(imageBuffer);
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.UPLOADING,
        PROGRESS.UPLOAD,
        ProcessingStep.UPLOAD
      );

      const resultUrl = await this.uploadToFirebase(jobId, processedBuffer);
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.COMPLETED,
        PROGRESS.COMPLETE,
        ProcessingStep.COMPLETE,
        undefined,
        resultUrl
      );
      logger.info('Job completed successfully', { jobId, resultUrl });

      return resultUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error processing image', { jobId, error: errorMessage });

      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        PROGRESS.PENDING,
        undefined,
        errorMessage
      );

      throw error;
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT.DOWNLOAD,
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transformImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processedImage = await sharp(imageBuffer)
        .resize(IMAGE.MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .grayscale()
        .jpeg({ quality: IMAGE.QUALITY })
        .toBuffer();

      const watermarkedImage = await sharp(processedImage)
        .composite([
          {
            input: Buffer.from(
              `<svg width="${IMAGE.WATERMARK.WIDTH}" height="${IMAGE.WATERMARK.HEIGHT}">
                <style>
                  .watermark { fill: ${IMAGE.WATERMARK.COLOR}; font-size: ${IMAGE.WATERMARK.FONT_SIZE}px; font-family: Arial, sans-serif; font-weight: bold; }
                </style>
                <text x="10" y="35" class="watermark">${IMAGE.WATERMARK.TEXT}</text>
              </svg>`
            ),
            gravity: 'southeast',
          },
        ])
        .toBuffer();

      return watermarkedImage;
    } catch (error) {
      throw new Error(`Failed to transform image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadToFirebase(jobId: string, imageBuffer: Buffer): Promise<string> {
    try {
      const bucket = getStorage().bucket();
      const fileName = `${STORAGE.PROCESSED_FOLDER}/${jobId}${STORAGE.FILE_EXTENSION}`;
      const file = bucket.file(fileName);

      const uploadPromise = file.save(imageBuffer, {
        metadata: {
          contentType: `image/${IMAGE.FORMAT}`,
          metadata: {
            jobId,
            processedAt: new Date().toISOString(),
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Upload timeout exceeded'));
        }, TIMEOUT.UPLOAD);
      });

      await Promise.race([uploadPromise, timeoutPromise]);
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return publicUrl;
    } catch (error) {
      throw new Error(`Failed to upload to Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
