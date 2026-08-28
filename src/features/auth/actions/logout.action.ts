'use server'

import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants/routes'

// ============================================================================
// ExamForge AI — Logout Server Action
// ============================================================================
// Calls Supabase signOut, clears the auth store, and redirects to /login.
// ============================================================================

export interface LogoutResult {
  success: boolean
  error?: string
}

export async function logoutAction(): Promise<LogoutResult> {
  try {
    const supabase = await requireSupabase()

    const { error: authError } = await supabase.auth.signOut()

    if (authError) {
      return {
        success: false,
        error: authError.message,
      }
    }

    // Redirect to login page after successful logout
    redirect(ROUTES.LOGIN)
  } catch (error) {
    // If the error is a Next.js redirect, re-throw it
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    return {
      success: false,
      error: 'An unexpected error occurred during logout. Please try again.',
    }
  }
}
