import { useState } from 'react';
import type { Job } from '../types/job';
import { ImageModal } from './ImageModal';

interface JobItemProps {
  job: Job;
}

export function JobItem({ job }: JobItemProps) {
  const [showModal, setShowModal] = useState(false);

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
      case 'uploading':
      case 'active':
        return '🔵';
      case 'waiting':
      case 'pending':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      case 'processing':
      case 'uploading':
      case 'active':
        return '#2196f3';
      case 'waiting':
      case 'pending':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusText = (status: Job['status'], step?: string) => {
    if (status === 'processing' && step) {
      return `${step}`;
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const copyJobId = () => {
    navigator.clipboard.writeText(job.id);
  };

  return (
    <>
      <div className="job-card">
        <div className="job-card-header">
          <span className="job-status-icon" style={{ color: getStatusColor(job.status) }}>
            {getStatusIcon(job.status)}
          </span>
          <span className="job-status-text" style={{ color: getStatusColor(job.status) }}>
            {getStatusText(job.status, job.step)}
          </span>
        </div>

        <div className="job-card-id" onClick={copyJobId} title="Click to copy">
          #{job.id?.slice(0, 8)}
        </div>

        <div className="job-card-progress">
          <div className="progress-bar-compact">
            <div
              className="progress-fill-compact"
              style={{
                width: `${job.progress || 0}%`,
                backgroundColor: getStatusColor(job.status),
              }}
            />
          </div>
          <span className="progress-percentage">{job.progress || 0}%</span>
        </div>

        {job.imageUrl && (
          <div className="job-card-link">
            📎{' '}
            <a href={job.imageUrl} target="_blank" rel="noopener noreferrer" title={job.imageUrl}>
              Original
            </a>
          </div>
        )}

        {job.resultUrl && job.status === 'completed' && (
          <div className="job-card-thumbnail">
            <img
              src={job.resultUrl}
              alt="Thumbnail"
              className="thumbnail-image"
              loading="lazy"
            />
            <button
              className="view-button"
              onClick={() => setShowModal(true)}
            >
              🔍 View Image
            </button>
          </div>
        )}

        {job.error && (
          <div className="job-card-error">
            ⚠️ {job.error.slice(0, 50)}
            {job.error.length > 50 && '...'}
          </div>
        )}

        {job.createdAt && (
          <div className="job-card-time">
            {new Date(job.createdAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {showModal && job.resultUrl && (
        <ImageModal imageUrl={job.resultUrl} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
