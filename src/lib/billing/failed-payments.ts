// ============================================================================
// ExamForge AI — Failed Payment Handling & Dunning
// ============================================================================
// Handles failed payments with configurable retry logic (dunning).
// Retry schedule: 1st retry 1hr, 2nd retry 24hr, 3rd retry 3 days,
// then suspend subscription.
//
// SECURITY PRINCIPLE: Never grant access when payment has failed.
// After MAX_RETRY_ATTEMPTS, the subscription is suspended.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { recordAuditEntry } from './payment-audit'
import type { PaymentProvider, FailedPaymentInfo } from './types-extended'
import { DUNNING_SCHEDULE, MAX_RETRY_ATTEMPTS } from './types-extended'

const log = createLogger('billing:failed-payments')

// ──────────────────────────────────────────────────────────────
// handleFailedPayment
// ──────────────────────────────────────────────────────────────

/**
 * Handles a failed payment by recording the failure and scheduling a retry.
 *
 * The dunning schedule determines when the next retry will be attempted:
 * - 1st retry: 1 hour
 * - 2nd retry: 24 hours
 * - 3rd retry: 3 days
 * - After 3 retries: subscription is suspended
 *
 * @param paymentId - The payment ID that failed
 * @param reason - The reason for the failure
 * @param provider - The payment provider
 */
export async function handleFailedPayment(
  paymentId: string,
  reason: string,
  provider: PaymentProvider
): Promise<void> {
  const supabase = await createClient()

  // Get existing failed payment record
  const { data: existingFailed } = await supabase
    .from('failed_payments')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  const retryCount = existingFailed
    ? ((existingFailed.retry_count as number) ?? 0) + 1
    : 1

  // Check if we've exceeded max retries
  if (retryCount > MAX_RETRY_ATTEMPTS) {
    // Suspend the subscription
    const { data: payment } = await supabase
      .from('transactions')
      .select('subscription_id, org_id')
      .eq('id', paymentId)
      .maybeSingle()

    if (payment?.subscription_id) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_reason: `Payment failed after ${MAX_RETRY_ATTEMPTS} retries: ${reason}`,
        })
        .eq('id', payment.subscription_id)
    }

    // Mark failed payment as suspended
    if (existingFailed) {
      await supabase
        .from('failed_payments')
        .update({
          status: 'suspended',
          last_failed_at: new Date().toISOString(),
        })
        .eq('id', existingFailed.id)
    }

    await recordAuditEntry(paymentId, 'payment.retry_exhausted', provider, {
      retryCount,
      maxRetries: MAX_RETRY_ATTEMPTS,
      reason,
      action: 'subscription_suspended',
    })

    log.warn('Payment retries exhausted — subscription suspended', {
      paymentId,
      retryCount,
      reason,
    })

    return
  }

  // Schedule next retry
  const scheduleEntry = DUNNING_SCHEDULE[retryCount - 1]
  const nextRetryAt = new Date(Date.now() + scheduleEntry.delayMs).toISOString()

  if (existingFailed) {
    // Update existing record
    await supabase
      .from('failed_payments')
      .update({
        retry_count: retryCount,
        next_retry_at: nextRetryAt,
        last_failed_at: new Date().toISOString(),
        status: 'pending_retry',
      })
      .eq('id', existingFailed.id)
  } else {
    // Create new failed payment record
    const { data: payment } = await supabase
      .from('transactions')
      .select('subscription_id, org_id, amount, currency')
      .eq('id', paymentId)
      .maybeSingle()

    await supabase
      .from('failed_payments')
      .insert({
        payment_id: paymentId,
        subscription_id: payment?.subscription_id ?? null,
        org_id: payment?.org_id ?? '',
        amount: payment?.amount ?? 0,
        currency: payment?.currency ?? 'NGN',
        provider,
        reason,
        retry_count: retryCount,
        next_retry_at: nextRetryAt,
        last_failed_at: new Date().toISOString(),
        status: 'pending_retry',
      })
  }

  await recordAuditEntry(paymentId, 'payment.failed', provider, {
    retryCount,
    nextRetryAt,
    reason,
    retryLabel: scheduleEntry.label,
  })

  log.info('Failed payment recorded — retry scheduled', {
    paymentId,
    retryCount,
    nextRetryIn: scheduleEntry.label,
    reason,
  })
}

// ──────────────────────────────────────────────────────────────
// retryPayment
// ──────────────────────────────────────────────────────────────

/**
 * Retries a failed payment using the same payment method.
 *
 * Only payments in 'pending_retry' status can be retried.
 *
 * @param paymentId - The payment ID to retry
 */
