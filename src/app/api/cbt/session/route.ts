// ============================================================================
// ExamForge AI — Authoritative Exam Session API
// ============================================================================
// POST: Start exam (server-authoritative)
// GET:  Get session state (for reconnect)
//
// All responses include serverTimestamp for client clock synchronization.
// The client MUST use the serverTimestamp to adjust its local clock
// for display purposes only — NEVER for timing decisions.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { startExam, handleReconnect, getServerTime } from '@/lib/cbt/server-authority'
import { detectTamper } from '@/lib/cbt/server-authority'
import { logger } from '@/lib/utils/logger'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { cbtSessionStartSchema } from '@/lib/validators/api-schemas'

// ──────────────────────────────────────────────────────────────
// POST /api/cbt/session — Start Exam
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  const serverTime = getServerTime()

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(cbtSessionStartSchema, rawBody)
    if ('error' in input) return input.error
    const { userId, examId, clientTimestamp } = input.data

    // ── Verify userId matches authenticated user (prevent impersonation) ──
    if (userId !== auth.user.id) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: 'User ID mismatch — impersonation blocked',
        },
        { status: 403 }
      )
    }

    // ── Tamper detection: check time drift ──
    // We don't block on time drift, but we log it for audit
    if (clientTimestamp) {
      try {
        await detectTamper(`pre-start:${examId}:${userId}`, clientTimestamp)
      } catch {
        // Tamper detection failure shouldn't block exam start
        // The detection itself will be logged in the audit trail
      }
    }

    // ── Start the exam (server-authoritative) ──
    const result = await startExam(userId, examId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: result.error,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      serverTimestamp: serverTime,
      sessionId: result.sessionId,
      startedAt: result.startedAt,
      endsAt: result.endsAt,
      questions: result.questions,
    })
  } catch (error) {
    logger.error('Failed to start exam session', error)
    return NextResponse.json(
      {
        success: false,
        serverTimestamp: serverTime,
        error: 'Failed to start exam session',
      },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/cbt/session — Get Session State (for reconnect)
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed: getRlAllowed, retryAfter: getRlRetry } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!getRlAllowed) return rateLimitError(getRlRetry)

  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  const serverTime = getServerTime()

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: 'sessionId is required',
        },
        { status: 400 }
      )
    }

    const sessionIdResult = validateId(sessionId, 'sessionId')
    if ('error' in sessionIdResult) return sessionIdResult.error

    // ── Handle reconnect (server-authoritative) ──
    const result = await handleReconnect(sessionId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: result.error,
          status: result.status,
        },
        { status: result.isExpired ? 410 : 404 }
      )
    }

    return NextResponse.json({
      success: true,
      serverTimestamp: serverTime,
      sessionId: result.sessionId,
      examId: result.examId,
      startedAt: result.startedAt,
      endsAt: result.endsAt,
      remainingSeconds: result.remainingSeconds,
      isExpired: result.isExpired,
      answers: result.answers,
      currentQuestionIndex: result.currentQuestionIndex,
    })
  } catch (error) {
    logger.error('Failed to get exam session state', error)
    return NextResponse.json(
      {
        success: false,
        serverTimestamp: serverTime,
        error: 'Failed to get session state',
      },
      { status: 500 }
    )
  }
}
