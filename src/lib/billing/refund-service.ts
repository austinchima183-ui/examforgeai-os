// ============================================================================
// ExamForge AI — Refund Processing Service
// ============================================================================
// Refund request lifecycle: creation, approval, processing via Flutterwave,
// rejection, and prorated refund amount calculations.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  RefundRequest,
  RefundStatus,
  CreateRefundInput,
  RefundFilters,
} from './types'
import type { PlanTier } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// createRefundRequest
// ──────────────────────────────────────────────────────────────

export async function createRefundRequest(input: CreateRefundInput): Promise<RefundRequest> {
  const supabase = await createClient()

  // Verify the payment exists and is refundable
  const { data: payment } = await supabase
    .from('transactions')
    .select('id, amount, currency, status, org_id')
    .eq('id', input.paymentId)
    .maybeSingle()

  if (!payment) {
    throw new Error(`Payment not found: ${input.paymentId}`)
  }

  if (payment.status !== 'successful') {
    throw new Error(`Cannot refund payment with status '${payment.status}'`)
  }

  // Validate refund amount
  if (input.amount <= 0) {
    throw new Error('Refund amount must be positive')
  }

  if (input.amount > (payment.amount ?? 0)) {
    throw new Error(`Refund amount (${input.amount}) exceeds payment amount (${payment.amount})`)
  }

  // Check for existing pending refunds
  const { data: existingRefunds } = await supabase
    .from('refund_requests')
    .select('amount, status')
    .eq('payment_id', input.paymentId)
    .in('status', ['pending', 'approved', 'processing'])

  const pendingAmount = (existingRefunds ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const alreadyRefunded = await getAlreadyRefundedAmount(input.paymentId)

  if (pendingAmount + alreadyRefunded + input.amount > (payment.amount ?? 0)) {
    throw new Error(
      `Total refund amount would exceed payment. Already refunded: ${alreadyRefunded}, Pending: ${pendingAmount}, Requested: ${input.amount}`
    )
  }

  // Create refund request
  const { data: refund, error } = await supabase
    .from('refund_requests')
    .insert({
      payment_id: input.paymentId,
      org_id: input.orgId,
      amount: input.amount,
      currency: payment.currency ?? 'NGN',
      reason: input.reason,
      status: 'pending',
      requested_by: input.requestedBy,
    })
    .select('*')
    .single()

  if (error || !refund) {
    throw new Error(`Failed to create refund request: ${error?.message ?? 'Unknown error'}`)
  }

  return mapRefundFromDb(refund)
}

// ──────────────────────────────────────────────────────────────
// processRefund — Execute refund via Flutterwave
// ──────────────────────────────────────────────────────────────

export async function processRefund(refundId: string): Promise<RefundRequest> {
  const supabase = await createClient()
  const refund = await getRefund(refundId)

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'approved') {
    throw new Error(`Refund must be approved before processing. Current status: ${refund.status}`)
  }

  // Update status to processing
  await supabase
    .from('refund_requests')
    .update({ status: 'processing' })
    .eq('id', refundId)

  // Get the Flutterwave transaction ID from the payment
  const { data: payment } = await supabase
    .from('transactions')
    .select('flutterwave_transaction_id, amount')
    .eq('id', refund.paymentId)
    .maybeSingle()

  if (!payment?.flutterwave_transaction_id) {
    await supabase
      .from('refund_requests')
      .update({
        status: 'failed',
        rejected_reason: 'No Flutterwave transaction ID found for this payment',
      })
      .eq('id', refundId)

    throw new Error('Cannot process refund: missing payment gateway reference')
  }

  // Process via Flutterwave Edge Function
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    await supabase
      .from('refund_requests')
      .update({
        status: 'failed',
        rejected_reason: 'Server misconfiguration: missing Supabase credentials',
      })
      .eq('id', refundId)

    throw new Error('Server misconfiguration: missing Supabase credentials')
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        transactionId: refund.paymentId,
        amount: refund.amount,
        reason: refund.reason,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      await supabase
        .from('refund_requests')
        .update({
          status: 'failed',
          rejected_reason: result.error ?? result.details ?? 'Flutterwave refund failed',
        })
        .eq('id', refundId)

      throw new Error(`Flutterwave refund failed: ${result.error ?? 'Unknown error'}`)
    }

    // Update refund as completed
    await supabase
      .from('refund_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        flutterwave_refund_id: result.refundId,
      })
      .eq('id', refundId)

    // Update payment status
    const alreadyRefunded = await getAlreadyRefundedAmount(refund.paymentId)
    const newTotal = alreadyRefunded + refund.amount

    if (newTotal >= (payment.amount ?? 0)) {
      await supabase
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', refund.paymentId)
    } else {
      await supabase
        .from('transactions')
        .update({ status: 'partially_refunded' })
        .eq('id', refund.paymentId)
    }

    // Update invoice status if applicable
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('payment_id', refund.paymentId)
      .maybeSingle()

    if (invoice) {
      // If full refund, void the invoice
      if (newTotal >= (payment.amount ?? 0)) {
        await supabase
          .from('invoices')
          .update({ status: 'void', voided_at: new Date().toISOString() })
          .eq('id', invoice.id)
      }
    }

    return getRefund(refundId) as Promise<RefundRequest>
  } catch (error) {
    await supabase
      .from('refund_requests')
      .update({
        status: 'failed',
        rejected_reason: error instanceof Error ? error.message : 'Unknown error during Flutterwave refund',
      })
      .eq('id', refundId)

    throw error
  }
}

