import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { requireFeature } from '@/lib/billing/plan-gate'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Enterprise Billing API Route
// ============================================================================
// GET /api/billing/enterprise - Get enterprise billing overview
// POST /api/billing/enterprise - Create enterprise contract
// Feature-gated: enterprise_billing requires Enterprise
// ============================================================================

// GET /api/billing/enterprise — Get enterprise billing overview
export async function GET(request: NextRequest) {
  // ─── Feature gate: Enterprise billing requires Enterprise ───
  const featureDenial = await requireFeature('enterprise_billing', request)
  if (featureDenial) return featureDenial

  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 })
    }
    const { getOrganizationBilling } = await import('@/lib/billing/subscription-service')
    const billing = await getOrganizationBilling(tenant.organizationId)
    return NextResponse.json(billing)
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'billing/enterprise GET' }), { status: 500 })
  }
}

// POST /api/billing/enterprise — Create enterprise contract
export async function POST(request: NextRequest) {
  // ─── Feature gate: Enterprise billing requires Enterprise ───
  const featureDenial = await requireFeature('enterprise_billing', request)
  if (featureDenial) return featureDenial

  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin'])
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 })
    }
    const body = await request.json()
    const { createContract } = await import('@/lib/billing/enterprise-contract-service')
    const contract = await createContract({ ...body, organizationId: tenant.organizationId })
    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'billing/enterprise POST' }), { status: 500 })
  }
}
