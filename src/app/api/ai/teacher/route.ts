// ============================================================================
// ExamForge AI — Teacher API Routes
// ============================================================================
// POST /api/ai/teacher/lesson-plan     — Generate a lesson plan
// POST /api/ai/teacher/generate-questions — Generate exam questions
// POST /api/ai/teacher/rubric          — Generate a rubric
// POST /api/ai/teacher/mark            — AI-assisted marking
// POST /api/ai/teacher/interventions   — Suggest interventions for a student
// POST /api/ai/teacher/predict-risk    — Predict struggling students in a class
// POST /api/ai/teacher/worksheet       — Generate a worksheet
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  generateLessonPlan,
  generateQuestions,
  saveGeneratedQuestions,
  generateRubric,
  markAnswer,
  suggestInterventions,
  predictStrugglingStudents,
  generateWorksheet,
} from '@/lib/ai'
import type {
  LessonPlanRequest,
  QuestionGenerationRequest,
  RubricRequest,
  MarkingRequest,
  InterventionRequest,
  WorksheetRequest,
} from '@/lib/ai'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { aiCompleteSchema } from '@/lib/validators/api-schemas'
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

// ──────────────────────────────────────────────────────────────
// Lesson Plan Generation
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Feature gate: AI question generation requires Professional+ ───
  const featureDenial = await requireFeature('ai_question_generation', request)
  if (featureDenial) return featureDenial

  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult
  if (!['teacher', 'school_admin', 'super_admin'].includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Rate limit AI endpoints
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const aiActionSchema = aiCompleteSchema.extend({ action: z.string().min(1), data: z.any() })
    const bodyResult = validateInput(z.object({ action: z.string().min(1), data: z.any() }), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action } = body

    switch (action) {
      case 'lesson-plan': {
        const req = body.data as LessonPlanRequest
        const result = await generateLessonPlan(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'generate-questions': {
        const req = body.data as QuestionGenerationRequest
        const result = await generateQuestions(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'save-questions': {
        const { questions, generationId, subjectId, topicId } = body.data as {
          questions: Array<import('@/lib/ai').GeneratedQuestion>
          generationId: string
          subjectId?: string
          topicId?: string
        }
        const result = await saveGeneratedQuestions(
          questions, generationId, authResult.user.id, authResult.user.schoolId, subjectId, topicId
        )
        return NextResponse.json(applyAISafety(result))
      }

      case 'rubric': {
        const req = body.data as RubricRequest
        const result = await generateRubric(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'mark': {
        const req = body.data as MarkingRequest
        const result = await markAnswer(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'interventions': {
        const req = body.data as InterventionRequest
        const result = await suggestInterventions(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'predict-risk': {
        const { classId } = body.data as { classId: string }
        const result = await predictStrugglingStudents(classId, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'worksheet': {
        const req = body.data as WorksheetRequest
        const result = await generateWorksheet(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Teacher API error:', error)
    return NextResponse.json(createSafeErrorResponse(error), { status: 500 })
  }
}
