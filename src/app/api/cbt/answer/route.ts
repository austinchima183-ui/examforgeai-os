// ============================================================================
// ExamForge AI — Answer Submission API
// ============================================================================
// POST: Save answer (server-authoritative timing)
//
// SECURITY:
//   - Validates session is active
//   - Validates exam is not expired (server time)
//   - Validates question belongs to exam
//   - Saves with server timestamp (NEVER client timestamp)
//   - Returns server timestamp of save for client clock sync
//   - Client timestamp is logged for forensic analysis only
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { saveAnswer, getServerTime, detectTamper } from '@/lib/cbt/server-authority'
import { checkModifiedExamId, checkModifiedStudentId, recordTamperEvent } from '@/lib/cbt/tamper-detection'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'

// ──────────────────────────────────────────────────────────────
// POST /api/cbt/answer — Save Answer
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
    const rawBody = bodyJson.data as Record<string, unknown>
    const cbtAnswerSchema = z.object({ sessionId: z.string().uuid(), questionId: z.string().uuid(), answer: z.string() }).strict()
    const input = validateInput(cbtAnswerSchema, rawBody)
    if ('error' in input) return input.error
    const data = input.data as { sessionId: string; questionId: string; answer: string }
    const { sessionId, questionId, answer } = data
    const clientTimestamp = rawBody.clientTimestamp as number | undefined
    const examId = rawBody.examId as string | undefined
    const userId = rawBody.userId as string | undefined

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

    // ── Tamper detection: check modified exam ID ──
    if (examId) {
      const examIdCheck = checkModifiedExamId(examId, session.exam_id)
      if (examIdCheck.isModified) {
        await recordTamperEvent(sessionId, 'modified_exam_id', {
          clientExamId: examId,
          sessionExamId: session.exam_id,
        })

        return NextResponse.json(
          {
            success: false,
            serverTimestamp: serverTime,
            error: 'Exam ID mismatch — tampering detected',
          },
          { status: 403 }
        )
      }
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
        await detectTamper(sessionId, String(clientTimestamp))
      } catch {
        // Non-blocking — logged for audit
      }
    }

    // ── Save the answer (server-authoritative) ──
    const result = await saveAnswer(sessionId, questionId, answer)

    if (!result.success) {
      const statusCode = result.error?.includes('expired')
        ? 410
        : result.error?.includes('closed')
          ? 409
          : 400

      return NextResponse.json(
        {
          success: false,
          serverTimestamp: serverTime,
          error: result.error,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      serverTimestamp: result.serverTimestamp,
      answerVersion: result.answerVersion,
    })
  } catch (error) {
    logger.error('Failed to save answer', error)
    return NextResponse.json(
      {
        success: false,
        serverTimestamp: serverTime,
        error: 'Failed to save answer',
      },
      { status: 500 }
    )
  }
}
