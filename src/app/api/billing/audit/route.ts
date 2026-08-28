// ============================================================================
// ExamForge AI — Audit Trail API
// ============================================================================
// GET /api/billing/audit — Get audit trail for a payment or subscription
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import { getAuditTrail, getAuditTrailBySubscription } from '@/lib/billing/payment-audit'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

const log = createLogger('api:billing:audit')

// ──────────────────────────────────────────────────────────────
// GET — Get Audit Trail
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const url = new URL(request.url)
    const paymentId = url.searchParams.get('paymentId')
    const subscriptionId = url.searchParams.get('subscriptionId')

    if (!paymentId && !subscriptionId) {
      return NextResponse.json(
        { error: 'paymentId or subscriptionId is required' },
        { status: 400 }
      )
    }

    let auditTrail

    if (subscriptionId) {
      auditTrail = await getAuditTrailBySubscription(subscriptionId)
    } else if (paymentId) {
      auditTrail = await getAuditTrail(paymentId)
    }

    return NextResponse.json({
      success: true,
      auditTrail,
    })
  } catch (error) {
    log.error('Audit trail API error', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit trail' },
      { status: 500 }
    )
  }
}
