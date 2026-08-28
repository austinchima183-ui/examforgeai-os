// ============================================================================
// ExamForge AI — Auth Zod Schemas
// ============================================================================
// Validation schemas for all authentication-related forms and API payloads.
// Uses Zod v4 with strict typing for runtime validation and TypeScript inference.
// ============================================================================

import { z } from 'zod';
import type { UserRole } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Login Schema
// ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ──────────────────────────────────────────────────────────────
// Signup Schema
// ──────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be at most 100 characters'),
    role: z
      .enum(['student', 'teacher', 'school_admin', 'super_admin'] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ──────────────────────────────────────────────────────────────
// Reset Password Schema
// ──────────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ──────────────────────────────────────────────────────────────
// Update Password Schema
// ──────────────────────────────────────────────────────────────

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// ──────────────────────────────────────────────────────────────
// Update Profile Schema
// ──────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ──────────────────────────────────────────────────────────────
// Role helper — extract the role enum values for reuse
// ──────────────────────────────────────────────────────────────

export const USER_ROLES: UserRole[] = ['student', 'teacher', 'school_admin', 'super_admin'];
