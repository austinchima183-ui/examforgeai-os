import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiAuth,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
  forbiddenError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validateId } from '@/lib/api/validate'
import {
  getActiveSessions,
  terminateSession,
} from '@/lib/enterprise-security/session-management'
import { sessionQuerySchema } from '@/lib/validators/api-schemas'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/security/sessions — List active sessions
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')

    // SECURITY: Only super_admin can query other users' sessions.
    // All other users can only see their own sessions.
    let userId: string
    if (requestedUserId && requestedUserId !== tenant.userId) {
      if (auth.user.role !== 'super_admin') {
        return forbiddenError('You can only view your own sessions')
      }
      userId = requestedUserId
    } else {
      userId = tenant.userId
    }

    const sessions = await getActiveSessions(userId)

    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'security/sessions:GET' }), { status: 500 })
  }
}

// DELETE /api/security/sessions — Terminate session
export async function DELETE(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 })
    }

    const sessionIdResult = validateId(sessionId, 'sessionId')
    if ('error' in sessionIdResult) return sessionIdResult.error

    // Terminate session
    await terminateSession(sessionId)

    return NextResponse.json({ success: true, terminatedSessionId: sessionId })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'security/sessions:DELETE' }), { status: 500 })
  }
}
