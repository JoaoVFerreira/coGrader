export type JobStatus = 'waiting' | 'pending' | 'active' | 'processing' | 'uploading' | 'completed' | 'failed';

export interface Job {
  id: string;
  imageUrl?: string;
  status: JobStatus;
  progress?: number;
  step?: string;
  resultUrl?: string;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
