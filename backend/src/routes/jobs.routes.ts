import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { QueueService } from '../services/queue.service';
import { validate } from '../middlewares/validate.middleware';
import { createJobSchema, getJobSchema, getAllJobsSchema } from '../schemas/job.schema';
import { asyncHandler } from '../utils/async-handler';

export const createJobsRouter = (queueService: QueueService): Router => {
  const router = Router();
  const jobsController = new JobsController(queueService);

  router.post('/', validate(createJobSchema), asyncHandler(jobsController.createJob));
  router.get('/:id', validate(getJobSchema), asyncHandler(jobsController.getJob));
  router.get('/', validate(getAllJobsSchema), asyncHandler(jobsController.getAllJobs));

  return router;
};
