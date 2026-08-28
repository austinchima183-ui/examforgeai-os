// ============================================================================
// ExamForge AI — Refund Workflow Service
// ============================================================================
// Two-step refund workflow with request, approval, processing, and rejection.
// Refunds require approval before execution to prevent unauthorized refunds.
//
// SECURITY PRINCIPLES:
// 1. Two-step approval required for all refunds
// 2. Only administrators can approve refunds
// 3. Refunds are only processed after approval
// 4. Refund provider is called only after internal approval
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { createPaymentProvider } from './providers/provider-factory'
import { recordAuditEntry } from './payment-audit'
import type { RefundWorkflow, PaymentProvider } from './types-extended'

const log = createLogger('billing:refund-workflow')

// ──────────────────────────────────────────────────────────────
// requestRefund
// ──────────────────────────────────────────────────────────────

/**
 * Requests a refund for a payment.
 *
 * The refund starts in 'requested' status and must be approved before
 * processing. This is the first step in the two-step refund workflow.
 *
 * @param paymentId - The payment ID to refund
 * @param reason - The reason for the refund
 * @param requestedBy - The user ID requesting the refund
 * @returns RefundWorkflow with the created refund request
 */
export async function requestRefund(
  paymentId: string,
  reason: string,
  requestedBy: string
): Promise<RefundWorkflow> {
  const supabase = await createClient()

  // Verify the payment exists and is refundable
  const { data: payment } = await supabase
    .from('transactions')
    .select('id, amount, currency, status, provider, transaction_ref')
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`)
  }

  if (payment.status !== 'successful') {
    throw new Error(`Cannot refund payment with status '${payment.status}'`)
  }

  // Check for existing pending/completed refunds
  const { data: existingRefunds } = await supabase
    .from('refund_workflows')
    .select('amount, status')
    .eq('payment_id', paymentId)
    .in('status', ['requested', 'approved', 'processing', 'completed'])

  const totalPendingOrCompleted = (existingRefunds ?? []).reduce(
    (sum, r) => sum + (r.amount as number ?? 0), 0
  )

  if (totalPendingOrCompleted >= (payment.amount as number ?? 0)) {
    throw new Error('Total refund amount already covers or exceeds payment amount')
  }

  // Create refund workflow entry
  const { data: refund, error } = await supabase
    .from('refund_workflows')
    .insert({
      payment_id: paymentId,
      reason,
      status: 'requested',
      requested_by: requestedBy,
      amount: payment.amount,
      currency: payment.currency ?? 'NGN',
    })
    .select('*')
    .single()

  if (error || !refund) {
    throw new Error(`Failed to create refund request: ${error?.message ?? 'Unknown error'}`)
  }

  const provider = (payment.provider as PaymentProvider) ?? 'flutterwave'

  await recordAuditEntry(paymentId, 'refund.requested', provider, {
    refundId: refund.id,
    reason,
    amount: payment.amount,
  }, requestedBy)

  log.info('Refund requested', { refundId: refund.id, paymentId, amount: payment.amount })

  return mapRefundWorkflowFromDb(refund)
}

// ──────────────────────────────────────────────────────────────
// approveRefund
// ──────────────────────────────────────────────────────────────

/**
 * Approves a refund request.
 *
 * Only administrators can approve refunds. The refund must be in
 * 'requested' status to be approved.
 *
 * @param refundId - The refund workflow ID to approve
 * @param approvedBy - The user ID approving the refund (must be admin)
 * @returns void
 */
export async function approveRefund(
  refundId: string,
  approvedBy: string
): Promise<void> {
  const supabase = await createClient()

  // Verify approver has admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', approvedBy)
    .maybeSingle()

  const allowedRoles = ['super_admin', 'school_admin', 'admin']
  if (!profile || !allowedRoles.includes(profile.role as string)) {
    throw new Error('Only administrators can approve refunds')
  }

  // Get the refund workflow
  const { data: refund } = await supabase
    .from('refund_workflows')
    .select('*')
    .eq('id', refundId)
    .maybeSingle()

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'requested') {
    throw new Error(`Cannot approve refund in '${refund.status}' status — must be 'requested'`)
  }

  // Approve the refund
  const { error } = await supabase
    .from('refund_workflows')
    .update({
      status: 'approved',
      approved_by: approvedBy,
    })
    .eq('id', refundId)

  if (error) {
    throw new Error(`Failed to approve refund: ${error.message}`)
  }

  await recordAuditEntry(
    refund.payment_id as string,
    'refund.approved',
    'flutterwave',
    { refundId, approvedBy },
    approvedBy
  )

  log.info('Refund approved', { refundId, approvedBy })
}

// ──────────────────────────────────────────────────────────────
// processRefund
// ──────────────────────────────────────────────────────────────

/**
 * Processes an approved refund by calling the payment provider.
 *
 * The refund must be in 'approved' status before processing.
 * After processing, the refund is marked as 'completed' and
 * the payment status is updated.
 *
 * @param refundId - The refund workflow ID to process
 * @returns void
 */
export async function processRefund(refundId: string): Promise<void> {
  const supabase = await createClient()

  const { data: refund } = await supabase
    .from('refund_workflows')
    .select('*')
    .eq('id', refundId)
    .maybeSingle()

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'approved') {
    throw new Error(`Cannot process refund in '${refund.status}' status — must be 'approved'`)
  }

  // Update status to processing
  await supabase
    .from('refund_workflows')
    .update({ status: 'processing' })
    .eq('id', refundId)

  // Get payment details
  const { data: payment } = await supabase
    .from('transactions')
    .select('transaction_ref, provider, amount')
    .eq('id', refund.payment_id)
    .maybeSingle()

  if (!payment?.transaction_ref) {
    await supabase
      .from('refund_workflows')
      .update({ status: 'rejected' })
      .eq('id', refundId)

    throw new Error('Cannot process refund: missing payment gateway reference')
  }

  // Call the payment provider to execute the refund
  const provider = (payment.provider as PaymentProvider) ?? 'flutterwave'

  try {
    const adapter = createPaymentProvider(provider)
    const result = await adapter.refund(
      payment.transaction_ref as string,
      refund.amount as number
    )

    if (!result.success) {
      await supabase
        .from('refund_workflows')
        .update({ status: 'rejected' })
        .eq('id', refundId)

      throw new Error(`Provider refund failed: ${result.error ?? 'Unknown error'}`)
    }

    // Mark refund as completed
    await supabase
      .from('refund_workflows')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        provider_refund_id: result.refundId ?? null,
      })
      .eq('id', refundId)

    // Update payment status
    await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .eq('id', refund.payment_id)

    await recordAuditEntry(
      refund.payment_id as string,
      'refund.completed',
      provider,
      { refundId, providerRefundId: result.refundId, amount: refund.amount }
    )

    log.info('Refund processed successfully', { refundId, providerRefundId: result.refundId })
  } catch (error) {
    log.error('Refund processing failed', error, { refundId })

    await recordAuditEntry(
      refund.payment_id as string,
      'refund.failed',
      provider,
      { refundId, error: error instanceof Error ? error.message : 'Unknown' }
    )

    throw error
  }
}

// ──────────────────────────────────────────────────────────────
// rejectRefund
// ──────────────────────────────────────────────────────────────

/**
 * Rejects a refund request.
 *
 * @param refundId - The refund workflow ID to reject
 * @param reason - The reason for rejection
 * @param rejectedBy - The user ID rejecting the refund
 * @returns void
 */
export async function rejectRefund(
  refundId: string,
  reason: string,
  rejectedBy: string
): Promise<void> {
  const supabase = await createClient()

  const { data: refund } = await supabase
    .from('refund_workflows')
    .select('*')
    .eq('id', refundId)
    .maybeSingle()

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'requested' && refund.status !== 'approved') {
    throw new Error(`Cannot reject refund in '${refund.status}' status`)
  }

  const { error } = await supabase
    .from('refund_workflows')
    .update({ status: 'rejected' })
    .eq('id', refundId)

  if (error) {
    throw new Error(`Failed to reject refund: ${error.message}`)
  }

  await recordAuditEntry(
    refund.payment_id as string,
    'refund.rejected',
    'flutterwave',
    { refundId, reason, rejectedBy },
    rejectedBy
  )

  log.info('Refund rejected', { refundId, reason })
}

// ──────────────────────────────────────────────────────────────
// getRefundStatus
// ──────────────────────────────────────────────────────────────

/**
 * Gets the current status of a refund workflow.
 *
 * @param refundId - The refund workflow ID
 * @returns RefundWorkflow with current status
 */
export async function getRefundStatus(refundId: string): Promise<RefundWorkflow> {
  const supabase = await createClient()

  const { data: refund, error } = await supabase
    .from('refund_workflows')
    .select('*')
    .eq('id', refundId)
    .maybeSingle()

  if (error || !refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  return mapRefundWorkflowFromDb(refund)
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function mapRefundWorkflowFromDb(data: Record<string, unknown>): RefundWorkflow {
  return {
    id: data.id as string,
    paymentId: (data.payment_id as string) ?? '',
    reason: (data.reason as string) ?? '',
    status: (data.status as RefundWorkflow['status']) ?? 'requested',
    requestedBy: (data.requested_by as string) ?? '',
    approvedBy: (data.approved_by as string) ?? null,
    processedAt: (data.processed_at as string) ?? null,
    providerRefundId: (data.provider_refund_id as string) ?? null,
    amount: (data.amount as number) ?? 0,
    currency: (data.currency as string) ?? 'NGN',
    createdAt: (data.created_at as string) ?? '',
    updatedAt: (data.updated_at as string) ?? '',
  }
}
