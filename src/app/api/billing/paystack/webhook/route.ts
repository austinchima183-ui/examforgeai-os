// ============================================================================
// ExamForge AI — Paystack Webhook API
// ============================================================================
// POST /api/billing/paystack/webhook — Receive and process Paystack webhooks.
// Verifies HMAC-SHA512 signature before processing any event.
// This is a public endpoint — authentication is via webhook signature only.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { processWebhook } from '@/lib/billing/webhooks/webhook-processor'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('api:billing:paystack:webhook')

export async function POST(request: NextRequest) {
  // ─── Step 1: Get signature header ───
  const signature = request.headers.get('x-paystack-signature')

  if (!signature) {
    log.security('Missing Paystack webhook signature header')
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 401 }
    )
  }

  // ─── Step 2: Get raw body ───
  try {
    const body = await request.text()

    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }

    // ─── Step 3: Process webhook via unified processor ───
    const headers: Record<string, string | undefined> = {
      'x-paystack-signature': signature,
      'content-type': request.headers.get('content-type') ?? undefined,
    }

    const result = await processWebhook('paystack', body, signature, headers)

    if (!result.success) {
      log.warn('Paystack webhook processing failed', { error: result.error })
      return NextResponse.json(
        { error: result.error ?? 'Processing failed' },
        { status: result.error === 'Invalid signature' ? 401 : 500 }
      )
    }

    // Return 200 only after successful processing
    return NextResponse.json({ received: true, eventId: result.eventId })
  } catch (error) {
    log.error('Paystack webhook API error', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
