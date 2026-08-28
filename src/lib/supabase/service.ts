import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// ExamForge AI — Server-Side Service Client (Service Role)
// ============================================================================
// Trusted server-only client that bypasses RLS. Use ONLY in server code
// paths that already enforce authentication + authorization guards
// (e.g. the CBT integrity engine behind requireApiAuth).
//
// SECURITY RULES:
//   1. NEVER import this module from a client component.
//   2. NEVER send its responses to the browser without stripping
//      sensitive fields (e.g. questions.correct_answer).
//   3. Every caller must run its own auth/authorization checks first.
// ============================================================================

let cached: SupabaseClient | null = null

/**
 * Create (or reuse) the service-role Supabase client.
 * Returns null when the service key is not configured (e.g. local dev
 * without credentials) — callers must handle that gracefully.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key || url.includes('placeholder')) {
    return null
  }

  if (cached) return cached

  cached = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cached
}

/**
 * Throwing variant for code paths that REQUIRE the service client
 * (CBT integrity engine — server-authoritative operations).
 */
export function requireServiceClient(): SupabaseClient {
  const client = createServiceClient()
  if (!client) {
    throw new Error(
      '[Supabase] Service client unavailable — SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'The CBT integrity engine requires server-side database authority.'
    )
  }
  return client
}
