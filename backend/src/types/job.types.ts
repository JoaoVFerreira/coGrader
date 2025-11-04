export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ProcessingStep {
  DOWNLOAD = 'download',
  TRANSFORM = 'transform',
  UPLOAD = 'upload',
  COMPLETE = 'complete',
}

export interface JobData {
  imageUrl: string;
  jobId: string;
}

export interface JobResult {
  jobId: string;
  imageUrl?: string;
  status: JobStatus;
  progress: number;
  step?: ProcessingStep;
  error?: string;
  resultUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobRequest {
  imageUrl: string;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
