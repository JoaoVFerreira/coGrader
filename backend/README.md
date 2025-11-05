# coGrader Backend API

Backend service for the coGrader application - an image processing service that handles asynchronous job processing with Firebase and Redis queue management.

## Features

- **RESTful API** for job creation and management
- **Asynchronous Processing** with BullMQ and Redis
- **Image Processing** with Sharp (resize, grayscale, watermarking)
- **Cloud Storage** with Firebase Storage
- **Real-time Updates** via Firestore
- **Comprehensive Testing** with Jest
- **Type Safety** with TypeScript
- **Security** with Helmet and CORS
- **Logging** with Winston

## Tech Stack

- **Node.js** & **TypeScript**
- **Express.js** - Web framework
- **BullMQ** - Queue management
- **Redis** - Queue backend
- **Firebase Firestore** - Database
- **Firebase Storage** - Image storage
- **Sharp** - Image processing
- **Jest** - Testing framework

## Prerequisites

- Node.js 18+
- Redis 6+
- Firebase project with Firestore and Storage enabled

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_STORAGE_BUCKET=your-bucket-name

# Worker Configuration
WORKER_CONCURRENCY=5
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Worker Process (for job processing)
```bash
npm run worker
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test suite
```bash
npm test -- jobs.api.test.ts
```

### Run tests in watch mode
```bash
npm run test:watch
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and available endpoints.

### Create Job
```
POST /api/jobs
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg"
}
```

### Get Job Status
```
GET /api/jobs/:id
```

### List All Jobs
```
GET /api/jobs?page=1&limit=10
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Express middlewares
│   ├── routes/          # API routes
│   ├── schemas/         # Validation schemas
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── __tests__/       # Test files
│   ├── server.ts        # Express server
│   └── worker.ts        # Queue worker
├── .env.example         # Environment template
├── tsconfig.json        # TypeScript config
├── jest.config.js       # Jest config
└── package.json         # Dependencies
```

## Testing Coverage

The project includes comprehensive test coverage:

- ✅ Unit tests for all services
- ✅ Integration tests for API endpoints
- ✅ Concurrent job submission tests
- ✅ Redis failure recovery tests
- ✅ Image processing tests (PNG, JPG, large files)
- ✅ Error handling tests (404, invalid URLs, timeouts)

**Current Coverage: 106 tests passing**

## Development

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

### Build
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
