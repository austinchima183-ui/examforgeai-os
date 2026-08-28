// ============================================================================
// ExamForge AI — Extended Billing Type Definitions
// ============================================================================
// Extended types for multi-provider billing verification, webhook processing,
// subscription lifecycle, refund workflows, and payment audit trails.
// Extends the existing billing/types.ts without replacing it.
// ============================================================================

import type { PaymentVerificationResult, RefundResult } from '@/lib/payment/payment-security'
import type { Subscription, ProrationResult, InvoiceLineItem } from './types'

// ──────────────────────────────────────────────────────────────
// Payment Provider (Extended)
// ──────────────────────────────────────────────────────────────

/** Extended provider type supporting both Flutterwave and Paystack */
export type PaymentProvider = 'flutterwave' | 'paystack'

// ──────────────────────────────────────────────────────────────
// Paystack Configuration
// ──────────────────────────────────────────────────────────────

export interface PaystackConfig {
  secretKey: string
  publicKey: string
  baseUrl: string
}

// ──────────────────────────────────────────────────────────────
// Paystack Transaction Result
// ──────────────────────────────────────────────────────────────

export interface PaystackInitResult {
  success: boolean
  authorizationUrl?: string
  accessCode?: string
  reference?: string
  error?: string
}

// ──────────────────────────────────────────────────────────────
// Idempotency Record
// ──────────────────────────────────────────────────────────────

export interface IdempotencyRecord {
  id: string
  key: string
  provider: PaymentProvider
  requestHash: string
  responseHash: string
  status: 'processed' | 'failed'
  createdAt: string
  expiresAt: string
}

export interface IdempotencyResult {
  isProcessed: boolean
  record?: IdempotencyRecord
}

// ──────────────────────────────────────────────────────────────
// Payment Audit Entry
// ──────────────────────────────────────────────────────────────

export interface PaymentAuditEntry {
  id: string
  paymentId: string
  action: string
  provider: PaymentProvider
  metadata: Record<string, unknown>
  performedBy: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Subscription Events
// ──────────────────────────────────────────────────────────────

export type SubscriptionEvent =
  | 'created'
  | 'activated'
  | 'renewed'
  | 'downgraded'
  | 'upgraded'
  | 'cancelled'
  | 'expired'
  | 'past_due'
  | 'paused'
  | 'resumed'

// ──────────────────────────────────────────────────────────────
// Refund Workflow
// ──────────────────────────────────────────────────────────────

export interface RefundWorkflow {
  id: string
  paymentId: string
  reason: string
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'rejected'
  requestedBy: string
  approvedBy: string | null
  processedAt: string | null
  providerRefundId: string | null
  amount: number
  currency: string
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Invoice Generation (Extended)
// ──────────────────────────────────────────────────────────────

export interface InvoiceLineItemExtended extends InvoiceLineItem {
  taxInclusive?: boolean
  prorated?: boolean
  prorationDetails?: {
    creditAmount: number
    debitAmount: number
    remainingDays: number
    totalDaysInPeriod: number
  }
}

export interface InvoiceGeneration {
  id: string
  subscriptionId: string
  orgId: string
  periodStart: string
  periodEnd: string
  lineItems: InvoiceLineItemExtended[]
  subtotal: number
  tax: number
  total: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'void'
  invoiceNumber: string
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Webhook Event
// ──────────────────────────────────────────────────────────────

export interface WebhookEvent {
  id: string
  provider: PaymentProvider
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  signature: string
  processed: boolean
  processedAt: string | null
  idempotencyKey: string
  createdAt: string
}

export interface WebhookResult {
  success: boolean
  error?: string
  eventId?: string
}

// ──────────────────────────────────────────────────────────────
// Payment Provider Adapter Interface
// ──────────────────────────────────────────────────────────────

export interface PaymentProviderAdapter {
  initialize(_params: {
    email: string
    amount: number
    currency: string
    reference: string
    metadata?: Record<string, unknown>
  }): Promise<{ success: boolean; checkoutUrl?: string; reference?: string; error?: string }>

  verify(_reference: string): Promise<PaymentVerificationResult>

  refund(_reference: string, _amount?: number): Promise<RefundResult>

  getWebhookSecret(): string
}

// ──────────────────────────────────────────────────────────────
// Failed Payment Info
// ──────────────────────────────────────────────────────────────

export interface FailedPaymentInfo {
  id: string
  paymentId: string
  subscriptionId: string | null
  orgId: string
  amount: number
  currency: string
  provider: PaymentProvider
  reason: string
  retryCount: number
  nextRetryAt: string | null
  lastFailedAt: string
  status: 'pending_retry' | 'retrying' | 'suspended' | 'cancelled'
}

// ──────────────────────────────────────────────────────────────
// Subscription Lifecycle Result
// ──────────────────────────────────────────────────────────────

export interface SubscriptionLifecycleResult {
  success: boolean
  subscription?: Subscription
  proration?: ProrationResult
  error?: string
}

// ──────────────────────────────────────────────────────────────
// Dunning Configuration
// ──────────────────────────────────────────────────────────────

export const DUNNING_SCHEDULE = [
  { retryNumber: 1, delayMs: 60 * 60 * 1000, label: '1 hour' },      // 1st retry: 1 hour
  { retryNumber: 2, delayMs: 24 * 60 * 60 * 1000, label: '24 hours' }, // 2nd retry: 24 hours
  { retryNumber: 3, delayMs: 3 * 24 * 60 * 60 * 1000, label: '3 days' }, // 3rd retry: 3 days
] as const

/** After 3 failed retries, subscription is suspended */
export const MAX_RETRY_ATTEMPTS = 3

/** Grace period for past-due subscriptions before suspension (7 days) */
export const PAST_DUE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

/** Idempotency record TTL (24 hours) */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

/** Default replay tolerance (5 minutes) */
export const DEFAULT_REPLAY_TOLERANCE_MS = 5 * 60 * 1000
