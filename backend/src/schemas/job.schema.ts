import { z } from 'zod';

/**
 * Schema for creating a new job
 */
export const createJobSchema = z.object({
  body: z.object({
    imageUrl: z
      .string({ message: 'imageUrl must be a string' })
      .url({ message: 'imageUrl must be a valid URL' })
      .min(1, { message: 'imageUrl cannot be empty' }),
  }),
});

/**
 * Schema for getting a job by ID
 */
export const getJobSchema = z.object({
  params: z.object({
    id: z
      .string({ message: 'Job ID must be a string' })
      .uuid({ message: 'Job ID must be a valid UUID' }),
  }),
});

/**
 * Schema for pagination params
 */
export const getAllJobsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (val > 0 && Number.isInteger(val)), {
        message: 'page must be a positive integer',
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val > 0 && val <= 100 && Number.isInteger(val)),
        {
          message: 'limit must be a positive integer between 1 and 100',
        }
      ),
  }),
});
