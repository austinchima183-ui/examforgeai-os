// ============================================================================
// ExamForge AI — Exam Submission API
// ============================================================================
// POST: Submit exam (server-authoritative)
//
// SECURITY:
//   - Prevents duplicate submission
//   - Sets server submission timestamp (NEVER client timestamp)
//   - Locks the session (no further mutations)
//   - Triggers grading
//   - Returns server timestamp for client clock sync
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { submitExam, getServerTime, detectTamper } from '@/lib/cbt/server-authority'
import { checkDuplicateSubmission, checkModifiedStudentId, recordTamperEvent } from '@/lib/cbt/tamper-detection'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'

// ──────────────────────────────────────────────────────────────
// POST /api/cbt/submit — Submit Exam
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
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
    const cbtSubmitSchema = z.object({ sessionId: z.string().uuid(), userId: z.string().uuid(), clientTimestamp: z.string().datetime().optional() }).strict()
    const input = validateInput(cbtSubmitSchema, rawBody)
    if ('error' in input) return input.error
    const data = input.data as { sessionId: string; userId: string; clientTimestamp?: string }
    const { sessionId, userId, clientTimestamp } = data

    // ── Check for duplicate submission ──
    const duplicateCheck = await checkDuplicateSubmission(sessionId)
    if (duplicateCheck.isDuplicate) {
      await recordTamperEvent(sessionId, 'duplicate_submission', {
        existingStatus: duplicateCheck.existingStatus,
        submittedAt: duplicateCheck.submittedAt,
      })

      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: `Exam already ${duplicateCheck.existingStatus} — duplicate submission blocked`,
          existingStatus: duplicateCheck.existingStatus,
          submittedAt: duplicateCheck.submittedAt,
        },
        { status: 409 }
      )
    }

    // ── Fetch session for tamper checks ──
    const svc = createServiceClient()
    if (!svc) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: 'Database not configured',
        },
        { status: 503 }
      )
    }

    const { data: session } = await svc
      .from('exam_sessions')
      .select('id, exam_id, student_id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: 'Session not found',
        },
        { status: 404 }
      )
    }

    // ── Tamper detection: check modified student ID ──
    if (userId) {
      const userIdCheck = checkModifiedStudentId(userId, session.student_id)
      if (userIdCheck.isModified) {
        await recordTamperEvent(sessionId, 'modified_student_id', {
          clientUserId: userId,
          sessionUserId: session.student_id,
        })

        return NextResponse.json(
          {
            success: false,
            serverTimestamp: serverTime,
            error: 'Student ID mismatch — tampering detected',
          },
          { status: 403 }
        )
      }
    }

    // ── Tamper detection: check time drift ──
    if (clientTimestamp) {
      try {
        await detectTamper(sessionId, clientTimestamp)
      } catch {
        // Non-blocking — logged for audit
      }
    }

    // ── Submit the exam (server-authoritative) ──
    const result = await submitExam(sessionId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: result.error,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      serverTimestamp: serverTime,
      submittedAt: result.submittedAt,
      totalQuestions: result.totalQuestions,
      answeredQuestions: result.answeredQuestions,
    })
  } catch (error) {
    logger.error('Failed to submit exam', error)
    return NextResponse.json(
      {
        success: false,
        serverTimestamp: serverTime,
        error: 'Failed to submit exam',
      },
      { status: 500 }
    )
  }
}
