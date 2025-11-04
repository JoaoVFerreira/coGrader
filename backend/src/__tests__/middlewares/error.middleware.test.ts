import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  errorHandler,
  notFoundHandler,
} from '../../middlewares/error.middleware';
import { StatusCodes } from 'http-status-codes';

jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
    } as any;
    Object.defineProperty(mockRequest, 'path', {
      value: '/api/test',
      writable: true,
      configurable: true,
    });

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset environment
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError', () => {
    it('Should create an error with all properties', () => {
      const error = new AppError('Test error', StatusCodes.BAD_REQUEST, 'TEST_ERROR', {
        field: 'test',
      });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.stack).toBeDefined();
    });

    it('Should default to 500 status code', () => {
      const error = new AppError('Test error');

      expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('Should be an instance of Error', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('errorHandler', () => {
    it('Should handle AppError with all properties', () => {
      const error = new AppError('Custom error', StatusCodes.BAD_REQUEST, 'CUSTOM_ERROR', {
        detail: 'test',
      });

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('Should handle generic errors', () => {
      const error = new Error('Generic error') as any;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Generic error',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('Should default to 500 status code if not provided', () => {
      const error = { message: 'Test' } as any;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('Should default to INTERNAL_ERROR code if not provided', () => {
      const error = { message: 'Test', statusCode: StatusCodes.BAD_REQUEST } as any;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );
    });

    it('Should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Dev error', StatusCodes.BAD_REQUEST);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });

    it('Should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Prod error', StatusCodes.BAD_REQUEST);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.stack).toBeUndefined();
    });

    it('Should include details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Error', StatusCodes.BAD_REQUEST, 'ERR', { field: 'test' });

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'test' },
          }),
        })
      );
    });

    it('Should not include details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Error', StatusCodes.BAD_REQUEST, 'ERR', { field: 'test' });

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.details).toBeUndefined();
    });

    it('Should include timestamp in ISO format', () => {
      const error = new AppError('Error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('Should include request path', () => {
      const error = new AppError('Error');
      Object.defineProperty(mockRequest, 'path', {
        value: '/api/custom/path',
        writable: true,
        configurable: true,
      });

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/custom/path',
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('Should return 404 status', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });

    it('Should return correct error response', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('Should include request path', () => {
      Object.defineProperty(mockRequest, 'path', {
        value: '/api/non-existent',
        writable: true,
        configurable: true,
      });

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/non-existent',
        })
      );
    });

    it('Should include timestamp in ISO format', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
