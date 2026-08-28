'use client'

// ============================================================================
// ExamForge AI — Client Fetch with CSRF
// ============================================================================
// Drop-in fetch wrapper for mutating API calls (POST/PUT/PATCH/DELETE).
//
// Why this exists: 19 API routes enforce CSRF via the `x-csrf-token` header
// (HMAC of the authenticated user's id). Client code never attached it, so
// every UI mutation silently failed with 403 CSRF_TOKEN_MISSING.
//
// Usage:
//   import { apiFetch } from '@/lib/api/client-fetch'
//   const res = await apiFetch('/api/cbt/session', {
//     method: 'POST',
//     body: { examId },
//   })
// ============================================================================

const CSRF_HEADER = 'x-csrf-token'
const CSRF_CACHE_MS = 10 * 60 * 1000 // re-fetch token every 10 minutes

let cachedToken: string | null = null
let cachedAt = 0
let inflight: Promise<string | null> | null = null

/** Fetch (and cache) the CSRF token for the current session. */
async function getCsrfToken(): Promise<string | null> {
  const now = Date.now()
  if (cachedToken && now - cachedAt < CSRF_CACHE_MS) {
    return cachedToken
  }
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch('/api/auth/csrf', { method: 'GET' })
      if (!res.ok) return null
      const data = await res.json()
      if (data?.token) {
        cachedToken = data.token as string
        cachedAt = Date.now()
        return cachedToken
      }
      return null
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Invalidate the cached token (e.g. after login/logout). */
export function resetCsrfToken(): void {
  cachedToken = null
  cachedAt = 0
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/**
 * fetch() wrapper that automatically attaches the CSRF token header to
 * mutating requests and JSON-serializes the body.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { body, headers, ...rest } = options
  const method = (rest.method ?? 'GET').toUpperCase()

  const finalHeaders = new Headers(headers as HeadersInit | undefined)
  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  // Attach CSRF token to mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken()
    if (token) {
      finalHeaders.set(CSRF_HEADER, token)
    }
  }

  return fetch(url, {
    ...rest,
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
