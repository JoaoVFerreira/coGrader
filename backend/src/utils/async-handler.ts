import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async route handlers to catch errors and pass them to Express error handler
 * @param fn - Async route handler function
 * @returns Wrapped function that catches async errors
 */
export const asyncHandler = (
  fn: (req: any, res: Response, next?: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
