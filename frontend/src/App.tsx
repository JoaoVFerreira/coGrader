import { useState } from 'react';
import './App.css';
import { ImageForm } from './components/ImageForm';
import { JobList } from './components/JobList';

function App() {
  const [, setLastJobId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string) => {
    setLastJobId(jobId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Image Processing Queue</h1>
        <p>Process images with real-time progress tracking</p>
      </header>

      <main className="app-main">
        <ImageForm onJobCreated={handleJobCreated} />
        <JobList />
      </main>
    </div>
  );
}

export default App;