// ──────────────────────────────────────────────────────────────
// getRefund
// ──────────────────────────────────────────────────────────────

export async function getRefund(id: string): Promise<RefundRequest | null> {
  const supabase = await createClient()

  const { data: refund } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!refund) return null
  return mapRefundFromDb(refund)
}

// ──────────────────────────────────────────────────────────────
// listRefunds — With filters
// ──────────────────────────────────────────────────────────────

export async function listRefunds(
  orgId: string,
  filters: RefundFilters = {}
): Promise<{ refunds: RefundRequest[]; total: number }> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('refund_requests')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.from) {
    query = query.gte('created_at', filters.from)
  }

  if (filters.to) {
    query = query.lte('created_at', filters.to)
  }

  const { data, count } = await query

  const refunds = (data ?? []).map(mapRefundFromDb)

  return { refunds, total: count ?? 0 }
}

// ──────────────────────────────────────────────────────────────
// approveRefund
// ──────────────────────────────────────────────────────────────

export async function approveRefund(
  refundId: string,
  approvedBy: string
): Promise<RefundRequest> {
  const supabase = await createClient()
  const refund = await getRefund(refundId)

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'pending') {
    throw new Error(`Cannot approve refund in ${refund.status} status`)
  }

  // Verify approver has admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', approvedBy)
    .maybeSingle()

  const allowedRoles = ['super_admin', 'school_admin']
  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error('Only administrators can approve refunds')
  }

  const { error } = await supabase
    .from('refund_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
    })
    .eq('id', refundId)

  if (error) {
    throw new Error(`Failed to approve refund: ${error.message}`)
  }

  return getRefund(refundId) as Promise<RefundRequest>
}

// ──────────────────────────────────────────────────────────────
// rejectRefund
// ──────────────────────────────────────────────────────────────

export async function rejectRefund(
  refundId: string,
  reason: string
): Promise<RefundRequest> {
  const supabase = await createClient()
  const refund = await getRefund(refundId)

  if (!refund) {
    throw new Error(`Refund not found: ${refundId}`)
  }

  if (refund.status !== 'pending' && refund.status !== 'approved') {
    throw new Error(`Cannot reject refund in ${refund.status} status`)
  }

  const { error } = await supabase
    .from('refund_requests')
    .update({
      status: 'rejected',
      rejected_reason: reason,
    })
    .eq('id', refundId)

  if (error) {
    throw new Error(`Failed to reject refund: ${error.message}`)
  }

  return getRefund(refundId) as Promise<RefundRequest>
}

// ──────────────────────────────────────────────────────────────
// calculateRefundAmount — Prorated refund calculation
// ──────────────────────────────────────────────────────────────

