'use server'

import { signupSchema, type SignupInput } from '@/lib/validators/auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import type { User } from '@/lib/types'

// ============================================================================
// ExamForge AI — Signup Server Action
// ============================================================================
// Validates input with signupSchema, forces role to 'student' (security
// constraint), calls Supabase signUp, and returns a typed result.
// ============================================================================

export interface SignupResult {
  success: boolean
  user?: User
  error?: string
  emailConfirmationRequired?: boolean
}

export async function signupAction(input: SignupInput): Promise<SignupResult> {
  // Validate input with Zod schema
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: firstError?.message ?? 'Invalid input',
    }
  }

  // Force role to 'student' — security constraint
  // Users cannot self-assign teacher, school_admin, or super_admin roles
  const { email, password, fullName } = parsed.data

  try {
    const supabase = await requireSupabase()

    // Graceful fallback when Supabase is not configured (dev adapter mode)}

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'student',
        },
      },
    })

    if (authError) {
      // Map common Supabase signup errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        'User already registered': 'An account with this email already exists. Please sign in instead.',
        'Password should be at least 6 characters': 'Password must be at least 8 characters.',
        'Signup is disabled': 'Registration is currently disabled. Please contact support.',
        'Email rate limit exceeded': 'Too many signup attempts. Please wait a moment and try again.',
      }

      return {
        success: false,
        error: errorMessages[authError.message] ?? authError.message,
      }
    }

    if (data.user) {
      // Check if email confirmation is required
      // If the user has an identitiy but no confirmed_at, email confirmation is needed
      const emailConfirmationRequired = !data.user.email_confirmed_at && data.user.identities?.length !== 0

      const user: User = {
        id: data.user.id,
        email: data.user.email ?? '',
        fullName,
        role: 'student',
        avatarUrl: null,
        phone: null,
        isEmailVerified: data.user.email_confirmed_at != null,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at ?? data.user.created_at,
      }

      return {
        success: true,
        user,
        emailConfirmationRequired,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred during registration. Please try again.',
    }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
