// ============================================================================
// ExamForge AI — Feedback API (Main)
// ============================================================================
// POST: Create feedback (auth required, Zod validated)
// GET:  List feedback with filters and pagination
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import { createFeedbackSchema, feedbackFiltersSchema } from '@/lib/feedback/validators'
import { createFeedback, getFeedback } from '@/lib/feedback/feedback-service'
import { createLogger } from '@/lib/observability/logger'
import type { FeedbackFilters } from '@/lib/feedback/types'

const log = createLogger('api:feedback')

// ──────────────────────────────────────────────────────────────
// POST /api/feedback — Create Feedback
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (Mission Ω-7 hardening) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(createFeedbackSchema, rawBody)

    if ('error' in bodyResult) return bodyResult.error

    const input = bodyResult.data

    // Derive school_id from authenticated user if not provided
    const schoolId = input.schoolId ?? auth.user.schoolId ?? null

    const result = await createFeedback(auth.user.id, {
      ...input,
      schoolId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/feedback', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'createFeedback' }),
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/feedback — List Feedback
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate filter parameters
    const filterResult = validateInput(feedbackFiltersSchema, Object.fromEntries(searchParams.entries()))

    let filters: FeedbackFilters

    if ('error' in filterResult) {
      // Fall back to basic pagination if filter validation fails
      const { page, limit, offset } = validatePagination(searchParams)
      void offset
      filters = { page, limit }
    } else {
      filters = filterResult.data
    }

    // Scope to user's school for non-super-admin
    if (
      auth.user.role !== 'super_admin' &&
      auth.user.schoolId &&
      !filters.schoolId
    ) {
      filters.schoolId = auth.user.schoolId
    }

    const result = await getFeedback(filters)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    log.error('Unexpected error in GET /api/feedback', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'listFeedback' }),
      { status: 500 }
    )
  }
}
