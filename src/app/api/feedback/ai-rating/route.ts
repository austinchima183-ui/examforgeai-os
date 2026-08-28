// ============================================================================
// ExamForge AI — AI Rating API
// ============================================================================
// POST: Submit AI response rating (lightweight, used inline)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { aiRatingSchema } from '@/lib/feedback/validators'
import { submitAIRating } from '@/lib/feedback/feedback-service'
import { createLogger } from '@/lib/observability/logger'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:feedback:ai-rating')

// ──────────────────────────────────────────────────────────────
// POST /api/feedback/ai-rating — Submit AI Response Rating
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(aiRatingSchema, rawBody)

    if ('error' in bodyResult) return bodyResult.error

    const rating = bodyResult.data

    const result = await submitAIRating(auth.user.id, rating)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/feedback/ai-rating', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'submitAIRating' }),
      { status: 500 }
    )
  }
}
