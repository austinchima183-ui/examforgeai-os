import { NextResponse, type NextRequest } from 'next/server'
import {
  verifyWebhookSignature,
  preventWebhookReplay,
  validateWebhookPayload,
  recordProcessedEvent,
} from '@/lib/payment/webhook-security'
import {
  verifyPaymentWithProvider,
  verifyAmount,
  generateLicense,
  handleRefund,
} from '@/lib/payment/payment-security'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'

// ============================================================================
// ExamForge AI — Marketplace Webhook Handler (SECURED)
// ============================================================================
// Handles Flutterwave webhook events for marketplace payments.
//
// SECURITY LAYERS (applied in order):
// 1. HMAC-SHA256 signature verification (timing-safe)
// 2. Replay attack prevention (event dedup + 5-minute timestamp window)
// 3. Zod payload validation
// 4. INDEPENDENT payment verification — never grants product just because
//    a webhook says "successful". Always verifies with Flutterwave server-side.
//
// SUPPORTED EVENTS:
// - charge.completed  → Verify payment independently, then complete purchase
// - charge.failed     → Mark purchase as failed
// - refund.completed  → Revoke license, mark purchase as refunded
// ============================================================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // ─── Step 1: Get raw body and signature header ──────────────
  const signature = request.headers.get('x-flutterwave-signature')

  if (!signature) {
    console.warn('[marketplace-webhook] Missing signature header')
    return NextResponse.json(
      { error: 'Missing webhook signature' },
      { status: 401 }
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    console.error('[marketplace-webhook] Failed to read request body')
    return NextResponse.json(
      { error: 'Failed to read request body' },
      { status: 400 }
    )
  }

  // ─── Step 2: Verify HMAC-SHA256 signature (timing-safe) ─────
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[marketplace-webhook] Invalid webhook signature — possible forgery attempt')
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }

  // ─── Step 3: Parse and validate payload ──────────────────────
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[marketplace-webhook] Failed to parse webhook payload as JSON')
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const validatedEvent = validateWebhookPayload(payload)

  if (!validatedEvent) {
    console.warn('[marketplace-webhook] Payload validation failed')
    return NextResponse.json(
      { error: 'Invalid webhook payload structure' },
      { status: 400 }
    )
  }

  // ─── Step 4: Prevent replay attacks ──────────────────────────
  // Use tx_ref as event ID (unique per transaction) plus event type
  // to allow different event types for the same transaction
  const eventId = `${validatedEvent.event}:${validatedEvent.data.tx_ref}:${validatedEvent.data.id}`
  const eventTimestamp = validatedEvent.data.created_at
    ? new Date(validatedEvent.data.created_at).getTime()
    : Date.now()

  if (!preventWebhookReplay(eventId, eventTimestamp)) {
    console.warn(`[marketplace-webhook] Replay or stale event rejected: ${eventId}`)
    // Return 200 so Flutterwave doesn't retry — we've already processed this
    return NextResponse.json({ received: true, note: 'Duplicate or stale event' })
  }

  // ─── Step 5: Process the event ───────────────────────────────
  const { event, data } = validatedEvent

  try {
    switch (event) {
      case 'charge.completed':
        await processChargeCompleted(data, eventId)
        break

      case 'charge.failed':
        await processChargeFailed(data, eventId)
        break

      case 'refund.completed':
        await processRefundCompleted(data, eventId)
        break

      case 'refund.failed':
        await processRefundFailed(data, eventId)
        break

      default:
        console.info(`[marketplace-webhook] Unhandled event type: ${event}`)
        await recordProcessedEvent(eventId, 'processed')
    }
  } catch (error) {
    console.error(`[marketplace-webhook] Error processing ${event}:`, error)
    await recordProcessedEvent(eventId, 'failed')
    // Return 500 so Flutterwave retries
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  // ─── Step 6: Record successful processing ────────────────────
  await recordProcessedEvent(eventId, 'processed')

  return NextResponse.json({ received: true })
}

// ──────────────────────────────────────────────────────────────
// processChargeCompleted
// ──────────────────────────────────────────────────────────────

/**
 * Processes a charge.completed event.
 *
 * CRITICAL SECURITY: We do NOT trust the webhook payload alone.
 * Even though Flutterwave says the charge was successful, we
 * independently verify with Flutterwave's server-side API.
 *
 * This prevents attacks where:
 * - A forged webhook could grant free products
 * - A replayed webhook could duplicate purchases
 * - A man-in-the-middle could modify amounts
 */