export async function retryPayment(paymentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: failedPayment } = await supabase
    .from('failed_payments')
    .select('*')
    .eq('payment_id', paymentId)
    .eq('status', 'pending_retry')
    .maybeSingle()

  if (!failedPayment) {
    throw new Error(`No pending retry found for payment: ${paymentId}`)
  }

  // Mark as retrying
  await supabase
    .from('failed_payments')
    .update({ status: 'retrying' })
    .eq('id', failedPayment.id)

  const provider = failedPayment.provider as PaymentProvider

  try {
    // Get the original payment's authorization for recurring charge
    const { data: payment } = await supabase
      .from('transactions')
      .select('transaction_ref, org_id')
      .eq('id', paymentId)
      .maybeSingle()

    if (!payment) {
      throw new Error('Original payment not found')
    }

    // Get authorization code for retry
    const { data: auth } = await supabase
      .from('payment_authorizations')
      .select('authorization_code, email')
      .eq('provider', provider)
      .eq('org_id', payment.org_id)
      .eq('is_reusable', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!auth?.authorization_code) {
      throw new Error('No reusable authorization found for retry')
    }

    // Attempt retry via provider
    const { createPaymentProvider } = await import('./providers/provider-factory')
    const adapter = createPaymentProvider(provider)

    const result = await adapter.initialize({
      email: auth.email as string,
      amount: failedPayment.amount as number,
      currency: failedPayment.currency as string,
      reference: `RETRY-${paymentId}-${Date.now()}`,
      metadata: { retryFor: paymentId, retryCount: failedPayment.retry_count },
    })

    if (!result.success) {
      // Retry failed — handle as another failed payment
      await handleFailedPayment(paymentId, `Retry failed: ${result.error ?? 'Unknown'}`, provider)
      return
    }

    // Retry initiated — mark as pending verification
    await supabase
      .from('failed_payments')
      .update({ status: 'pending_retry' })
      .eq('id', failedPayment.id)

    await recordAuditEntry(paymentId, 'payment.retry_initiated', provider, {
      retryCount: failedPayment.retry_count,
      newReference: result.reference,
    })

    log.info('Payment retry initiated', { paymentId, reference: result.reference })
  } catch (error) {
    // Retry failed completely
    await supabase
      .from('failed_payments')
      .update({ status: 'pending_retry' })
      .eq('id', failedPayment.id)

    await handleFailedPayment(
      paymentId,
      `Retry error: ${error instanceof Error ? error.message : 'Unknown'}`,
      provider
    )
  }
}

// ──────────────────────────────────────────────────────────────
// schedulePaymentRetry
// ──────────────────────────────────────────────────────────────

/**
 * Schedules a payment retry for a specific delay.
 *
 * This is used for programmatic retry scheduling, e.g., from a cron job
 * that processes failed payments that have reached their next_retry_at time.
 *
 * @param paymentId - The payment ID to schedule a retry for
 * @param delayMs - The delay in milliseconds before the retry
 */
export async function schedulePaymentRetry(
  paymentId: string,
  delayMs: number
): Promise<void> {
  const supabase = await createClient()

  const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

  await supabase
    .from('failed_payments')
    .update({
      next_retry_at: nextRetryAt,
      status: 'pending_retry',
    })
    .eq('payment_id', paymentId)

  log.info('Payment retry scheduled', { paymentId, nextRetryAt, delayMs })
}

// ──────────────────────────────────────────────────────────────
// getFailedPayments
// ──────────────────────────────────────────────────────────────

/**
 * Gets failed payments, optionally filtered by school/organization.
 *
 * @param schoolId - Optional school/organization ID to filter by
 * @returns Array of failed payment information
 */
export async function getFailedPayments(
  schoolId?: string
): Promise<FailedPaymentInfo[]> {
  const supabase = await createClient()

  let query = supabase
    .from('failed_payments')
    .select('*')
    .order('last_failed_at', { ascending: false })

  if (schoolId) {
    query = query.eq('org_id', schoolId)
  }

  const { data, error } = await query

  if (error) {
    log.error('Failed to get failed payments', error)
    return []
  }

  return (data ?? []).map(mapFailedPaymentFromDb)
}

// ──────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────

function mapFailedPaymentFromDb(data: Record<string, unknown>): FailedPaymentInfo {
  return {
    id: data.id as string,
    paymentId: (data.payment_id as string) ?? '',
    subscriptionId: (data.subscription_id as string) ?? null,
    orgId: (data.org_id as string) ?? '',
    amount: (data.amount as number) ?? 0,
    currency: (data.currency as string) ?? 'NGN',
    provider: (data.provider as PaymentProvider) ?? 'flutterwave',
    reason: (data.reason as string) ?? '',
    retryCount: (data.retry_count as number) ?? 0,
    nextRetryAt: (data.next_retry_at as string) ?? null,
    lastFailedAt: (data.last_failed_at as string) ?? '',
    status: (data.status as FailedPaymentInfo['status']) ?? 'pending_retry',
  }
}
