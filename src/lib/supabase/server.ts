'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// ExamForge AI — Server-Side Supabase Client
// ============================================================================
// Production: Always returns a connected client.
// Development: Returns a connected client when env vars are set.
// If env vars are missing, createClient throws; createClientOrNull returns null
// so the caller can fall back to a dev adapter.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isDevPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return true
  return url.includes('placeholder') || url.includes('examforge-dev-placeholder')
}

/**
 * Create a Supabase server client. Always returns a connected client.
 * Throws if Supabase is not configured (fatal in production).
 * In development, logs a warning and throws with a helpful message.
 */
export async function createClient(): Promise<SupabaseClient> {
  if (isDevPlaceholderUrl(SUPABASE_URL) || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[Supabase] Cannot create client — NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
      'Set these environment variables to connect to Supabase.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[Supabase Server] Failed to set cookies — this is expected in Server Components.',
              error
            )
          }
        }
      },
    },
  })
}

/**
 * Create a Supabase server client that may be null if not configured.
 * Use this in components that gracefully handle the absence of Supabase
 * (e.g., rendering a dev-mode fallback UI).
 *
 * NOTE: When env vars ARE set (production + this dev env), this returns
 * a connected client typed as SupabaseClient (non-null). Callers should
 * still null-check to satisfy the type system.
 */
export async function createClientOrNull(): Promise<SupabaseClient | null> {
  if (isDevPlaceholderUrl(SUPABASE_URL) || !SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === 'development') {
      if (!(globalThis as Record<string, unknown>).__supabaseDevWarned) {
        console.warn(
          '[Supabase] Running in DEV ADAPTER mode — UI renders with local data. ' +
          'Connect Supabase credentials for live data.'
        )
        ;(globalThis as Record<string, unknown>).__supabaseDevWarned = true
      }
    }
    return null
  }

  return createClient()
}

/**
 * Require a Supabase client — throws with a clean error message if not configured.
 * Use this in API routes and server actions where Supabase is mandatory.
 *
 * @example
 * const supabase = await requireSupabase()
 * // supabase is now typed as SupabaseClient (non-null)
 */
export async function requireSupabase(): Promise<SupabaseClient> {
  const client = await createClientOrNull()
  if (!client) {
    throw new Error('[Supabase] Backend unavailable — SUPABASE_URL or ANON_KEY not set.')
  }
  return client
}
