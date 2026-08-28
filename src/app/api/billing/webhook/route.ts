// ============================================================================
// ExamForge AI — Unified Webhook Handler
// ============================================================================
// POST /api/billing/webhook — Provider-aware webhook processing.
// Detects the payment provider from signature headers and routes to the
// appropriate handler via the unified webhook processor.
//
// Provider detection priority:
// 1. X-Paystack-Signature header → Paystack (HMAC-SHA512)
// 2. X-Flutterwave-Signature header → Flutterwave (HMAC-SHA256)
// 3. Falls back to Flutterwave for backward compatibility
//
// SECURITY: This is a public endpoint — authentication is via webhook
// signature verification only. No session/auth required.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { processWebhook } from '@/lib/billing/webhooks/webhook-processor'
import { createLogger } from '@/lib/observability/logger'
import type { PaymentProvider } from '@/lib/billing/types-extended'

const log = createLogger('api:billing:webhook')

// ──────────────────────────────────────────────────────────────
// Provider Detection
// ──────────────────────────────────────────────────────────────

/**
 * Detects the payment provider from webhook signature headers.
 *
 * Each provider sends a unique signature header:
 * - Flutterwave: x-flutterwave-signature (HMAC-SHA256)
 * - Paystack:    x-paystack-signature   (HMAC-SHA512)
 */
function detectProvider(request: NextRequest): {
  provider: PaymentProvider
  signature: string
} {
  const paystackSignature = request.headers.get('x-paystack-signature')
  if (paystackSignature) {
    return { provider: 'paystack', signature: paystackSignature }
  }

  const flutterwaveSignature = request.headers.get('x-flutterwave-signature')
  if (flutterwaveSignature) {
    return { provider: 'flutterwave', signature: flutterwaveSignature }
  }

  // No recognized signature header
  return { provider: 'flutterwave', signature: '' }
}

// ──────────────────────────────────────────────────────────────
// POST Handler
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Step 1: Detect provider and extract signature ───────
  const { provider, signature } = detectProvider(request)

  if (!signature) {
    log.security('Missing webhook signature header', { provider })
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 401 }
    )
  }

  // ─── Step 2: Get raw body ─────────────────────────────────
  try {
    const body = await request.text()

    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }

    // ─── Step 3: Forward all headers to the unified processor ──
    const headers: Record<string, string | undefined> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // ─── Step 4: Process via unified webhook processor ────────
    log.info('Processing webhook', { provider, payloadLength: body.length })

    const result = await processWebhook(provider, body, signature, headers)

    if (!result.success) {
      log.warn('Webhook processing failed', { provider, error: result.error })

      const status = result.error === 'Invalid signature' ? 401
        : result.error === 'Replay detected' ? 409
        : 500

      return NextResponse.json(
        { error: result.error ?? 'Processing failed' },
        { status }
      )
    }

    return NextResponse.json({
      received: true,
      provider,
      eventId: result.eventId,
    })
  } catch (error) {
    log.error('Webhook API error', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
