// ============================================================================
// ExamForge AI — Unified Webhook API
// ============================================================================
// POST /api/billing/webhooks — Provider-aware webhook processing.
// Extends the existing Flutterwave webhook at /api/billing/webhook/route.ts
// to also support Paystack via a 'provider' query parameter or header.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { processWebhook } from '@/lib/billing/webhooks/webhook-processor'
import { createLogger } from '@/lib/observability/logger'
import type { PaymentProvider } from '@/lib/billing/types-extended'

const log = createLogger('api:billing:webhooks')

export async function POST(request: NextRequest) {
  // ─── Determine provider ───
  // Provider can be specified via:
  // 1. Query parameter: ?provider=paystack
  // 2. Header: X-Provider: paystack
  // 3. Signature header detection: X-Paystack-Signature → paystack, X-Flutterwave-Signature → flutterwave
  const url = new URL(request.url)
  const providerParam = url.searchParams.get('provider')
  const providerHeader = request.headers.get('x-provider')

  let provider: PaymentProvider = 'flutterwave' // Default to Flutterwave for backward compat

  if (providerParam === 'paystack' || providerHeader === 'paystack') {
    provider = 'paystack'
  } else if (request.headers.get('x-paystack-signature')) {
    provider = 'paystack'
  } else if (providerParam === 'flutterwave' || providerHeader === 'flutterwave') {
    provider = 'flutterwave'
  }

  // ─── Get signature ───
  let signature = ''

  switch (provider) {
    case 'flutterwave':
      signature = request.headers.get('x-flutterwave-signature') ?? ''
      break
    case 'paystack':
      signature = request.headers.get('x-paystack-signature') ?? ''
      break
  }

  if (!signature) {
    log.security('Missing webhook signature', { provider })
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 401 }
    )
  }

  // ─── Get raw body ───
  try {
    const body = await request.text()

    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }

    // ─── Process via unified webhook processor ───
    const headers: Record<string, string | undefined> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    const result = await processWebhook(provider, body, signature, headers)

    if (!result.success) {
      log.warn('Webhook processing failed', { provider, error: result.error })
      return NextResponse.json(
        { error: result.error ?? 'Processing failed' },
        { status: result.error === 'Invalid signature' ? 401 : 500 }
      )
    }

    return NextResponse.json({ received: true, provider, eventId: result.eventId })
  } catch (error) {
    log.error('Unified webhook API error', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
