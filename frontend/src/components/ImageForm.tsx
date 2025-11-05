import { useState } from 'react';
import type { FormEvent } from 'react';
import { createJob } from '../config/api';

interface ImageFormProps {
  onJobCreated: (jobId: string) => void;
}

export function ImageForm({ onJobCreated }: ImageFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { jobId } = await createJob(imageUrl);
      onJobCreated(jobId);
      setImageUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Process Image</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL (e.g., https://picsum.photos/800/600)"
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Process Image'}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}
