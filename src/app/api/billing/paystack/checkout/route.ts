// ============================================================================
// ExamForge AI — Paystack Checkout API
// ============================================================================
// POST /api/billing/paystack/checkout — Initialize a Paystack transaction.
// This is a server-side endpoint that creates the checkout session.
// The frontend should redirect the user to the returned authorization URL.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { initializePaystackTransaction } from '@/lib/billing/providers/paystack'
import { createLogger } from '@/lib/observability/logger'
import { generateTransactionRef } from '@/lib/payment/payment-security'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:billing:paystack:checkout')

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult7 = enforceCsrf(request, auth)
  if (csrfResult7) return csrfResult7

  try {
    const body = await request.json()

    const {
      email,
      amount,
      currency = 'NGN',
      metadata = {},
    } = body as {
      email?: string
      amount?: number
      currency?: string
      metadata?: Record<string, unknown>
    }

    // Validate required fields
    if (!email || !amount) {
      return NextResponse.json(
        { error: 'Email and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      )
    }

    // Generate transaction reference
    const reference = generateTransactionRef()

    // Initialize Paystack transaction
    const result = await initializePaystackTransaction(
      email,
      amount,
      currency,
      reference,
      metadata
    )

    if (!result.success) {
      log.error('Paystack checkout initialization failed', null, { error: result.error })
      return NextResponse.json(
        { error: result.error ?? 'Failed to initialize checkout' },
        { status: 500 }
      )
    }

    log.info('Paystack checkout initialized', { reference, amount, currency })

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      reference: result.reference,
    })
  } catch (error) {
    log.error('Paystack checkout API error', error)
    return NextResponse.json(
      { error: 'Failed to process checkout request' },
      { status: 500 }
    )
  }
}
