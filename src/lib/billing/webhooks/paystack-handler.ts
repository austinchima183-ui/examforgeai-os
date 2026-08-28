// ============================================================================
// ExamForge AI — Paystack Webhook Handler
// ============================================================================
// Handles Paystack webhook events and maps them to internal payment status
// updates. Processes: charge.success, charge.failed, subscription.create,
// subscription.disable, invoice.payment_failed.
//
// SECURITY PRINCIPLE: Never grant access before verified payment.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { verifyPaystackTransaction } from '../providers/paystack'
import { recordAuditEntry } from '../payment-audit'

const log = createLogger('billing:webhook:paystack')

// ──────────────────────────────────────────────────────────────
// Paystack Event Types
// ──────────────────────────────────────────────────────────────

type PaystackEventType =
  | 'charge.success'
  | 'charge.failed'
  | 'subscription.create'
  | 'subscription.disable'
  | 'invoice.payment_failed'

// ──────────────────────────────────────────────────────────────
// handlePaystackEvent
// ──────────────────────────────────────────────────────────────

/**
 * Handles a Paystack webhook event by mapping it to internal payment updates.
 *
 * Event mapping:
 * - charge.success → Mark payment as successful, activate subscription
 * - charge.failed → Mark payment as failed
 * - subscription.create → Record subscription creation at provider
 * - subscription.disable → Mark subscription as cancelled
 * - invoice.payment_failed → Handle past-due subscription
 *
 * CRITICAL: For charge.success, we still verify independently with the
 * provider before granting access. This is Security Principle 1.
 *
 * @param eventType - The Paystack event type
 * @param data - The event data payload
 */
export async function handlePaystackEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  log.info('Processing Paystack event', { eventType, reference: data.reference })

  switch (eventType as PaystackEventType) {
    case 'charge.success':
      await handleChargeSuccess(data)
      break

    case 'charge.failed':
      await handleChargeFailed(data)
      break

    case 'subscription.create':
      await handleSubscriptionCreate(data)
      break

    case 'subscription.disable':
      await handleSubscriptionDisable(data)
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(data)
      break

    default:
      log.warn('Unhandled Paystack event type', { eventType })
  }
}

// ──────────────────────────────────────────────────────────────
// handleChargeSuccess
// ──────────────────────────────────────────────────────────────

async function handleChargeSuccess(data: Record<string, unknown>): Promise<void> {
  const reference = data.reference as string
  const paystackId = String(data.id ?? '')

  if (!reference) {
    log.warn('Missing reference in charge.success event')
    return
  }

  // SECURITY PRINCIPLE 1: Never grant access before verified payment.
  // Even though Paystack sent us a charge.success event, we MUST
  // independently verify the transaction with their API.
  const verification = await verifyPaystackTransaction(reference)

  if (!verification.success) {
    log.security('Paystack webhook charge.success but verification failed', {
      reference,
      paystackId,
    })
    // Don't grant access — verification failed
    return
  }

  // Verification passed — safe to update payment status
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'successful',
      provider_transaction_id: paystackId,
      verified_at: new Date().toISOString(),
    })
    .eq('transaction_ref', reference)

  if (error) {
    log.error('Failed to update payment after verified Paystack webhook', error, { reference })
  } else {
    log.info('Payment marked as successful after Paystack webhook + verification', { reference })
  }

  // If this is a recurring charge (authorization), save the auth code
  const authorization = data.authorization as Record<string, unknown> | undefined
  if (authorization?.authorization_code && authorization?.reusable) {
    await supabase
      .from('payment_authorizations')
      .upsert({
        provider: 'paystack',
        authorization_code: authorization.authorization_code as string,
        email: (data.customer as Record<string, unknown>)?.email as string,
        is_reusable: true,
        channel: authorization.channel as string ?? 'card',
      }, { onConflict: 'provider,authorization_code' })
      .then(({ error: upsertError }) => {
        if (upsertError) {
          log.warn('Failed to save Paystack authorization', { error: upsertError.message })
        }
      })
  }

  await recordAuditEntry(reference, 'webhook.charge.success', 'paystack', {
    paystackId,
    amount: verification.amount,
    currency: verification.currency,
    verified: true,
  })
}

// ──────────────────────────────────────────────────────────────
// handleChargeFailed
// ──────────────────────────────────────────────────────────────

async function handleChargeFailed(data: Record<string, unknown>): Promise<void> {
  const reference = data.reference as string

  if (!reference) {
    log.warn('Missing reference in charge.failed event')
    return
  }

  const supabase = await createClient()

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
    })
    .eq('transaction_ref', reference)

  await recordAuditEntry(reference, 'webhook.charge.failed', 'paystack', {
    reason: data.gateway_response ?? 'Unknown',
  })

  log.info('Payment marked as failed via Paystack webhook', { reference })
}

// ──────────────────────────────────────────────────────────────
// handleSubscriptionCreate
// ──────────────────────────────────────────────────────────────

async function handleSubscriptionCreate(data: Record<string, unknown>): Promise<void> {
  const paystackSubCode = data.subscription_code as string
  const email = (data.customer as Record<string, unknown>)?.email as string

  log.info('Paystack subscription created', { paystackSubCode, email })

  // Update internal subscription record with Paystack subscription code
  const supabase = await createClient()

  await supabase
    .from('subscriptions')
    .update({
      provider_subscription_id: paystackSubCode,
      provider: 'paystack',
    })
    .eq('billing_email', email)
    .is('provider_subscription_id', null)
    .limit(1)

  await recordAuditEntry(
    paystackSubCode,
    'webhook.subscription.create',
    'paystack',
    { paystackSubCode, email }
  )
}

// ──────────────────────────────────────────────────────────────
// handleSubscriptionDisable
// ──────────────────────────────────────────────────────────────

async function handleSubscriptionDisable(data: Record<string, unknown>): Promise<void> {
  const paystackSubCode = data.subscription_code as string

  log.info('Paystack subscription disabled', { paystackSubCode })

  const supabase = await createClient()

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Disabled at provider (Paystack)',
    })
    .eq('provider_subscription_id', paystackSubCode)

  await recordAuditEntry(
    paystackSubCode,
    'webhook.subscription.disable',
    'paystack',
    { paystackSubCode }
  )
}

// ──────────────────────────────────────────────────────────────
// handleInvoicePaymentFailed
// ──────────────────────────────────────────────────────────────

async function handleInvoicePaymentFailed(data: Record<string, unknown>): Promise<void> {
  const subscriptionObj = data.subscription as Record<string, unknown> | undefined
  const subscriptionCode = (subscriptionObj?.subscription_code as string) ?? ''

  log.warn('Paystack invoice payment failed', { subscriptionCode })

  const supabase = await createClient()

  // Mark subscription as past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('provider_subscription_id', subscriptionCode)

  await recordAuditEntry(
    subscriptionCode,
    'webhook.invoice.payment_failed',
    'paystack',
    { subscriptionCode, amount: data.amount, currency: data.currency }
  )
}
