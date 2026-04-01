import { z } from 'zod';

export const createRecordSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  type: z.enum(['INCOME', 'EXPENSE'], { message: 'Type must be INCOME or EXPENSE' }),
  category: z.string().min(1, 'Category is required'),
  date: z.string().datetime({ message: 'Date must be a valid ISO date string' }),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number().positive('Amount must be a positive number').optional(),
  type: z.enum(['INCOME', 'EXPENSE'], { message: 'Type must be INCOME or EXPENSE' }).optional(),
  category: z.string().min(1, 'Category is required').optional(),
  date: z.string().datetime({ message: 'Date must be a valid ISO date string' }).optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
