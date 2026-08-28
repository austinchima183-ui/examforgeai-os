'use server'

import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import type { User } from '@/lib/types'

// ============================================================================
// ExamForge AI — Login Server Action
// ============================================================================
// Validates input with loginSchema, calls Supabase signInWithPassword,
// and returns a typed result with user data or error.
// ============================================================================

export interface LoginResult {
  success: boolean
  user?: User
  error?: string
}

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  // Validate input with Zod schema
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: firstError?.message ?? 'Invalid input',
    }
  }

  const { email, password } = parsed.data

  try {
    const supabase = await requireSupabase()

    // Graceful fallback when Supabase is not configured (dev adapter mode)}

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Map common Supabase auth errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        'Invalid login credentials': 'Invalid email or password. Please try again.',
        'Email not confirmed': 'Please verify your email address before signing in.',
        'Too many requests': 'Too many login attempts. Please wait a moment and try again.',
      }

      return {
        success: false,
        error: errorMessages[authError.message] ?? authError.message,
      }
    }

    if (data.user) {
      const role = (data.user.app_metadata?.role as string) ?? 'student'
      const user: User = {
        id: data.user.id,
        email: data.user.email ?? '',
        fullName:
          data.user.user_metadata?.full_name ??
          data.user.email?.split('@')[0] ??
          'User',
        role: role as User['role'],
        avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        phone: data.user.user_metadata?.phone ?? null,
        isEmailVerified: data.user.email_confirmed_at != null,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at ?? data.user.created_at,
      }

      return {
        success: true,
        user,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
