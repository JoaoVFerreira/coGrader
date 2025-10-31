import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { QueueService } from '../services/queue.service';

export const createJobsRouter = (queueService: QueueService): Router => {
  const router = Router();
  const jobsController = new JobsController(queueService);

  router.post('/', jobsController.createJob);
  router.get('/:id', jobsController.getJob);
  router.get('/', jobsController.getAllJobs);

  return router;
};
