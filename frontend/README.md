# coGraderApp

React + Vite frontend for the coGrader image processing application with real-time Firebase integration.

## Features

- Single page application with image URL submission form
- Real-time job list with Firebase Firestore listeners (no polling)
- Progress bars showing completion percentage for each job
- Display of processed images when completed
- Error messages for failed jobs
- Responsive design

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and building
- Firebase Firestore for real-time data
- Firebase Storage for image URLs

## Prerequisites

- Node.js 18+ and npm
- Backend server running (see `/backend` folder)
- Firebase project configured

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

The `.env` file should already be created with the following variables:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3000/api
```

Update these values with your actual Firebase configuration.

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Usage

1. Make sure the backend server is running (see backend README)
2. Start the frontend development server
3. Open the application in your browser
4. Enter an image URL in the form (e.g., `https://picsum.photos/800/600`)
5. Click "Process Image" to create a new job
6. Watch the job list update in real-time as the image is processed
7. See the processed image when the job completes

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ImageForm.tsx      # Form for submitting image URLs
│   │   ├── JobItem.tsx         # Individual job display with progress
│   │   └── JobList.tsx         # Real-time job list with Firebase listener
│   ├── config/
│   │   ├── api.ts              # API client for backend communication
│   │   └── firebase.ts         # Firebase configuration
│   ├── types/
│   │   └── job.ts              # TypeScript types for jobs
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Application styles
│   └── main.tsx                # Entry point
├── .env                        # Environment variables
└── package.json
```

## Real-time Updates

The application uses Firebase Firestore's `onSnapshot` listener to receive real-time updates about job status changes. This means:

- No polling required
- Instant updates when job status changes
- Efficient bandwidth usage
- Multiple users see the same updates in real-time

## Troubleshooting

- **"Failed to load jobs" error**: Check your Firebase configuration in `.env`
- **Jobs not updating**: Verify backend is running and updating Firestore
- **Cannot create jobs**: Check that `VITE_API_URL` points to your running backend
- **CORS errors**: Ensure backend has CORS configured correctly

## Development

The project uses:
- TypeScript for type safety
- ESLint for code quality
- Vite's Fast Refresh for instant updates during development
