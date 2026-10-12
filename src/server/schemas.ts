import { z } from 'zod';

export const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional().nullable(),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  zipCode: z.string().trim().min(2).max(20),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  amenities: z.array(z.string().trim().min(1).max(60)).max(60).optional(),
  tagline: z.string().trim().max(160).optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex color like #0E7490')
    .optional()
    .nullable()
    .or(z.literal('')),
  type: z.enum(['Hotel', 'Motel', 'Inn', 'B&B', 'Boutique', 'Other']).optional().nullable(),
  isActive: z.boolean().optional(),
});