async function processChargeCompleted(
  data: { tx_ref: string; flw_ref: string; status: string; amount: number; currency: string },
  eventId: string
): Promise<void> {
  const supabase = await requireSupabase()

  // Find the pending order by transaction reference (live schema: orders hold payment state)
  const { data: order } = await supabase
    .from('marketplace_orders')
    .select('id, buyer_id, seller_id, status, total_amount, currency')
    .eq('flutterwave_tx_ref', data.tx_ref)
    .maybeSingle()

  if (!order) {
    console.warn(`[marketplace-webhook] No order found for tx_ref: ${data.tx_ref}`)
    return
  }

  // Already completed — idempotent, nothing to do
  if ((order.status as string) === 'completed') {
    console.info(`[marketplace-webhook] Order ${order.id} already completed — skipping`)
    return
  }

  // ─── SECURITY: Verify payment independently with Flutterwave ───
  console.info(`[marketplace-webhook] Independently verifying payment for tx_ref: ${data.tx_ref}`)

  const verification = await verifyPaymentWithProvider(data.tx_ref)

  if (!verification.success) {
    console.warn(
      `[marketplace-webhook] Independent verification FAILED for tx_ref: ${data.tx_ref}. ` +
      `Webhook said successful but provider verification says: ${verification.status}`
    )

    // Mark order as failed — do NOT grant product
    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id)

    return
  }

  // ─── SECURITY: Verify amount matches ───────────────────────────
  const amountCheck = verifyAmount(
    order.total_amount as number,
    verification.amount,
    verification.currency
  )

  if (!amountCheck.valid) {
    console.error(
      `[marketplace-webhook] Amount mismatch for order ${order.id}: ` +
      `expected=${amountCheck.expectedAmount}, actual=${amountCheck.actualAmount}`
    )

    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id)

    return
  }

  // Get product from order items
  const { data: orderItem } = await supabase
    .from('marketplace_order_items')
    .select('product_id, license_type')
    .eq('order_id', order.id)
    .limit(1)
    .maybeSingle()

  const productId = orderItem?.product_id as string | undefined
  if (!productId) {
    console.error(`[marketplace-webhook] No order item for order ${order.id}`)
    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id)
    return
  }

  // ─── All verifications passed — generate license ───────────────
  const licenseResult = await generateLicense(
    productId,
    order.buyer_id as string,
    order.id
  )

  // Complete the order + create purchase ownership row
  await supabase
    .from('marketplace_orders')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      flutterwave_flw_ref: data.flw_ref,
    })
    .eq('id', order.id)

  await supabase
    .from('marketplace_purchases')
    .insert({
      buyer_id: order.buyer_id,
      product_id: productId,
      license_type: (orderItem?.license_type as string) ?? 'individual',
      license_key: licenseResult.success ? licenseResult.licenseKey : null,
      is_active: true,
    })

  if (!licenseResult.success) {
    console.error(
      `[marketplace-webhook] License generation failed for order ${order.id}: ${licenseResult.error}`
    )
    // Order still completed since payment was verified — support re-issues license
  }

  console.info(`[marketplace-webhook] Order ${order.id} completed successfully via webhook`)
}

// ──────────────────────────────────────────────────────────────
// processChargeFailed
// ──────────────────────────────────────────────────────────────

/**
 * Processes a charge.failed event.
 * Marks the purchase as failed so the user can retry.
 */
async function processChargeFailed(
  data: { tx_ref: string },
  eventId: string
): Promise<void> {
  const supabase = await requireSupabase()

  const { data: purchase } = await supabase
    .from('marketplace_purchases')
    .select('id, status')
    .eq('transaction_ref', data.tx_ref)
    .maybeSingle()

  if (!purchase || (purchase.status as string) !== 'pending') {
    return // Nothing to do
  }

  await supabase
    .from('marketplace_purchases')
    .update({ status: 'failed' })
    .eq('id', purchase.id)

  console.info(`[marketplace-webhook] Purchase ${purchase.id} marked as failed via charge.failed event`)
}

// ──────────────────────────────────────────────────────────────
// processRefundCompleted
// ──────────────────────────────────────────────────────────────

/**
 * Processes a refund.completed event.
 * Revokes the license and marks the purchase as refunded.
 */
async function processRefundCompleted(
  data: { tx_ref: string; flw_ref: string },
  eventId: string
): Promise<void> {
  const supabase = await requireSupabase()

  const { data: purchase } = await supabase
    .from('marketplace_purchases')
    .select('id, product_id, status')
    .eq('transaction_ref', data.tx_ref)
    .maybeSingle()

  if (!purchase || (purchase.status as string) === 'refunded') {
    return // Already refunded or not found
  }

  // Revoke the license
  const { data: license } = await supabase
    .from('marketplace_licenses')
    .select('id')
    .eq('product_id', purchase.product_id)
    .eq('is_active', true)
    .maybeSingle()

  if (license) {
    await supabase
      .from('marketplace_licenses')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', license.id)
  }

  // Mark purchase as refunded
  await supabase
    .from('marketplace_purchases')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  console.info(`[marketplace-webhook] Purchase ${purchase.id} refunded via refund.completed event`)
}

// ──────────────────────────────────────────────────────────────
// processRefundFailed
// ──────────────────────────────────────────────────────────────

/**
 * Processes a refund.failed event.
 * Logs the failure — the purchase remains in its current state.
 */
async function processRefundFailed(
  data: { tx_ref: string },
  _eventId: string
): Promise<void> {
  console.warn(
    `[marketplace-webhook] Refund failed for tx_ref: ${data.tx_ref}. ` +
    `Purchase will remain in its current state.`
  )
}
