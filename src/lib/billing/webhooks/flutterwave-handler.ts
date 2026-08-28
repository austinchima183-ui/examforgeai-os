// ============================================================================
// ExamForge AI — Flutterwave Webhook Handler
// ============================================================================
// Handles Flutterwave webhook events and maps them to internal payment status
// updates. Processes: charge.completed, transfer.completed, refund.processed.
//
// SECURITY PRINCIPLE: Never grant access before verified payment.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { verifyPaymentWithProvider } from '@/lib/payment/payment-security'
import { recordAuditEntry } from '../payment-audit'

const log = createLogger('billing:webhook:flutterwave')

// ──────────────────────────────────────────────────────────────
// Flutterwave Event Types
// ──────────────────────────────────────────────────────────────

type FlutterwaveEventType =
  | 'charge.completed'
  | 'charge.failed'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'refund.completed'
  | 'refund.failed'

// ──────────────────────────────────────────────────────────────
// handleFlutterwaveEvent
// ──────────────────────────────────────────────────────────────

/**
 * Handles a Flutterwave webhook event by mapping it to internal payment updates.
 *
 * Event mapping:
 * - charge.completed → Mark payment as successful, activate subscription
 * - charge.failed → Mark payment as failed, handle failed payment
 * - transfer.completed → Mark transfer as completed
 * - transfer.failed → Mark transfer as failed
 * - refund.completed → Mark refund as completed, revoke license
 * - refund.failed → Mark refund as failed
 *
 * CRITICAL: For charge.completed, we still verify independently with the
 * provider before granting access. This is Security Principle 1.
 *
 * @param eventType - The Flutterwave event type
 * @param data - The event data payload
 */
export async function handleFlutterwaveEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  log.info('Processing Flutterwave event', { eventType, txRef: data.tx_ref })

  switch (eventType as FlutterwaveEventType) {
    case 'charge.completed':
      await handleChargeCompleted(data)
      break

    case 'charge.failed':
      await handleChargeFailed(data)
      break

    case 'transfer.completed':
      await handleTransferCompleted(data)
      break

    case 'transfer.failed':
      await handleTransferFailed(data)
      break

    case 'refund.completed':
      await handleRefundCompleted(data)
      break

    case 'refund.failed':
      await handleRefundFailed(data)
      break

    default:
      log.warn('Unhandled Flutterwave event type', { eventType })
  }
}

// ──────────────────────────────────────────────────────────────
// handleChargeCompleted
// ──────────────────────────────────────────────────────────────

async function handleChargeCompleted(data: Record<string, unknown>): Promise<void> {
  const txRef = data.tx_ref as string
  const flwRef = data.flw_ref as string
  const status = data.status as string

  if (!txRef) {
    log.warn('Missing tx_ref in charge.completed event')
    return
  }

  // SECURITY PRINCIPLE 1: Never grant access before verified payment.
  // Even though Flutterwave sent us a charge.completed event, we MUST
  // independently verify the transaction with their API.
  if (status === 'successful') {
    const verification = await verifyPaymentWithProvider(txRef, 'flutterwave')

    if (!verification.success) {
      log.security('Flutterwave webhook charge.completed but verification failed', {
        txRef,
        flwRef,
      })
      // Don't grant access — verification failed
      return
    }

    // Verification passed — safe to update payment status
    const supabase = await createClient()

    // Update payment record
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'successful',
        flutterwave_transaction_id: flwRef,
        verified_at: new Date().toISOString(),
      })
      .eq('transaction_ref', txRef)

    if (error) {
      log.error('Failed to update payment after verified webhook', error, { txRef })
    } else {
      log.info('Payment marked as successful after webhook + verification', { txRef })
    }

    // Record audit entry
    await recordAuditEntry(txRef, 'webhook.charge.completed', 'flutterwave', {
      flwRef,
      amount: verification.amount,
      currency: verification.currency,
      verified: true,
    })
  }
}

// ──────────────────────────────────────────────────────────────
// handleChargeFailed
// ──────────────────────────────────────────────────────────────

async function handleChargeFailed(data: Record<string, unknown>): Promise<void> {
  const txRef = data.tx_ref as string

  if (!txRef) {
    log.warn('Missing tx_ref in charge.failed event')
    return
  }

  const supabase = await createClient()

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
    })
    .eq('transaction_ref', txRef)

  await recordAuditEntry(txRef, 'webhook.charge.failed', 'flutterwave', {
    reason: data.processor_response ?? 'Unknown',
  })

  log.info('Payment marked as failed via webhook', { txRef })
}

// ──────────────────────────────────────────────────────────────
// handleTransferCompleted
// ──────────────────────────────────────────────────────────────

async function handleTransferCompleted(data: Record<string, unknown>): Promise<void> {
  const transferRef = data.reference as string

  log.info('Transfer completed via webhook', { transferRef })

  await recordAuditEntry(
    String(data.id ?? transferRef),
    'webhook.transfer.completed',
    'flutterwave',
    { transferRef, amount: data.amount, currency: data.currency }
  )
}

// ──────────────────────────────────────────────────────────────
// handleTransferFailed
// ──────────────────────────────────────────────────────────────

async function handleTransferFailed(data: Record<string, unknown>): Promise<void> {
  const transferRef = data.reference as string

  log.warn('Transfer failed via webhook', { transferRef })

  await recordAuditEntry(
    String(data.id ?? transferRef),
    'webhook.transfer.failed',
    'flutterwave',
    { transferRef, reason: data.complete_message ?? 'Unknown' }
  )
}

// ──────────────────────────────────────────────────────────────
// handleRefundCompleted
// ──────────────────────────────────────────────────────────────

async function handleRefundCompleted(data: Record<string, unknown>): Promise<void> {
  const txRef = data.tx_ref as string
  const refundId = String(data.id ?? '')

  log.info('Refund completed via webhook', { txRef, refundId })

  const supabase = await createClient()

  // Update refund request status
  await supabase
    .from('refund_requests')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      flutterwave_refund_id: refundId,
    })
    .eq('payment_id', txRef)
    .eq('status', 'processing')

  // Update payment status
  await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('transaction_ref', txRef)

  await recordAuditEntry(txRef, 'webhook.refund.completed', 'flutterwave', {
    refundId,
    amount: data.amount,
  })
}

// ──────────────────────────────────────────────────────────────
// handleRefundFailed
// ──────────────────────────────────────────────────────────────

async function handleRefundFailed(data: Record<string, unknown>): Promise<void> {
  const txRef = data.tx_ref as string

  log.warn('Refund failed via webhook', { txRef })

  const supabase = await createClient()

  await supabase
    .from('refund_requests')
    .update({
      status: 'failed',
      rejected_reason: 'Refund failed at provider',
    })
    .eq('payment_id', txRef)
    .eq('status', 'processing')

  await recordAuditEntry(txRef, 'webhook.refund.failed', 'flutterwave', {
    reason: data.processor_response ?? 'Unknown',
  })
}
