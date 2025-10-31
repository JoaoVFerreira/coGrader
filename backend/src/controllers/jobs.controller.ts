import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../config/logger';
import { QueueService } from '../services/queue.service';
import { FirestoreService } from '../services/firestore.service';
import { CreateJobRequest, CreateJobResponse, JobStatus } from '../types/job.types';

export class JobsController {
  private queueService: QueueService;
  private firestoreService: FirestoreService;

  constructor(queueService: QueueService) {
    this.queueService = queueService;
    this.firestoreService = new FirestoreService();
  }

  createJob = async (req: Request<{}, {}, CreateJobRequest>, res: Response): Promise<void> => {
    try {
      const { imageUrl } = req.body;

      // Validate input
      if (!imageUrl || typeof imageUrl !== 'string') {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid request',
          message: 'imageUrl is required and must be a string',
        });
        return;
      }

      // Validate URL format
      try {
        new URL(imageUrl);
      } catch (error) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid URL',
          message: 'imageUrl must be a valid URL',
        });
        return;
      }

      // Generate job ID
      const jobId = uuidv4();

      // Create job in Firestore
      await this.firestoreService.createJob(jobId, imageUrl);

      // Add job to queue
      await this.queueService.addJob(jobId, imageUrl);

      const response: CreateJobResponse = {
        jobId,
        status: JobStatus.PENDING,
        message: 'Job created successfully',
      };

      res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
      logger.error('Error creating job', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Failed to create job',
      });
    }
  };

  getJob = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid request',
          message: 'Job ID is required',
        });
        return;
      }

      const job = await this.firestoreService.getJob(id);

      if (!job) {
        res.status(StatusCodes.NOT_FOUND).json({
          error: 'Not found',
          message: 'Job not found',
        });
        return;
      }

      res.status(StatusCodes.OK).json(job);
    } catch (error) {
      logger.error('Error getting job', { error, jobId: req.params.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Failed to get job',
      });
    }
  };

  getAllJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobs = await this.firestoreService.getAllJobs();

      res.status(StatusCodes.OK).json({
        total: jobs.length,
        jobs,
      });
    } catch (error) {
      logger.error('Error getting all jobs', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Failed to get jobs',
      });
    }
  };
}
