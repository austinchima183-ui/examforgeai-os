// ============================================================================
// ExamForge AI — Predictive Analytics API Routes
// ============================================================================
// POST /api/ai/predictive/dropout     — Predict student dropout risk
// POST /api/ai/predictive/failure     — Predict exam failure
// POST /api/ai/predictive/attendance  — Predict attendance
// POST /api/ai/predictive/revenue     — Predict revenue
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  predictDropout,
  predictFailure,
  predictStudentAttendance,
  predictRevenue,
} from '@/lib/ai'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { requireFeature } from '@/lib/billing/plan-gate'

export async function POST(request: NextRequest) {
  // ─── Feature gate: Predictive analytics requires Professional+ ───
  const featureDenial = await requireFeature('predictive_analytics', request)
  if (featureDenial) return featureDenial

  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['school_admin', 'super_admin', 'teacher'].includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfPred = enforceCsrf(request, authResult)
  if (csrfPred) return csrfPred

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action } = body
    const schoolId = authResult.user.schoolId ?? ''

    switch (action) {
      case 'dropout': {
        const result = await predictDropout(schoolId, authResult.user.id)
        return NextResponse.json({ success: true, data: result })
      }

      case 'failure': {
        const { examId } = body.data as { examId: string }
        const result = await predictFailure(schoolId, examId, authResult.user.id)
        return NextResponse.json({ success: true, data: result })
      }

      case 'attendance': {
        const { studentId, daysToPredict } = body.data as { studentId: string; daysToPredict?: number }
        const result = await predictStudentAttendance(schoolId, studentId, authResult.user.id, daysToPredict)
        return NextResponse.json({ success: true, data: result })
      }

      case 'revenue': {
        const { monthsToPredict } = body.data as { monthsToPredict?: number }
        const result = await predictRevenue(schoolId, authResult.user.id, monthsToPredict)
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Predictive API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
