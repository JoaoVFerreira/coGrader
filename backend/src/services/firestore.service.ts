import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from '../config/firebase';
import { JobStatus, ProcessingStep, JobResult, PaginatedResponse } from '../types/job.types';
import { COLLECTIONS, PAGINATION, PROGRESS } from '../constants';

export class FirestoreService {
  private db: Firestore;

  constructor(db?: Firestore) {
    this.db = db || getFirestore();
  }

  async createJob(jobId: string, imageUrl: string): Promise<void> {
    const jobData: JobResult = {
      jobId,
      imageUrl,
      status: JobStatus.PENDING,
      progress: PROGRESS.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(COLLECTIONS.JOBS).doc(jobId).set(jobData);
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
      .collection(COLLECTIONS.JOBS)
      .doc(jobId)
      .update(updateData);
  }

  async getJob(jobId: string): Promise<JobResult | null> {
    const doc = await this.db.collection(COLLECTIONS.JOBS).doc(jobId).get();

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

  async getAllJobs(page?: number, limit?: number): Promise<PaginatedResponse<JobResult>> {
    const normalizedPage = Math.max(1, page || PAGINATION.DEFAULT_PAGE);
    const normalizedLimit = Math.min(Math.max(1, limit || PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const totalSnapshot = await this.db.collection(COLLECTIONS.JOBS).count().get();
    const total = totalSnapshot.data().count;

    const snapshot = await this.db
      .collection(COLLECTIONS.JOBS)
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(normalizedLimit)
      .get();

    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        ...docData,
        createdAt: docData?.createdAt?.toDate?.() || docData?.createdAt,
        updatedAt: docData?.updatedAt?.toDate?.() || docData?.updatedAt,
      } as JobResult;
    });

    const totalPages = Math.ceil(total / normalizedLimit);

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages,
        hasNextPage: normalizedPage < totalPages,
        hasPrevPage: normalizedPage > 1,
      },
    };
  }
}
