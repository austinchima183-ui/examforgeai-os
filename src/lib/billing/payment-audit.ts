// ============================================================================
// ExamForge AI — Payment Audit Trail
// ============================================================================
// Immutable audit trail for all payment operations. Every payment action is
// recorded with full context including who performed it, when, and with what
// provider. Entries are never updated or deleted (append-only).
//
// SECURITY PRINCIPLE: Complete audit trail for compliance and dispute resolution.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { PaymentProvider, PaymentAuditEntry } from './types-extended'

const log = createLogger('billing:audit')

// ──────────────────────────────────────────────────────────────
// In-Memory Audit Buffer (for when DB is unavailable)
// ──────────────────────────────────────────────────────────────

const auditBuffer: PaymentAuditEntry[] = []
const MAX_BUFFER_SIZE = 1000

// ──────────────────────────────────────────────────────────────
// recordAuditEntry
// ──────────────────────────────────────────────────────────────

/**
 * Records an immutable audit entry for a payment action.
 *
 * Audit entries are append-only — they can never be updated or deleted.
 * This ensures a complete trail for compliance, dispute resolution,
 * and forensic investigation.
 *
 * @param paymentId - The payment ID this action relates to
 * @param action - The action performed (e.g., 'webhook.charge.completed')
 * @param provider - The payment provider
 * @param metadata - Additional context for the action
 * @param performedBy - Optional user ID who performed the action (null for system/webhook)
 */
export async function recordAuditEntry(
  paymentId: string,
  action: string,
  provider: PaymentProvider,
  metadata: Record<string, unknown> = {},
  performedBy: string | null = null
): Promise<void> {
  const entry: PaymentAuditEntry = {
    id: crypto.randomUUID(),
    paymentId,
    action,
    provider,
    metadata,
    performedBy,
    createdAt: new Date().toISOString(),
  }

  // Record in database
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('payment_audit_trail')
      .insert({
        id: entry.id,
        payment_id: paymentId,
        action,
        provider,
        metadata,
        performed_by: performedBy,
        created_at: entry.createdAt,
      })

    if (error) {
      log.warn('Could not record audit entry to DB — buffering', {
        error: error.message,
        paymentId,
        action,
      })
      bufferEntry(entry)
    }
  } catch (error) {
    log.warn('Audit recording failed — buffering', {
      error: error instanceof Error ? error.message : String(error),
      paymentId,
      action,
    })
    bufferEntry(entry)
  }
}

// ──────────────────────────────────────────────────────────────
// getAuditTrail
// ──────────────────────────────────────────────────────────────

/**
 * Retrieves the complete audit trail for a payment.
 *
 * Returns entries in chronological order (oldest first).
 * The trail is immutable — no entries can be modified or removed.
 *
 * @param paymentId - The payment ID to get the audit trail for
 * @returns Array of audit entries in chronological order
 */
export async function getAuditTrail(paymentId: string): Promise<PaymentAuditEntry[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payment_audit_trail')
      .select('*')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: true })

    if (error) {
      log.error('Failed to get audit trail', error, { paymentId })
      return []
    }

    return (data ?? []).map(mapAuditEntryFromDb)
  } catch (error) {
    log.error('getAuditTrail error', error, { paymentId })
    return []
  }
}

// ──────────────────────────────────────────────────────────────
// getAuditTrailBySubscription
// ──────────────────────────────────────────────────────────────

/**
 * Retrieves the audit trail for all payments associated with a subscription.
 *
 * @param subscriptionId - The subscription ID to get the audit trail for
 * @returns Array of audit entries in chronological order
 */
export async function getAuditTrailBySubscription(
  subscriptionId: string
): Promise<PaymentAuditEntry[]> {
  try {
    const supabase = await createClient()

    // First get all payment IDs for this subscription
    const { data: payments } = await supabase
      .from('transactions')
      .select('id')
      .eq('subscription_id', subscriptionId)

    if (!payments || payments.length === 0) {
      return []
    }

    const paymentIds = payments.map((p) => p.id as string)

    const { data, error } = await supabase
      .from('payment_audit_trail')
      .select('*')
      .in('payment_id', paymentIds)
      .order('created_at', { ascending: true })

    if (error) {
      log.error('Failed to get subscription audit trail', error, { subscriptionId })
      return []
    }

    return (data ?? []).map(mapAuditEntryFromDb)
  } catch (error) {
    log.error('getAuditTrailBySubscription error', error, { subscriptionId })
    return []
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function bufferEntry(entry: PaymentAuditEntry): void {
  auditBuffer.push(entry)
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.shift() // Remove oldest entry
  }
}

function mapAuditEntryFromDb(data: Record<string, unknown>): PaymentAuditEntry {
  return {
    id: data.id as string,
    paymentId: (data.payment_id as string) ?? '',
    action: (data.action as string) ?? '',
    provider: (data.provider as PaymentProvider) ?? 'flutterwave',
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    performedBy: (data.performed_by as string | null) ?? null,
    createdAt: (data.created_at as string) ?? '',
  }
}
