# coGrader Backend - Setup Guide

## Overview

Backend de processamento de imagens utilizando TypeScript, Express, BullMQ e Firebase. O sistema processa imagens de forma assíncrona, aplicando transformações e armazenando os resultados no Firebase Storage.

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │ ───> │   Express   │ ───> │   BullMQ    │
│             │      │   Server    │      │    Queue    │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                      │
                            ▼                      ▼
                     ┌─────────────┐      ┌─────────────┐
                     │  Firestore  │ <─── │   Worker    │
                     │  (Status)   │      │  Process    │
                     └─────────────┘      └─────────────┘
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │  Firebase   │
                                          │  Storage    │
                                          └─────────────┘
```

## Prerequisites

- Node.js >= 18.x
- Redis Server (for BullMQ)
- Firebase Project with:
  - Firestore Database
  - Firebase Storage
  - Service Account credentials

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Worker Configuration
WORKER_CONCURRENCY=5
```

## Firebase Setup

1. Go to Firebase Console: https://console.firebase.google.com/
2. Create or select your project
3. Enable Firestore Database
4. Enable Firebase Storage
5. Create a Service Account:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file
   - Extract the values for `.env`:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY`
6. Get Storage Bucket name:
   - Go to Storage in Firebase Console
   - Copy the bucket name (e.g., `your-project.appspot.com`)

## Redis Setup

### Local Development (Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Or install Redis locally
- macOS: `brew install redis && brew services start redis`
- Ubuntu: `sudo apt-get install redis-server`
- Windows: Use Docker or WSL2

## Running the Application

### Development Mode

Terminal 1 - Start the API server:
```bash
npm run dev
```

Terminal 2 - Start the worker:
```bash
npm run dev:worker
```

### Production Mode

1. Build the project:
```bash
npm run build
```

2. Start the API server:
```bash
npm start
```

3. Start the worker (in another terminal or process manager):
```bash
npm run start:worker
```

## API Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "coGrader API"
}
```

### Create Job
```
POST /api/jobs
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg"
}
```
Response:
```json
{
  "jobId": "uuid-v4",
  "status": "pending",
  "message": "Job created successfully"
}
```

### Get Job Status
```
GET /api/jobs/:id
```
Response:
```json
{
  "jobId": "uuid-v4",
  "status": "completed",
  "progress": 100,
  "step": "complete",
  "resultUrl": "https://storage.googleapis.com/...",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:31:00.000Z"
}
```

### List All Jobs
```
GET /api/jobs
```
Response:
```json
{
  "total": 10,
  "jobs": [...]
}
```

## Job Processing Flow

1. **Download** (25% progress)
   - Downloads image from provided URL
   - Status: `processing`, Step: `download`

2. **Transform** (50% progress)
   - Resize to max 1200px width
   - Convert to grayscale
   - Add watermark
   - Status: `processing`, Step: `transform`

3. **Upload** (75% progress)
   - Upload to Firebase Storage
   - Status: `uploading`, Step: `upload`

4. **Complete** (100% progress)
   - Update Firestore with final URL
   - Status: `completed`, Step: `complete`

If any step fails:
- Status: `failed`
- Error message is stored in Firestore

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   ├── firebase.ts         # Firebase initialization
│   │   └── redis.ts            # Redis connection
│   ├── controllers/
│   │   └── jobs.controller.ts  # Job endpoints controller
│   ├── routes/
│   │   └── jobs.routes.ts      # Express routes
│   ├── services/
│   │   ├── firestore.service.ts        # Firestore operations
│   │   ├── image-processing.service.ts # Image processing logic
│   │   └── queue.service.ts            # BullMQ queue management
│   ├── types/
│   │   └── job.types.ts        # TypeScript types
│   ├── workers/
│   │   └── image-processor.worker.ts   # BullMQ worker
│   ├── server.ts               # Express server entry point
│   └── worker.ts               # Worker entry point
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── SETUP.md
```

## Testing

### Test with cURL

Create a job:
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://picsum.photos/1600/900"}'
```

Get job status:
```bash
curl http://localhost:3000/api/jobs/{jobId}
```

List all jobs:
```bash
curl http://localhost:3000/api/jobs
```

## Monitoring

### Check Redis
```bash
redis-cli ping
redis-cli info
```

### Check BullMQ Queue
You can use Bull Board for visualization:
```bash
npm install @bull-board/express @bull-board/api
```

## Troubleshooting

### Redis Connection Issues
- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in `.env`
- Check firewall rules

### Firebase Issues
- Verify credentials in `.env`
- Check Firebase Console for service account permissions
- Ensure Firestore and Storage are enabled

### Worker Not Processing Jobs
- Verify both server and worker are running
- Check Redis connection
- Check worker logs for errors
- Verify Firebase credentials

### Image Processing Fails
- Verify image URL is accessible
- Check image format is supported (JPEG, PNG, WebP, etc.)
- Check worker has enough memory for large images

## Production Deployment

### Using PM2

1. Install PM2:
```bash
npm install -g pm2
```

2. Create ecosystem file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'coGrader-api',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'coGrader-worker',
      script: './dist/worker.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

3. Start:
```bash
npm run build
pm2 start ecosystem.config.js
```

## License

ISC
