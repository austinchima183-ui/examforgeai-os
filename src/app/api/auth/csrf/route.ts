import { NextResponse, type NextRequest } from 'next/server'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { generateCsrfToken } from '@/lib/security'

// ============================================================================
// ExamForge AI — CSRF Token Endpoint
// ============================================================================
// GET /api/auth/csrf
//
// Returns the CSRF token bound to the authenticated user's session. The token
// is HMAC(CSRF_SECRET, userId) — safe to hand to the authenticated user
// because it is only valid for THEIR user id, and mutation routes verify it
// against the authenticated caller's id (not a client-supplied one).
//
// The client fetches this once per session and attaches it to mutating
// requests via the `x-csrf-token` header (see src/lib/api/client-fetch.ts).
// ============================================================================

export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const token = generateCsrfToken(auth.user.id)
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json(
      { error: 'CSRF secret not configured' },
      { status: 503 }
    )
  }
}
