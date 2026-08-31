// ============================================================================
// ExamForge AI — CSRF Guard for Mutation API Routes
// ============================================================================
// Validates CSRF tokens on all mutation endpoints (POST, PUT, DELETE, PATCH)
// to prevent Cross-Site Request Forgery attacks.
//
// Uses the HMAC-based CSRF tokens from @/lib/security (generateCsrfToken /
// validateCsrfToken) with timing-safe comparison.
//
// Usage in API routes:
//   import { requireCsrf } from '@/lib/api/csrf-guard'
//
//   export async function POST(request: NextRequest) {
//     const auth = await requireApiAuth(request)
//     if (auth instanceof NextResponse) return auth
//
//     const csrfResult = requireCsrf(request, auth.user.id)
//     if (csrfResult) return csrfResult  // 403 CSRF validation failed
//
//     // ... process mutation
//   }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from '@/lib/security'

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/**
 * The HTTP header name for the CSRF token.
 * Clients MUST send this header on every mutation request.
 */
export const CSRF_HEADER = 'x-csrf-token'

/**
 * Alternative: CSRF token in request body field name.
 * Checked as a fallback if the header is not present.
 */
export const CSRF_BODY_FIELD = 'csrfToken'

// ──────────────────────────────────────────────────────────────
// CSRF Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate the CSRF token on a mutation request.
 *
 * Expects the CSRF token in the `X-CSRF-Token` header, with a fallback
 * to a `csrfToken` field in the JSON body. The sessionId is typically
 * the authenticated user's ID — this binds the token to the user's
 * session, preventing token theft across sessions.
 *
 * @param request - The incoming Next.js API request
 * @param sessionId - The session identifier (typically auth.user.id)
 * @returns A 403 NextResponse if validation fails, or null if valid
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const auth = await requireApiAuth(request)
 *   if (auth instanceof NextResponse) return auth
 *
 *   const csrfResult = requireCsrf(request, auth.user.id)
 *   if (csrfResult) return csrfResult  // 403
 *
 *   // CSRF validated — proceed with mutation
 * }
 * ```
 */
export function requireCsrf(
  request: NextRequest,
  sessionId: string
): NextResponse | null {
  // ── Safe-method exemption ─────────────────────────────────
  // CSRF protects against unwanted STATE CHANGES. GET/HEAD/OPTIONS
  // are safe (no state mutation), so they must never be CSRF-gated.
  // Gating them breaks caching, prefetching, and plain links — this
  // single check repairs every remaining GET-CSRF mistake app-wide.
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  // Extract CSRF token from header first, then body fallback
  const token = request.headers.get(CSRF_HEADER)

  if (!token) {
    return NextResponse.json(
      {
        error: 'CSRF token required',
        code: 'CSRF_TOKEN_MISSING',
      },
      { status: 403 }
    )
  }

  const isValid = validateCsrfToken(token, sessionId)

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      },
      { status: 403 }
    )
  }

  // Valid — return null (no error)
  return null
}

/**
 * Validate CSRF token with body fallback.
 *
 * Use this variant when the CSRF token may be sent in the JSON body
 * instead of a header (e.g., form submissions).
 *
 * @param request - The incoming Next.js API request
 * @param sessionId - The session identifier
 * @param body - The parsed request body (for csrfToken field fallback)
 * @returns A 403 NextResponse if validation fails, or null if valid
 */
export function requireCsrfWithBody(
  request: NextRequest,
  sessionId: string,
  body?: Record<string, unknown>
): NextResponse | null {
  // Safe methods never mutate state — exempt from CSRF (see requireCsrf)
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  // Try header first
  let token = request.headers.get(CSRF_HEADER)

  // Fallback to body field
  if (!token && body && typeof body[CSRF_BODY_FIELD] === 'string') {
    token = body[CSRF_BODY_FIELD] as string
  }

  if (!token) {
    return NextResponse.json(
      {
        error: 'CSRF token required',
        code: 'CSRF_TOKEN_MISSING',
      },
      { status: 403 }
    )
  }

  const isValid = validateCsrfToken(token, sessionId)

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      },
      { status: 403 }
    )
  }

  return null
}

// ──────────────────────────────────────────────────────────────
// Convenience: CSRF + Auth combined check
// ──────────────────────────────────────────────────────────────

/**
 * Check both authentication and CSRF in one call.
 * Useful for simple mutation routes that just need auth + CSRF.
 *
 * @param request - The incoming Next.js API request
 * @param authResult - The result from requireApiAuth (must be AuthResult, not NextResponse)
 * @returns A 403 NextResponse if CSRF fails, or null if valid
 *
 * @example
 * ```ts
 * const auth = await requireApiAuth(request)
 * if (auth instanceof NextResponse) return auth
 *
 * const csrfResult = enforceCsrf(request, auth)
 * if (csrfResult) return csrfResult
 * ```
 */
export function enforceCsrf(
  request: NextRequest,
  authResult: { user: { id: string } }
): NextResponse | null {
  return requireCsrf(request, authResult.user.id)
}
