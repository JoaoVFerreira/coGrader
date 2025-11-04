import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { QueueService } from '../services/queue.service';
import { validate } from '../middlewares/validate.middleware';
import { createJobSchema, getJobSchema, getAllJobsSchema } from '../schemas/job.schema';

export const createJobsRouter = (queueService: QueueService): Router => {
  const router = Router();
  const jobsController = new JobsController(queueService);

  router.post('/', validate(createJobSchema), jobsController.createJob);
  router.get('/:id', validate(getJobSchema), jobsController.getJob);
  router.get('/', validate(getAllJobsSchema), jobsController.getAllJobs);

  return router;
};
