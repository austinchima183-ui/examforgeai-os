// ============================================================================
// ExamForge AI — Feedback Comments API
// ============================================================================
// GET:  List comments for a feedback item
// POST: Add a comment to a feedback item
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse, notFoundError } from '@/lib/api/auth-guard'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { addCommentSchema } from '@/lib/feedback/validators'
import { addComment, getComments } from '@/lib/feedback/feedback-service'
import { createLogger } from '@/lib/observability/logger'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:feedback:comments')

// ──────────────────────────────────────────────────────────────
// GET /api/feedback/[id]/comments — List Comments
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

    // Only staff can see internal comments
    const isStaff = auth.user.role === 'school_admin' || auth.user.role === 'super_admin' || auth.user.role === 'teacher'

    const result = await getComments(idResult.data, isStaff)

    if ('error' in result) {
      return notFoundError(result.error)
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    log.error('Unexpected error in GET /api/feedback/[id]/comments', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'getComments' }),
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/feedback/[id]/comments — Add Comment
// ──────────────────────────────────────────────────────────────

export async function POST(
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
    const bodyResult = validateInput(addCommentSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error

    const { content, isInternal } = bodyResult.data

    // Only staff can add internal comments
    const isStaff = auth.user.role === 'school_admin' || auth.user.role === 'super_admin' || auth.user.role === 'teacher'
    const canBeInternal = isStaff && isInternal

    const result = await addComment(
      idResult.data,
      auth.user.id,
      content,
      canBeInternal
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/feedback/[id]/comments', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'addComment' }),
      { status: 500 }
    )
  }
}
