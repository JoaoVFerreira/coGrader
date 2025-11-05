# coGrader

A modern, scalable image processing service with real-time job tracking. coGrader allows users to submit image URLs for processing and monitor job progress in real-time through an intuitive web interface.

## Overview

coGrader is a full-stack application that processes images asynchronously with features like resizing, grayscale conversion, and watermarking. It uses a robust queue system for handling multiple concurrent jobs and provides real-time updates through Firebase Firestore.

## Key Features

- 📤 **Image Processing** - Upload images via URL for automated processing
- ⚡ **Real-time Updates** - Live job status tracking without polling
- 🔄 **Queue Management** - Reliable job processing with BullMQ and Redis
- 🎨 **Image Transformation** - Resize, grayscale, and watermark images
- ☁️ **Cloud Storage** - Processed images stored in Firebase Storage
- 🔒 **Security** - CORS protection and secure API endpoints
- 📊 **Comprehensive Testing** - 106 tests covering all major features
- 🚀 **Scalable Architecture** - Designed for high-volume processing

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
│   Port: 5173    │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐      ┌──────────────┐
│   Backend API   │ ←────→ │   Firebase   │
│  (Express + TS) │        │  Firestore   │
│   Port: 3000    │        │   Storage    │
└────────┬────────┘        └──────────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│   Worker        │ ←────→ │    Redis     │
│  (Job Processor)│        │   (Queue)    │
└─────────────────┘        └──────────────┘
```

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Firebase SDK** - Real-time database integration

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **BullMQ** - Job queue management
- **Sharp** - High-performance image processing
- **Firebase Admin SDK** - Cloud services
- **Jest** - Testing framework

### Infrastructure
- **Redis** - Message broker and queue backend
- **Firebase Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Winston** - Logging

## Project Structure

```
coGrader/
├── backend/              # Backend API and worker
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middlewares/  # Express middlewares
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── __tests__/    # Test suites
│   │   ├── server.ts     # API server
│   │   └── worker.ts     # Job processor
│   └── README.md         # Backend documentation
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── config/       # Configuration
│   │   └── types/        # TypeScript types
│   └── README.md         # Frontend documentation
│
├── LICENSE               # MIT License
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Redis 6 or higher
- Firebase project with Firestore and Storage enabled
- npm or yarn package manager

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd coGrader
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Setup Worker** (in a new terminal)
```bash
cd backend
npm run worker
```

4. **Setup Frontend** (in a new terminal)
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Firebase config
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Configuration

### Backend Environment Variables
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
REDIS_HOST=localhost
REDIS_PORT=6379
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_STORAGE_BUCKET=your-bucket-name
WORKER_CONCURRENCY=5
```

### Frontend Environment Variables
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket-name
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints

### Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg"
}
```

### Get Job Status
```http
GET /api/jobs/:id
```

### List All Jobs
```http
GET /api/jobs?page=1&limit=10
```

### Health Check
```http
GET /health
```

## Testing

The project includes comprehensive test coverage:

### Backend Tests
```bash
cd backend
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

**Test Coverage:**
- ✅ Unit tests for all services
- ✅ Integration tests for API endpoints
- ✅ Concurrent job processing (5, 10, 50, 100 jobs)
- ✅ Redis failure recovery and reconnection
- ✅ Image processing (PNG, JPG, large files >10MB)
- ✅ Error handling (404, invalid URLs, timeouts)

**106 tests passing** across 12 test suites

## How It Works

1. **Job Submission**
   - User submits an image URL through the frontend
   - Frontend validates the URL and sends to backend API
   - Backend creates a job in Firestore and adds to Redis queue

2. **Job Processing**
   - Worker picks up job from Redis queue
   - Downloads image from provided URL
   - Processes image (resize, grayscale, watermark)
   - Uploads processed image to Firebase Storage
   - Updates job status in Firestore

3. **Real-time Updates**
   - Frontend listens to Firestore for changes
   - UI automatically updates when job status changes
   - No polling required - uses Firebase real-time listeners

## Image Processing Pipeline

```
Input Image (URL)
      ↓
Download Image
      ↓
Validate Format (PNG/JPG)
      ↓
Resize (max 1920px width)
      ↓
Convert to Grayscale
      ↓
Add Watermark
      ↓
Upload to Storage
      ↓
Return Result URL
```

## Deployment

### Backend Deployment
- Can be deployed to any Node.js hosting platform
- Requires Redis instance (Redis Cloud, AWS ElastiCache, etc.)
- Requires Firebase project
- Configure environment variables on hosting platform

### Frontend Deployment
- Can be deployed to static hosting (Vercel, Netlify, Firebase Hosting)
- Build with `npm run build`
- Configure environment variables for production

## Performance

- **Concurrent Processing**: Handles up to 5 jobs simultaneously (configurable)
- **Queue System**: BullMQ ensures reliable job processing
- **Scalability**: Can scale horizontally by adding more workers
- **Efficient Processing**: Sharp library for fast image transformations
- **Real-time**: Firebase listeners eliminate polling overhead

## Security

- **CORS Protection**: Backend only accepts requests from configured frontend
- **Input Validation**: Zod schemas for all API inputs
- **Helmet**: Security headers for Express
- **Error Handling**: Graceful error handling without exposing internals
- **Type Safety**: TypeScript for compile-time error catching

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code follows existing style
- New features include tests
- Documentation is updated

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.