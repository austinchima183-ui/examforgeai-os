'use client'

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

// ============================================================================
// ExamForge AI — Browser Supabase Client (Singleton Pattern)
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const globalForSupabase = globalThis as unknown as {
  supabaseBrowserClient: ReturnType<typeof createSupabaseBrowserClient> | undefined
}

/**
 * Create a Supabase browser client. Always returns a connected client.
 * Throws if Supabase is not configured (fatal in production).
 */
export function createClient() {
  if (globalForSupabase.supabaseBrowserClient) {
    return globalForSupabase.supabaseBrowserClient
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[Supabase] Cannot create browser client — NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.'
    )
  }

  globalForSupabase.supabaseBrowserClient = createSupabaseBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )

  return globalForSupabase.supabaseBrowserClient
}

/**
 * Create a Supabase browser client that may be null if not configured.
 * Use in components that gracefully handle the absence of Supabase.
 */
export function createClientOrNull() {
  if (globalForSupabase.supabaseBrowserClient) {
    return globalForSupabase.supabaseBrowserClient
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  globalForSupabase.supabaseBrowserClient = createSupabaseBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )

  return globalForSupabase.supabaseBrowserClient
}
