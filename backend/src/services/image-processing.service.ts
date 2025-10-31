import axios from 'axios';
import sharp from 'sharp';
import { logger } from '../config/logger';
import { getStorage } from '../config/firebase';
import { FirestoreService } from './firestore.service';
import { JobStatus, ProcessingStep } from '../types/job.types';

export class ImageProcessingService {
  private firestoreService: FirestoreService;

  constructor() {
    this.firestoreService = new FirestoreService();
  }

  async processImage(jobId: string, imageUrl: string): Promise<string> {
    try {
      // Step 1: Download image
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        25,
        ProcessingStep.DOWNLOAD
      );
      logger.info('Downloading image', { jobId, imageUrl });

      const imageBuffer = await this.downloadImage(imageUrl);
      logger.info('Image downloaded successfully', { jobId });

      // Step 2: Transform image
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        50,
        ProcessingStep.TRANSFORM
      );
      logger.info('Transforming image', { jobId });

      const processedBuffer = await this.transformImage(imageBuffer);
      logger.info('Image transformed successfully', { jobId });

      // Step 3: Upload to Firebase Storage
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.UPLOADING,
        75,
        ProcessingStep.UPLOAD
      );
      logger.info('Uploading to Firebase Storage', { jobId });

      const resultUrl = await this.uploadToFirebase(jobId, processedBuffer);
      logger.info('Image uploaded successfully', { jobId, resultUrl });

      // Step 4: Complete
      await this.firestoreService.updateJobStatus(
        jobId,
        JobStatus.COMPLETED,
        100,
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
        0,
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
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transformImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Apply multiple transformations:
      // 1. Resize to max 1200px width
      // 2. Convert to grayscale
      // 3. Add a watermark text
      const processedImage = await sharp(imageBuffer)
        .resize(1200, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .grayscale()
        .jpeg({ quality: 85 })
        .toBuffer();

      // Add watermark
      const watermarkedImage = await sharp(processedImage)
        .composite([
          {
            input: Buffer.from(
              `<svg width="300" height="50">
                <style>
                  .watermark { fill: rgba(255, 255, 255, 0.5); font-size: 24px; font-family: Arial; }
                </style>
                <text x="10" y="35" class="watermark">Processed by coGrader</text>
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
      const fileName = `processed/${jobId}.jpg`;
      const file = bucket.file(fileName);

      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            jobId,
            processedAt: new Date().toISOString(),
          },
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return publicUrl;
    } catch (error) {
      throw new Error(`Failed to upload to Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
