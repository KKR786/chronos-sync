/**
 * @license Apache-2.0
 * Zod Schemas for Authentication Endpoints
 */

import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.string().email('Please enter a valid corporate or personal email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  fullName: z.string().min(2, 'Full name must have at least 2 characters.'),
  timezone: z.string().default('America/New_York'),
  bufferPreferenceInt: z.number().int().min(5).max(60).default(15),
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.'),
});

export const SupabaseTokenVerifySchema = z.object({
  supabaseToken: z.string().min(10, 'Supabase JWT token is required.'),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginUserInput = z.infer<typeof LoginUserSchema>;
export type SupabaseTokenVerifyInput = z.infer<typeof SupabaseTokenVerifySchema>;
