const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const createJob = async (imageUrl: string): Promise<{ jobId: string }> => {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create job');
  }

  return response.json();
};
