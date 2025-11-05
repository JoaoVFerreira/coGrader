import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Job } from '../types/job';
import { JobItem } from './JobItem';

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        // Try to order by createdAt, but if it fails, we'll catch it
        const jobsQuery = query(jobsCollection, orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(
        jobsQuery,
        (snapshot) => {
          const jobsData: Job[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Firestore job data:', doc.id, data);

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

  if (loading) {
    return <div className="loading">Loading jobs...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (jobs.length === 0) {
    return <div className="empty-state">No jobs yet. Submit an image URL to get started!</div>;
  }

  return (
    <div className="job-list">
      <h2>Jobs ({jobs.length})</h2>
      {jobs.map((job) => (
        <JobItem key={job.id} job={job} />
      ))}
    </div>
  );
}
