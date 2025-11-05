/**
 * Creates a mock image buffer of specified size
 */
export function createMockImageBuffer(sizeInMB: number): Buffer {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  return Buffer.alloc(sizeInBytes);
}

/**
 * Creates a valid PNG image buffer (1x1 pixel)
 */
export function createValidPNGBuffer(): Buffer {
  // Minimal valid PNG header (1x1 transparent pixel)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // Color type, etc
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
    0x42, 0x60, 0x82,
  ]);
}

/**
 * Creates a valid JPG image buffer (1x1 pixel)
 */
export function createValidJPGBuffer(): Buffer {
  // Minimal valid JPEG header (1x1 pixel)
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, // JPEG SOI + APP0
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, // Quantization table
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
    0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
    0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34,
    0x32, 0xff, 0xd9, // JPEG EOI
  ]);
}

/**
 * Mock axios responses for different scenarios
 */
export const mockAxiosResponses = {
  validPNG: {
    get: jest.fn().mockResolvedValue({
      data: createValidPNGBuffer(),
      status: 200,
      headers: { 'content-type': 'image/png' },
    }),
  },
  validJPG: {
    get: jest.fn().mockResolvedValue({
      data: createValidJPGBuffer(),
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
    }),
  },
  notFound: {
    get: jest.fn().mockRejectedValue({
      response: { status: 404 },
      message: 'Request failed with status code 404',
    }),
  },
  nonImage: {
    get: jest.fn().mockResolvedValue({
      data: Buffer.from('<html>Not an image</html>'),
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  },
  largeImage: {
    get: jest.fn().mockResolvedValue({
      data: createMockImageBuffer(15), // 15MB
      status: 200,
      headers: { 'content-type': 'image/png' },
    }),
  },
  timeout: {
    get: jest.fn().mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 30000ms exceeded',
    }),
  },
};

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Mock Firebase Storage
 */
export const createMockFirebaseStorage = () => ({
  bucket: jest.fn(() => ({
    file: jest.fn(() => ({
      save: jest.fn().mockResolvedValue(undefined),
      makePublic: jest.fn().mockResolvedValue(undefined),
    })),
    name: 'test-bucket',
  })),
});

/**
 * Mock Firestore Service
 */
export const createMockFirestoreService = () => ({
  createJob: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn().mockResolvedValue({
    id: 'test-job-id',
    imageUrl: 'https://example.com/image.jpg',
    status: 'waiting',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getAllJobs: jest.fn().mockResolvedValue({
    jobs: [],
    total: 0,
    page: 1,
    limit: 10,
  }),
  updateJobStatus: jest.fn().mockResolvedValue(undefined),
});

/**
 * Mock Queue Service
 */
export const createMockQueueService = () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  close: jest.fn().mockResolvedValue(undefined),
});

/**
 * Mock Redis Connection
 */
export const createMockRedisConnection = () => ({
  status: 'ready',
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
});
