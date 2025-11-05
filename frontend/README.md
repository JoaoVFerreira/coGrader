# coGrader Frontend

Frontend application for coGrader - a modern, real-time image processing job management interface built with React, TypeScript, and Firebase.

## Features

- **Real-time Job Tracking** with Firebase Firestore listeners
- **Job Submission** with URL validation
- **Progress Monitoring** with visual progress bars
- **Image Preview** for completed jobs
- **Error Handling** with detailed error messages
- **Responsive Design** for mobile and desktop
- **Live Updates** without polling

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Firebase** - Real-time database and storage
- **CSS3** - Styling

## Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Backend API running (see backend README)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your Firebase and API configuration:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:3000/api
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Development

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Project Structure

```
frontend/
├── public/
│   └── dictionary.svg      # App icon
├── src/
│   ├── components/         # React components
│   │   ├── ImageForm.tsx   # Job submission form
│   │   ├── JobList.tsx     # Real-time job list
│   │   └── JobItem.tsx     # Individual job display
│   ├── config/             # Configuration
│   │   ├── firebase.ts     # Firebase setup
│   │   └── api.ts          # API client
│   ├── types/              # TypeScript types
│   │   └── job.ts          # Job type definitions
│   ├── App.tsx             # Main app component
│   ├── App.css             # App styles
│   ├── index.css           # Global styles
│   └── main.tsx            # App entry point
├── .env.example            # Environment template
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

## Features Detail

### Job Submission
- Submit image URLs for processing
- URL validation (must be valid HTTPS URL ending in .jpg, .jpeg, or .png)
- Instant feedback on submission

### Real-time Updates
- Jobs automatically update as they progress
- No page refresh required
- Firebase Firestore listeners for live data

### Job Status Display
Each job shows:
- **Job ID** with copy functionality
- **Original Image URL** with link
- **Current Status** (pending, processing, completed, failed)
- **Progress Bar** showing completion percentage
- **Processing Time** for completed jobs
- **Result Image** when job is complete
- **Error Messages** if job fails

### Job Statuses
- 🟡 **Pending** - Job queued for processing
- 🔵 **Processing** - Job is being processed
- 🟢 **Completed** - Job finished successfully
- 🔴 **Failed** - Job failed with error


## Configuration

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Firebase Storage
4. Copy your Firebase config from Project Settings
5. Add the config values to `.env`

### Backend Connection
Ensure the `VITE_API_URL` in `.env` points to your running backend API (default: `http://localhost:3000/api`)

## Performance

- Uses Firebase Firestore real-time listeners (no polling overhead)
- Optimized React rendering with proper state management
- Lazy loading of images
- Efficient component updates

## License

This project is licensed under the MIT License - see the LICENSE file for details.
