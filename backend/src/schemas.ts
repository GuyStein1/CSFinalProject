import { z } from 'zod';

export const authSyncSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  phone_number: z.string().trim().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  media_urls: z.array(z.url()).optional(),
  category: z.enum(['ELECTRICITY', 'PLUMBING', 'CARPENTRY', 'PAINTING', 'MOVING', 'GENERAL']),
  suggested_price: z.number().positive().nullable().optional(),
  general_location_name: z.string().trim().min(1, 'General location is required'),
  exact_address: z.string().trim().min(1, 'Exact address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
});

export const createBidSchema = z.object({
  offered_price: z.number().positive('Offered price must be positive'),
  description: z.string().trim().min(1, 'Description is required').max(1000),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
