import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiRole,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'
import {
  getRevenueMetrics,
  getRevenueByPeriod,
  getRevenueByPlan,
  getRevenueForecast,
  getChurnAnalysis,
  getOutstandingRevenue,
  getCollectionRate,
  getTopRevenueOrgs,
  getBillingDashboard,
} from '@/lib/billing/revenue-dashboard-service'
import { analyticsQuerySchema } from '@/lib/validators/api-schemas'

const revenueQuerySchema = analyticsQuerySchema.extend({
  section: z.enum(['metrics', 'by-period', 'by-plan', 'forecast', 'churn', 'outstanding', 'collection-rate', 'top-orgs', 'dashboard']).default('dashboard'),
})

const VALID_SECTIONS = ['metrics', 'by-period', 'by-plan', 'forecast', 'churn', 'outstanding', 'collection-rate', 'top-orgs', 'dashboard'] as const
const VALID_PERIODS = ['day', 'week', 'month', 'quarter', 'year'] as const

// GET /api/billing/revenue — Revenue metrics and dashboard data
export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.strict)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (super_admin/school_admin only)
    const auth = await requireApiRole(req, ['super_admin', 'school_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(revenueQuerySchema, queryParams)
    if ('error' in queryResult) return queryResult.error
    const resultData = queryResult.data as Record<string, unknown>
    const section = resultData?.section as string ?? 'dashboard'
    const period = resultData?.period as string ?? 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const queryLimit = resultData?.limit as number ?? 10

    // Use server-derived organizationId instead of any client-provided value
    const organizationId = tenant.organizationId

    switch (section) {
      case 'metrics': {
        const data = await getRevenueMetrics(organizationId)
        return NextResponse.json(data)
      }
      case 'by-period': {
        const periodArg: 'monthly' | 'quarterly' = period === 'quarter' ? 'quarterly' : 'monthly'
        const data = await getRevenueByPeriod(organizationId, periodArg)
        return NextResponse.json(data)
      }
      case 'by-plan': {
        const data = await getRevenueByPlan(organizationId)
        return NextResponse.json(data)
      }
      case 'forecast': {
        const months = startDate ? parseInt(startDate) || 12 : 12
        const data = await getRevenueForecast(organizationId, months)
        return NextResponse.json(data)
      }
      case 'churn': {
        const data = await getChurnAnalysis(organizationId)
        return NextResponse.json(data)
      }
      case 'outstanding': {
        const data = await getOutstandingRevenue(organizationId)
        return NextResponse.json(data)
      }
      case 'collection-rate': {
        const data = await getCollectionRate(organizationId)
        return NextResponse.json(data)
      }
      case 'top-orgs': {
        const limit = Math.min(Math.max(queryLimit, 1), 100)
        const data = await getTopRevenueOrgs(limit)
        return NextResponse.json(data)
      }
      case 'dashboard':
      default: {
        const data = await getBillingDashboard(organizationId)
        return NextResponse.json(data)
      }
    }
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'billing/revenue' }), { status: 500 })
  }
}
