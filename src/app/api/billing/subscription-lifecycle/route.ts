// ============================================================================
// ExamForge AI — Subscription Lifecycle API
// ============================================================================
// POST /api/billing/subscription-lifecycle — Create or activate a subscription
// PATCH /api/billing/subscription-lifecycle — Cancel, upgrade, downgrade, pause, resume
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import {
  createSubscription,
  activateSubscription,
  cancelSubscription,
  upgradeSubscription,
  downgradeSubscription,
  pauseSubscription,
  resumeSubscription,
  handlePastDue,
} from '@/lib/billing/subscription-lifecycle'
import type { PaymentProvider } from '@/lib/billing/types-extended'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:billing:subscription-lifecycle')

// ──────────────────────────────────────────────────────────────
// POST — Create or Activate Subscription
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

  try {
    const body = await request.json()
    const { action } = body as { action?: string }

    switch (action) {
      case 'create': {
        const { userId, planId, billingCycle, provider } = body as {
          userId?: string
          planId?: string
          billingCycle?: string
          provider?: PaymentProvider
        }

        if (!userId || !planId || !billingCycle || !provider) {
          return NextResponse.json(
            { error: 'userId, planId, billingCycle, and provider are required' },
            { status: 400 }
          )
        }

        const result = await createSubscription(userId, planId, billingCycle, provider)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          subscription: result.subscription,
        })
      }

      case 'activate': {
        const { subscriptionId, paymentReference } = body as {
          subscriptionId?: string
          paymentReference?: string
        }

        if (!subscriptionId || !paymentReference) {
          return NextResponse.json(
            { error: 'subscriptionId and paymentReference are required' },
            { status: 400 }
          )
        }

        const result = await activateSubscription(subscriptionId, paymentReference)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, activate' },
          { status: 400 }
        )
    }
  } catch (error) {
    log.error('Subscription lifecycle POST error', error)
    return NextResponse.json(
      { error: 'Failed to process subscription lifecycle request' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH — Cancel, Upgrade, Downgrade, Pause, Resume, HandlePastDue
// ──────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed: rlAllowed, retryAfter: rlRetry } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!rlAllowed) return rateLimitError(rlRetry)

  // ─── Auth guard ───────────────────────────────────────────
  const authPatch = await requireApiAuth(request)
  if (authPatch instanceof NextResponse) return authPatch

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, authPatch)
  if (csrfResult) return csrfResult

  try {
    const body = await request.json()
    const { action, subscriptionId } = body as {
      action?: string
      subscriptionId?: string
    }

    if (!action || !subscriptionId) {
      return NextResponse.json(
        { error: 'action and subscriptionId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'cancel': {
        const { reason, immediate = false } = body as {
          reason?: string
          immediate?: boolean
        }

        if (!reason) {
          return NextResponse.json({ error: 'reason is required' }, { status: 400 })
        }

        const result = await cancelSubscription(subscriptionId, reason, immediate)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      case 'upgrade': {
        const { newPlanId } = body as { newPlanId?: string }

        if (!newPlanId) {
          return NextResponse.json({ error: 'newPlanId is required' }, { status: 400 })
        }

        const result = await upgradeSubscription(subscriptionId, newPlanId)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          proration: result.proration,
        })
      }

      case 'downgrade': {
        const { newPlanId } = body as { newPlanId?: string }

        if (!newPlanId) {
          return NextResponse.json({ error: 'newPlanId is required' }, { status: 400 })
        }

        const result = await downgradeSubscription(subscriptionId, newPlanId)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          proration: result.proration,
        })
      }

      case 'pause': {
        const { reason } = body as { reason?: string }

        if (!reason) {
          return NextResponse.json({ error: 'reason is required' }, { status: 400 })
        }

        const result = await pauseSubscription(subscriptionId, reason)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      case 'resume': {
        const result = await resumeSubscription(subscriptionId)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      case 'handlePastDue': {
        const result = await handlePastDue(subscriptionId)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cancel, upgrade, downgrade, pause, resume, handlePastDue' },
          { status: 400 }
        )
    }
  } catch (error) {
    log.error('Subscription lifecycle PATCH error', error)
    return NextResponse.json(
      { error: 'Failed to process subscription lifecycle request' },
      { status: 500 }
    )
  }
}
