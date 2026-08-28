// ============================================================================
// ExamForge AI — Parent API Routes
// ============================================================================
// POST /api/ai/parent/progress       — Get child progress analysis
// POST /api/ai/parent/weekly-summary — Generate weekly summary
// POST /api/ai/parent/home-learning  — Get home learning recommendations
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  getChildProgressAnalysis,
  generateWeeklySummary,
  getHomeLearningRecommendations,
} from '@/lib/ai'
import type {
  ChildProgressRequest,
  WeeklySummaryRequest,
  HomeLearningRequest,
} from '@/lib/ai'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { sanitizeAIOutput, detectHallucination } from '@/lib/ai/ai-quality-guards'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError, createSafeErrorResponse } from '@/lib/api/auth-guard'
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
  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult
  if (!['parent', 'school_admin', 'super_admin'].includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Rate limit AI endpoints
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action } = body

    switch (action) {
      case 'progress': {
        const req = body.data as ChildProgressRequest
        const result = await getChildProgressAnalysis(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'weekly-summary': {
        const req = body.data as WeeklySummaryRequest
        const result = await generateWeeklySummary(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'home-learning': {
        const req = body.data as HomeLearningRequest
        const result = await getHomeLearningRecommendations(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Parent API error:', error)
    return NextResponse.json(createSafeErrorResponse(error), { status: 500 })
  }
}
