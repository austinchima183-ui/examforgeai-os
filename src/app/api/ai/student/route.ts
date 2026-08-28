// ============================================================================
// ExamForge AI — Student API Routes
// ============================================================================
// POST /api/ai/student/tutor          — AI tutor chat session
// POST /api/ai/student/study-plan    — Generate personalized study plan
// POST /api/ai/student/revision      — Generate revision plan
// POST /api/ai/student/practice      — Generate practice questions
// POST /api/ai/student/weaknesses    — Detect weaknesses
// POST /api/ai/student/explain       — Explain any concept
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  aiTutorChat,
  generateStudyPlan,
  revisionCoachPlan,
  generatePracticeQuestions,
  detectWeaknesses,
  explainConcept,
} from '@/lib/ai'
import type {
  TutorSessionRequest,
  StudyPlanRequest,
  RevisionCoachRequest,
  PracticeRequest,
  WeaknessDetectionRequest,
  ExplainRequest,
} from '@/lib/ai'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { sanitizeAIOutput, detectHallucination } from '@/lib/ai/ai-quality-guards'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { requireFeature } from '@/lib/billing/plan-gate'
import { enforceCsrf } from '@/lib/api/csrf-guard'

/** Apply AI safety guards: sanitize output and detect hallucination */
function applyAISafety(result: unknown) {
  const text = typeof result === 'string' ? result : JSON.stringify(result)
  const sanitized = sanitizeAIOutput(text)
  const hallucinationCheck = detectHallucination(sanitized)
  let data: unknown
  try { data = JSON.parse(sanitized) } catch { data = result }
  return {
    success: true as const,
    data,
    ...(hallucinationCheck.isHallucination ? { warning: 'Response may contain inaccuracies — verify with authoritative sources' } : {})
  }
}

export async function POST(request: NextRequest) {
  // ─── Feature gate: AI tutor requires Starter+ ───
  const featureDenial = await requireFeature('ai_tutor', request)
  if (featureDenial) return featureDenial

  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult
  if (!['student', 'parent', 'teacher', 'school_admin', 'super_admin'].includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Rate limit AI endpoints
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1), data: z.any() }), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action } = body

    switch (action) {
      case 'tutor': {
        const req = body.data as TutorSessionRequest
        const result = await aiTutorChat(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'study-plan': {
        const req = body.data as StudyPlanRequest
        const result = await generateStudyPlan(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'revision': {
        const req = body.data as RevisionCoachRequest
        const result = await revisionCoachPlan(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'practice': {
        const req = body.data as PracticeRequest
        const result = await generatePracticeQuestions(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'weaknesses': {
        const req = body.data as WeaknessDetectionRequest
        const result = await detectWeaknesses(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'explain': {
        const req = body.data as ExplainRequest
        const result = await explainConcept(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Student API error:', error)
    return NextResponse.json(createSafeErrorResponse(error), { status: 500 })
  }
}
