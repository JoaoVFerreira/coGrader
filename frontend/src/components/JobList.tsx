import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Job } from '../types/job';
import { JobItem } from './JobItem';
import { Pagination } from './Pagination';

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 9;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        const jobsQuery = query(jobsCollection, orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(
          jobsQuery,
          (snapshot) => {
            const jobsData: Job[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();

              jobsData.push({
                id: doc.id,
                imageUrl: data.imageUrl,
                status: data.status || 'waiting',
                progress: data.progress || 0,
                step: data.step,
                resultUrl: data.resultUrl,
                error: data.error,
                createdAt: data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : data.createdAt ? new Date(data.createdAt) : undefined,
                updatedAt: data.updatedAt instanceof Timestamp
                  ? data.updatedAt.toDate()
                  : data.updatedAt ? new Date(data.updatedAt) : undefined,
              });
            });
            setJobs(jobsData);
            setLoading(false);
          },
          (err) => {
            console.error('Error listening to jobs:', err);
            setError('Failed to load jobs. Please check your Firebase configuration.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up listener:', err);
        setError('Failed to initialize Firebase listener.');
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Filter and search logic
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => {
        if (statusFilter === 'processing') {
          return job.status === 'processing' || job.status === 'uploading' || job.status === 'active';
        }
        return job.status === statusFilter;
      });
    }

    // Search by Job ID
    if (searchQuery.trim()) {
      filtered = filtered.filter(job =>
        job.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [jobs, statusFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    return filteredJobs.slice(startIndex, startIndex + jobsPerPage);
  }, [filteredJobs, currentPage, jobsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  if (loading) {
    return <div className="loading">Loading jobs...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="job-list">
      <div className="job-list-header">
        <h2>Jobs ({filteredJobs.length})</h2>

        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="status-filter">Filter by Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="search-input">Search by Job ID:</label>
            <input
              id="search-input"
              type="text"
              placeholder="Enter Job ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="empty-state">
          {jobs.length === 0
            ? 'No jobs yet. Submit an image URL to get started!'
            : 'No jobs match your filters.'}
        </div>
      ) : (
        <>
          <div className="jobs-grid">
            {paginatedJobs.map((job) => (
              <JobItem key={job.id} job={job} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
