// ============================================================================
// ExamForge AI — Feedback Analytics API
// ============================================================================
// GET: Feedback analytics dashboard data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { createLogger } from '@/lib/observability/logger'
import { getFeedbackOverview, getFeedbackTrends, getFeedbackByCategory, getResolutionMetrics, getTopReporters, getAIRatingSummary } from '@/lib/feedback/analytics-service'

const log = createLogger('api:feedback:analytics')

// ──────────────────────────────────────────────────────────────
// GET /api/feedback/analytics — Dashboard Analytics
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') ?? undefined
    const days = parseInt(searchParams.get('days') ?? '30', 10)
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined

    // Scope to user's school for non-super-admin
    const effectiveSchoolId = auth.user.role === 'super_admin'
      ? schoolId
      : auth.user.schoolId ?? schoolId

    // Only staff can view analytics
    const isStaff = auth.user.role === 'school_admin' || auth.user.role === 'super_admin' || auth.user.role === 'teacher'
    if (!isStaff) {
      // Students/parents can only see their own stats (simplified overview)
      const overviewResult = await getFeedbackOverview(effectiveSchoolId, { from, to })
      if ('error' in overviewResult) {
        return NextResponse.json({ error: overviewResult.error }, { status: 400 })
      }
      return NextResponse.json({ data: { overview: overviewResult.data } })
    }

    // Staff: full analytics
    const [
      overviewResult,
      trendsResult,
      categoryResult,
      metricsResult,
      reportersResult,
      aiRatingResult,
    ] = await Promise.all([
      getFeedbackOverview(effectiveSchoolId, { from, to }),
      getFeedbackTrends(effectiveSchoolId, days),
      getFeedbackByCategory(effectiveSchoolId),
      getResolutionMetrics(effectiveSchoolId),
      getTopReporters(effectiveSchoolId, 10),
      getAIRatingSummary(effectiveSchoolId),
    ])

    // Collect errors
    const errors: string[] = []
    if ('error' in overviewResult) errors.push(overviewResult.error)
    if ('error' in trendsResult) errors.push(trendsResult.error)
    if ('error' in categoryResult) errors.push(categoryResult.error)
    if ('error' in metricsResult) errors.push(metricsResult.error)
    if ('error' in reportersResult) errors.push(reportersResult.error)
    if ('error' in aiRatingResult) errors.push(aiRatingResult.error)

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    // All results are successful (errors checked above), narrow types before accessing .data
    if (!('data' in overviewResult) || !('data' in trendsResult) || !('data' in categoryResult) || !('data' in metricsResult) || !('data' in reportersResult) || !('data' in aiRatingResult)) {
      return NextResponse.json({ error: 'Unexpected missing data' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        overview: overviewResult.data,
        trends: trendsResult.data,
        categories: categoryResult.data,
        resolution: metricsResult.data,
        topReporters: reportersResult.data,
        aiRatings: aiRatingResult.data,
      },
    })
  } catch (error) {
    log.error('Unexpected error in GET /api/feedback/analytics', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'getFeedbackAnalytics' }),
      { status: 500 }
    )
  }
}
