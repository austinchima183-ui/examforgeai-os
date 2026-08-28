// ============================================================================
// ExamForge AI — Feedback API (Single Item)
// ============================================================================
// GET:    Get feedback by ID (IDOR protected)
// PATCH:  Update feedback (status, assignment, priority)
// DELETE: Soft-delete feedback
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse, notFoundError, forbiddenError } from '@/lib/api/auth-guard'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { updateFeedbackSchema } from '@/lib/feedback/validators'
import { getFeedbackById, updateFeedback, deleteFeedback } from '@/lib/feedback/feedback-service'
import { createLogger } from '@/lib/observability/logger'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:feedback:id')

// ──────────────────────────────────────────────────────────────
// GET /api/feedback/[id] — Get by ID
// ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const idResult = validateId(id, 'feedbackId')
    if ('error' in idResult) return idResult.error

    const result = await getFeedbackById(
      idResult.data,
      auth.user.id,
      auth.user.role,
      auth.user.schoolId
    )

    if ('error' in result) {
      return notFoundError(result.error)
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    log.error('Unexpected error in GET /api/feedback/[id]', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'getFeedbackById' }),
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH /api/feedback/[id] — Update
// ──────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const { id } = await params
    const idResult = validateId(id, 'feedbackId')
    if ('error' in idResult) return idResult.error

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(updateFeedbackSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error

    // Only staff/admin can change status, assign, or set duplicate
    const input = bodyResult.data
    const isStaff = auth.user.role === 'school_admin' || auth.user.role === 'super_admin' || auth.user.role === 'teacher'

    if (!isStaff && (input.status !== undefined || input.assigneeId !== undefined || input.duplicateOfId !== undefined)) {
      return forbiddenError('Only staff members can change status, assign, or mark as duplicate')
    }

    const result = await updateFeedback(
      idResult.data,
      auth.user.id,
      input,
      auth.user.role,
      auth.user.schoolId
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    log.error('Unexpected error in PATCH /api/feedback/[id]', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'updateFeedback' }),
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE /api/feedback/[id] — Soft Delete
// ──────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const { id } = await params
    const idResult = validateId(id, 'feedbackId')
    if ('error' in idResult) return idResult.error

    const result = await deleteFeedback(
      idResult.data,
      auth.user.id,
      auth.user.role,
      auth.user.schoolId
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Unexpected error in DELETE /api/feedback/[id]', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'deleteFeedback' }),
      { status: 500 }
    )
  }
}
