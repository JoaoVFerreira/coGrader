import { getFirestore } from '../config/firebase';
import { JobStatus, ProcessingStep, JobResult } from '../types/job.types';

const JOBS_COLLECTION = 'jobs';

export class FirestoreService {
  private db = getFirestore();

  async createJob(jobId: string, imageUrl: string): Promise<void> {
    const jobData: JobResult = {
      jobId,
      status: JobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(JOBS_COLLECTION).doc(jobId).set(jobData);
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: number,
    step?: ProcessingStep,
    error?: string,
    resultUrl?: string
  ): Promise<void> {
    const updateData: Partial<JobResult> = {
      status,
      progress,
      updatedAt: new Date(),
    };

    if (step) updateData.step = step;
    if (error) updateData.error = error;
    if (resultUrl) updateData.resultUrl = resultUrl;

    await this.db
      .collection(JOBS_COLLECTION)
      .doc(jobId)
      .update(updateData);
  }

  async getJob(jobId: string): Promise<JobResult | null> {
    const doc = await this.db.collection(JOBS_COLLECTION).doc(jobId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      ...data,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
    } as JobResult;
  }

  async getAllJobs(): Promise<JobResult[]> {
    const snapshot = await this.db
      .collection(JOBS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
        updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      } as JobResult;
    });
  }
}
