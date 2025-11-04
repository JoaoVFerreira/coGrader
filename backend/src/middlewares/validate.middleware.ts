import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to validate request data against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));

        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: errorMessages,
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
};
