import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../config/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements CustomError {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  // Log error details
  logger.error('Error occurred', {
    path: req.path,
    method: req.method,
    statusCode,
    code,
    message,
    stack: err.stack,
    details: err.details,
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};
