// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  TEN_SECONDS: 10000,
  THIRTY_SECONDS: 30000,
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000,
  WEEK: 604800000,
} as const;

// Timeout constants
export const TIMEOUT = {
  DOWNLOAD: 30000,  // 30 seconds
  UPLOAD: 60000,    // 60 seconds
  GRACEFUL_SHUTDOWN: 10000, // 10 seconds
} as const;

// Processing progress percentages
export const PROGRESS = {
  PENDING: 0,
  DOWNLOAD: 25,
  TRANSFORM: 50,
  UPLOAD: 75,
  COMPLETE: 100,
} as const;

// Queue configuration
export const QUEUE = {
  NAME: 'imageProcessing',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  CLEANUP: {
    COMPLETED_COUNT: 100,
    COMPLETED_AGE: 24 * 3600,  // 24 hours in seconds
    FAILED_COUNT: 1000,
    FAILED_AGE: 7 * 24 * 3600, // 7 days in seconds
  },
} as const;

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Collection names
export const COLLECTIONS = {
  JOBS: 'jobs',
} as const;

// Image processing constants
export const IMAGE = {
  MAX_WIDTH: 1200,
  QUALITY: 85,
  FORMAT: 'jpeg' as const,
  WATERMARK: {
    TEXT: 'Processed by coGrader',
    COLOR: '#FF0080',
    FONT_SIZE: 24,
    WIDTH: 300,
    HEIGHT: 50,
  },
} as const;

// Storage constants
export const STORAGE = {
  PROCESSED_FOLDER: 'processed',
  FILE_EXTENSION: '.jpg',
} as const;
