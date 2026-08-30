import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiRole,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { getFinancialAnalytics } from '@/lib/enterprise-analytics/financial-analytics-service'
import { getAcademicAnalytics } from '@/lib/enterprise-analytics/academic-analytics-service'
import { getGovernmentAnalytics } from '@/lib/enterprise-analytics/government-analytics-service'
import { getRiskAnalytics } from '@/lib/enterprise-analytics/risk-analytics-service'
import { getEnrollmentAnalytics } from '@/lib/enterprise-analytics/enrollment-analytics-service'
import { getAIAnalytics } from '@/lib/enterprise-analytics/ai-analytics-service'
import type { AnalyticsTimePeriod } from '@/lib/enterprise-analytics/types'
import { analyticsQuerySchema } from '@/lib/validators/api-schemas'
import { requireFeature } from '@/lib/billing/plan-gate'

const VALID_ANALYTICS_TYPES = ['financial', 'academic', 'government', 'risk', 'enrollment', 'ai'] as const
const VALID_PERIODS = ['day', 'week', 'month', 'quarter', 'year'] as const

// Map URL period param to AnalyticsTimePeriod
function mapPeriod(period: typeof VALID_PERIODS[number]): AnalyticsTimePeriod {
  switch (period) {
    case 'day': return 'last_7_days'
    case 'week': return 'last_7_days'
    case 'month': return 'last_30_days'
    case 'quarter': return 'this_quarter'
    case 'year': return 'this_year'
    default: return 'last_30_days'
  }
}

// GET /api/analytics/enterprise — Get analytics dashboard
// type: financial | academic | government | risk | enrollment | ai
export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin/teacher only)
    const auth = await requireApiRole(req, ['school_admin', 'super_admin', 'teacher'])
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    // ─── Feature gate: Enterprise analytics requires Enterprise ───
    // Runs AFTER session-derived tenant resolution so single-tenant schools
    // without tenant headers/cookies resolve correctly.
    const featureDenial = await requireFeature('enterprise_analytics', req, {
      organizationId: tenant.organizationId,
    })
    if (featureDenial) return featureDenial

    const { searchParams } = new URL(req.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(analyticsQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const type = (queryResult.data as Record<string, unknown>)?.type as string ?? 'financial'
    const period = (queryResult.data as Record<string, unknown>)?.period as string ?? 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const analyticsPeriod = mapPeriod(period as typeof VALID_PERIODS[number])
    const custom = startDate && endDate ? { startDate, endDate } : undefined

    // Use server-derived organizationId instead of any client-provided value
    const organizationId = tenant.organizationId

    switch (type) {
      case 'financial': {
        const data = await getFinancialAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'financial', data })
      }
      case 'academic': {
        const data = await getAcademicAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'academic', data })
      }
      case 'government': {
        const data = await getGovernmentAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'government', data })
      }
      case 'risk': {
        const data = await getRiskAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'risk', data })
      }
      case 'enrollment': {
        const data = await getEnrollmentAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'enrollment', data })
      }
      case 'ai': {
        const data = await getAIAnalytics(organizationId, analyticsPeriod, custom)
        return NextResponse.json({ type: 'ai', data })
      }
      default:
        return NextResponse.json(
          { error: `Invalid analytics type: ${type}. Valid types: ${VALID_ANALYTICS_TYPES.join(', ')}` },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'analytics/enterprise' }), { status: 500 })
  }
}
