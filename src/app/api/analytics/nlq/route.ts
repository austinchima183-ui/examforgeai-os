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
import { askNaturalLanguageQuery, getSuggestedQueries } from '@/lib/enterprise-analytics/nlq-service'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const nlqBodySchema = z.object({
  query: z.string().min(1, 'query is required'),
})

// POST /api/analytics/nlq — Execute natural language analytics query
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin/teacher only)
    const auth = await requireApiRole(request, ['school_admin', 'super_admin', 'teacher'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    // Validate input
    const body = await request.json()
    const input = validateInput(nlqBodySchema, body)
    if ('error' in input) return input.error

    // Use server-derived organizationId instead of any client-provided value
    const nlqResult = await askNaturalLanguageQuery(input.data.query, tenant.organizationId)

    // Also get suggested follow-up queries — role-based, page=analytics
    const suggestions = await getSuggestedQueries(auth.user.role, 'analytics')

    return NextResponse.json({
      result: nlqResult,
      suggestions,
      query: input.data.query,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'analytics/nlq' }), { status: 500 })
  }
}
