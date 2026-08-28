// ============================================================================
// ExamForge AI — School Admin API Routes
// ============================================================================
// POST /api/ai/school-admin/staffing    — Get staffing recommendations
// POST /api/ai/school-admin/enrollment  — Forecast enrollment
// POST /api/ai/school-admin/revenue     — Forecast revenue
// POST /api/ai/school-admin/risks       — Detect school risks
// POST /api/ai/school-admin/attendance  — Predict attendance patterns
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  getStaffingRecommendations,
  forecastEnrollment,
  forecastRevenue,
  detectSchoolRisks,
  predictSchoolAttendance,
} from '@/lib/ai'
import type {
  StaffingRequest,
  EnrollmentForecastRequest,
  RevenueForecastRequest,
  RiskDetectionRequest,
  AttendancePredictionRequest,
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
  // ─── Feature gate: Predictive analytics requires Professional+ ───
  const featureDenial = await requireFeature('predictive_analytics', request)
  if (featureDenial) return featureDenial

  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult
  if (!['school_admin', 'super_admin'].includes(authResult.user.role)) {
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
      case 'staffing': {
        const req = body.data as StaffingRequest
        const result = await getStaffingRecommendations(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'enrollment': {
        const req = body.data as EnrollmentForecastRequest
        const result = await forecastEnrollment(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'revenue': {
        const req = body.data as RevenueForecastRequest
        const result = await forecastRevenue(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'risks': {
        const req = body.data as RiskDetectionRequest
        const result = await detectSchoolRisks(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      case 'attendance': {
        const req = body.data as AttendancePredictionRequest
        const result = await predictSchoolAttendance(req, authResult.user.id, authResult.user.schoolId)
        return NextResponse.json(applyAISafety(result))
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI School Admin API error:', error)
    return NextResponse.json(createSafeErrorResponse(error), { status: 500 })
  }
}
