import type { Job } from '../types/job';

interface JobItemProps {
  job: Job;
}

export function JobItem({ job }: JobItemProps) {
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
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusText = (status: Job['status'], step?: string) => {
    if (status === 'processing' && step) {
      return `Processing: ${step}`;
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const imageUrl = job.imageUrl || 'N/A';
  const displayUrl = imageUrl.length > 50 ? imageUrl.slice(0, 50) + '...' : imageUrl;

  return (
    <div className="job-item">
      <div className="job-header">
        <div className="job-id">Job #{job.id?.slice(0, 8) || 'Unknown'}</div>
        <div className="job-status" style={{ color: getStatusColor(job.status) }}>
          {getStatusText(job.status, job.step)}
        </div>
      </div>

      {job.imageUrl && (
        <div className="job-url">
          <strong>Original:</strong>{' '}
          <a href={job.imageUrl} target="_blank" rel="noopener noreferrer">
            {displayUrl}
          </a>
        </div>
      )}

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${job.progress || 0}%`,
              backgroundColor: getStatusColor(job.status),
            }}
          />
        </div>
        <div className="progress-text">{job.progress || 0}%</div>
      </div>

      {job.error && (
        <div className="error-message">
          <strong>Error:</strong> {job.error}
        </div>
      )}

      {job.resultUrl && job.status === 'completed' && (
        <div className="result-container">
          <div className="result-url">
            <strong>Result:</strong>{' '}
            <a href={job.resultUrl} target="_blank" rel="noopener noreferrer">
              View Processed Image
            </a>
          </div>
          <img
            src={job.resultUrl}
            alt="Processed result"
            className="result-image"
            loading="lazy"
          />
        </div>
      )}

      <div className="job-timestamp">
        Created: {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
}
