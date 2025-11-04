import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { QueueService } from '../services/queue.service';
import { FirestoreService } from '../services/firestore.service';
import { CreateJobRequest, CreateJobResponse, JobStatus } from '../types/job.types';
import { AppError } from '../middlewares/error.middleware';

export class JobsController {
  private queueService: QueueService;
  private firestoreService: FirestoreService;

  constructor(queueService: QueueService, firestoreService?: FirestoreService) {
    this.queueService = queueService;
    this.firestoreService = firestoreService || new FirestoreService();
  }

  /**
   * Creates a new image processing job
   * @param req - Express request object with CreateJobRequest body
   * @param res - Express response object
   * @throws {AppError} If job creation fails
   */
  public createJob = async (req: Request<{}, {}, CreateJobRequest>, res: Response): Promise<void> => {
    const { imageUrl } = req.body;
    const jobId = uuidv4();

    await this.firestoreService.createJob(jobId, imageUrl);
    await this.queueService.addJob(jobId, imageUrl);

    const response: CreateJobResponse = {
      jobId,
      status: JobStatus.PENDING,
      message: 'Job created successfully',
    };

    res.status(StatusCodes.CREATED).json(response);
  };

  /**
   * Retrieves a job by its ID
   * @param req - Express request object with job ID in params
   * @param res - Express response object
   * @throws {AppError} If job is not found
   */
  public getJob = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const job = await this.firestoreService.getJob(id);

    if (!job) {
      throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'JOB_NOT_FOUND');
    }

    res.status(StatusCodes.OK).json(job);
  };

  /**
   * Retrieves all jobs with pagination
   * @param req - Express request object with optional pagination query params
   * @param res - Express response object
   */
  public getAllJobs = async (req: Request, res: Response): Promise<void> => {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const result = await this.firestoreService.getAllJobs(page, limit);
    res.status(StatusCodes.OK).json(result);
  };
}
