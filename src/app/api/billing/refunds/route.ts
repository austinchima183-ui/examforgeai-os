// ============================================================================
// ExamForge AI — Refund API
// ============================================================================
// POST /api/billing/refunds — Request a refund
// PATCH /api/billing/refunds — Approve, reject, or process a refund
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import {
  requestRefund,
  approveRefund,
  processRefund,
  rejectRefund,
  getRefundStatus,
} from '@/lib/billing/refund-workflow'
import { requireApiAuth, deriveTenantContext, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:billing:refunds')

// ──────────────────────────────────────────────────────────────
// POST — Request Refund
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  // ─── Derive requestedBy from session (SECURITY FIX) ──────
  const tenant = deriveTenantContext(auth)
  const requestedBy = tenant.userId  // NEVER from client body

  try {
    const body = await request.json()
    const { paymentId, reason } = body as {
      paymentId?: string
      reason?: string
    }

    if (!paymentId || !reason) {
      return NextResponse.json(
        { error: 'paymentId and reason are required' },
        { status: 400 }
      )
    }

    const refund = await requestRefund(paymentId, reason, requestedBy)

    log.info('Refund requested via API', { refundId: refund.id, paymentId })

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        paymentId: refund.paymentId,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
        createdAt: refund.createdAt,
      },
    })
  } catch (error) {
    log.error('Refund request API error', error)

    const message = error instanceof Error ? error.message : 'Failed to request refund'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH — Approve, Reject, or Process Refund
// ──────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed: rlAllowed, retryAfter: rlRetry } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!rlAllowed) return rateLimitError(rlRetry)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  // ─── Derive actor identity from session (SECURITY FIX) ───
  const tenant = deriveTenantContext(auth)
  const actorUserId = tenant.userId  // NEVER from client body

  try {
    const body = await request.json()
    const { action, refundId } = body as {
      action?: string
      refundId?: string
    }

    if (!action || !refundId) {
      return NextResponse.json(
        { error: 'action and refundId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'approve': {
        // approvedBy derived from session — never from client body
        await approveRefund(refundId, actorUserId)

        return NextResponse.json({ success: true })
      }

      case 'reject': {
        const { reason } = body as {
          reason?: string
        }

        if (!reason) {
          return NextResponse.json({ error: 'reason is required' }, { status: 400 })
        }

        // rejectedBy derived from session — never from client body
        await rejectRefund(refundId, reason, actorUserId)

        return NextResponse.json({ success: true })
      }

      case 'process': {
        await processRefund(refundId)

        return NextResponse.json({ success: true })
      }

      case 'status': {
        const refund = await getRefundStatus(refundId)

        return NextResponse.json({
          success: true,
          refund: {
            id: refund.id,
            paymentId: refund.paymentId,
            status: refund.status,
            amount: refund.amount,
            currency: refund.currency,
            approvedBy: refund.approvedBy,
            processedAt: refund.processedAt,
          },
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve, reject, process, status' },
          { status: 400 }
        )
    }
  } catch (error) {
    log.error('Refund action API error', error)

    const message = error instanceof Error ? error.message : 'Failed to process refund action'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