export function calculateRefundAmount(
  payment: { amount: number; createdAt: string; periodStart: string; periodEnd: string },
  reason: string,
  partial?: { amount?: number; percentage?: number }
): { refundAmount: number; isFullRefund: boolean; description: string } {
  const now = new Date()
  const periodStart = new Date(payment.periodStart)
  const periodEnd = new Date(payment.periodEnd)

  // If a specific partial amount is provided
  if (partial?.amount) {
    return {
      refundAmount: Math.min(partial.amount, payment.amount),
      isFullRefund: partial.amount >= payment.amount,
      description: `Partial refund of ₦${partial.amount.toLocaleString()}`,
    }
  }

  // If a percentage is provided
  if (partial?.percentage) {
    const refundAmount = (payment.amount * partial.percentage) / 100
    return {
      refundAmount: Math.round(refundAmount * 100) / 100,
      isFullRefund: partial.percentage >= 100,
      description: `${partial.percentage}% refund of ₦${payment.amount.toLocaleString()}`,
    }
  }

  // Reason-based refund calculation
  switch (reason.toLowerCase()) {
    case 'duplicate_payment':
    case 'fraud':
    case 'incorrect_amount':
      // Full refund for these reasons
      return {
        refundAmount: payment.amount,
        isFullRefund: true,
        description: `Full refund: ${reason}`,
      }

    case 'cancellation':
    case 'plan_change':
    case 'service_dissatisfaction': {
      // Prorated refund based on unused time
      const totalDaysInPeriod = Math.max(1, Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      ))
      const remainingDays = Math.max(0, Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ))

      const proratedAmount = (payment.amount / totalDaysInPeriod) * remainingDays

      return {
        refundAmount: Math.round(proratedAmount * 100) / 100,
        isFullRefund: false,
        description: `Prorated refund: ${remainingDays}/${totalDaysInPeriod} days remaining (${reason})`,
      }
    }

    case 'trial_cancel': {
      // Full refund within trial period
      const daysSincePayment = Math.ceil(
        (now.getTime() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSincePayment <= 14) {
        return {
          refundAmount: payment.amount,
          isFullRefund: true,
          description: 'Full refund: cancellation within 14-day trial period',
        }
      }

      // Prorated after trial
      const totalDays = Math.max(1, Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      ))
      const remaining = Math.max(0, Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ))
      const prorated = (payment.amount / totalDays) * remaining

      return {
        refundAmount: Math.round(prorated * 100) / 100,
        isFullRefund: false,
        description: `Prorated refund after trial: ${remaining}/${totalDays} days remaining`,
      }
    }

    default:
      // Default to prorated refund
      const totalDays = Math.max(1, Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      ))
      const remaining = Math.max(0, Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ))
      const prorated = (payment.amount / totalDays) * remaining

      return {
        refundAmount: Math.round(prorated * 100) / 100,
        isFullRefund: remaining >= totalDays,
        description: `Prorated refund: ${remaining}/${totalDays} days remaining`,
      }
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Get already refunded amount for a payment
// ──────────────────────────────────────────────────────────────

async function getAlreadyRefundedAmount(paymentId: string): Promise<number> {
  const supabase = await createClient()

  const { data: completedRefunds } = await supabase
    .from('refund_requests')
    .select('amount')
    .eq('payment_id', paymentId)
    .in('status', ['completed'])

  return (completedRefunds ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to RefundRequest
// ──────────────────────────────────────────────────────────────

function mapRefundFromDb(data: Record<string, unknown>): RefundRequest {
  return {
    id: data.id as string,
    paymentId: (data.payment_id as string) ?? '',
    orgId: (data.org_id as string) ?? '',
    amount: (data.amount as number) ?? 0,
    currency: (data.currency as string) ?? 'NGN',
    reason: (data.reason as string) ?? '',
    status: (data.status as RefundStatus) ?? 'pending',
    requestedBy: (data.requested_by as string) ?? '',
    approvedBy: (data.approved_by as string) ?? null,
    processedAt: (data.processed_at as string) ?? null,
    rejectedReason: (data.rejected_reason as string) ?? undefined,
    flutterwaveRefundId: (data.flutterwave_refund_id as string) ?? undefined,
    createdAt: (data.created_at as string) ?? '',
    updatedAt: (data.updated_at as string) ?? '',
  }
}
