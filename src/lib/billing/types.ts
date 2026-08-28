// ============================================================================
// ExamForge AI — Billing Platform Type Definitions
// ============================================================================
// Comprehensive TypeScript types for the production billing platform.
// Covers subscriptions, invoices, usage metering, coupons, enterprise contracts,
// refunds, and revenue analytics.
// ============================================================================

import type { PlanTier, BillingModel } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Billing Cycle
// ──────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'biennial' | 'lifetime'

// ──────────────────────────────────────────────────────────────
// Invoice Status
// ──────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void' | 'uncollectible'

// ──────────────────────────────────────────────────────────────
// Coupon Type
// ──────────────────────────────────────────────────────────────

export type CouponType = 'percentage' | 'fixed' | 'free_trial'

// ──────────────────────────────────────────────────────────────
// Tax Type
// ──────────────────────────────────────────────────────────────

export type TaxType = 'inclusive' | 'exclusive'

// ──────────────────────────────────────────────────────────────
// Usage Metric
// ──────────────────────────────────────────────────────────────

export type UsageMetric = 'ai_credits' | 'api_calls' | 'storage_gb' | 'exam_sessions' | 'students'

// ──────────────────────────────────────────────────────────────
// Refund Status
// ──────────────────────────────────────────────────────────────

export type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed'

// ──────────────────────────────────────────────────────────────
// Contract Status
// ──────────────────────────────────────────────────────────────

export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated' | 'renewed'

// ──────────────────────────────────────────────────────────────
// Invoice Line Item Type
// ──────────────────────────────────────────────────────────────

export type LineItemType = 'subscription' | 'metered_usage' | 'seat' | 'addon' | 'discount' | 'tax' | 'credit'

// ──────────────────────────────────────────────────────────────
// Pricing Tier — Full plan definition
// ──────────────────────────────────────────────────────────────

export interface PricingTier {
  id: string
  name: string
  tier: PlanTier
  billingModel: BillingModel
  description: string
  monthlyPrice: number
  quarterlyPrice: number
  annualPrice: number
  biennialPrice: number
  lifetimePrice: number | null
  currency: string
  features: string[]
  limits: PlanLimits
  popular?: boolean
}

export interface PlanLimits {
  maxStudents: number
  maxAiCredits: number
  maxApiCalls: number
  maxStorageGb: number
  maxExamSessions: number
  maxTeachers: number
  maxSchools: number
  maxSeats: number
  customBranding: boolean
  prioritySupport: boolean
  dedicatedAccountManager: boolean
  ssoEnabled: boolean
  auditLogRetentionDays: number
}

// ──────────────────────────────────────────────────────────────
// Invoice
// ──────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  orgId: string
  number: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  currency: string
  status: InvoiceStatus
  dueDate: string
  issuedAt: string | null
  paidAt: string | null
  voidedAt: string | null
  createdAt: string
  updatedAt: string
  notes?: string
  couponId?: string
  subscriptionId?: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  type: LineItemType
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Receipt
// ──────────────────────────────────────────────────────────────

export interface Receipt {
  id: string
  invoiceId: string
  paymentId: string
  amount: number
  currency: string
  method: string
  date: string
  refNumber?: string
}

// ──────────────────────────────────────────────────────────────
// Tax Rate
// ──────────────────────────────────────────────────────────────

export interface TaxRate {
  id: string
  name: string
  rate: number
  region: string
  type: TaxType
  effectiveDate: string
  expiryDate?: string
  compound?: boolean
}

// ──────────────────────────────────────────────────────────────
// Coupon
// ──────────────────────────────────────────────────────────────

export interface Coupon {
  id: string
  code: string
  name: string
  type: CouponType
  value: number
  maxUses: number | null
  usedCount: number
  validFrom: string
  validUntil: string | null
  applicablePlans: PlanTier[]
  applicableBillingCycles?: BillingCycle[]
  minAmount?: number
  maxDiscount?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Seat Allocation
// ──────────────────────────────────────────────────────────────

export interface SeatAllocation {
  id: string
  orgId: string
  planId: string
  totalSeats: number
  usedSeats: number
  availableSeats: number
  seatPrice: number
  currency: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Usage Record
// ──────────────────────────────────────────────────────────────

export interface UsageRecord {
  id: string
  orgId: string
  metric: UsageMetric
  quantity: number
  period: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Metered Usage
// ──────────────────────────────────────────────────────────────

export interface MeteredUsage {
  metric: UsageMetric
  quantity: number
  unitPrice: number
  total: number
  includedQuantity: number
  overageQuantity: number
}

// ──────────────────────────────────────────────────────────────
// Enterprise Contract
// ──────────────────────────────────────────────────────────────

export interface EnterpriseContract {
  id: string
  orgId: string
  startDate: string
  endDate: string
  value: number
  currency: string
  terms: Record<string, unknown>
  signedBy: string | null
  signedAt: string | null
  status: ContractStatus
  createdAt: string
  updatedAt: string
  notes?: string
}

// ──────────────────────────────────────────────────────────────
// Refund Request
// ──────────────────────────────────────────────────────────────

export interface RefundRequest {
  id: string
  paymentId: string
  orgId: string
  amount: number
  currency: string
  reason: string
  status: RefundStatus
  requestedBy: string
  approvedBy: string | null
  processedAt: string | null
  rejectedReason?: string
  flutterwaveRefundId?: string
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Revenue Metrics
// ──────────────────────────────────────────────────────────────

export interface RevenueMetrics {
  mrr: number
  arr: number
  churn: number
  expansion: number
  contraction: number
  netRetention: number
  outstandingRevenue: number
  totalRevenue: number
  activeSubscriptions: number
  periodStart: string
  periodEnd: string
}

// ──────────────────────────────────────────────────────────────
// Revenue Forecast
// ──────────────────────────────────────────────────────────────

export interface RevenueForecast {
  month: string
  projectedMrr: number
  projectedArr: number
  confidence: number
  assumptions: string[]
}

// ──────────────────────────────────────────────────────────────
// Churn Analysis
// ──────────────────────────────────────────────────────────────

export interface ChurnAnalysis {
  churnRate: number
  totalCancellations: number
  totalActiveAtStart: number
  reasons: ChurnReason[]
  churnByPlan: Record<PlanTier, number>
  periodStart: string
  periodEnd: string
}

export interface ChurnReason {
  reason: string
  count: number
  percentage: number
}

// ──────────────────────────────────────────────────────────────
// Revenue By Plan
// ──────────────────────────────────────────────────────────────

export interface RevenueByPlan {
  tier: PlanTier
  mrr: number
  arr: number
  subscriberCount: number
  percentage: number
}

// ──────────────────────────────────────────────────────────────
// Billing Dashboard
// ──────────────────────────────────────────────────────────────

export interface BillingDashboard {
  revenue: RevenueMetrics
  invoices: {
    total: number
    paid: number
    outstanding: number
    overdue: number
    draftCount: number
  }
  subscriptions: {
    active: number
    trial: number
    cancelled: number
    pastDue: number
  }
  usage: {
    currentPeriod: MeteredUsage[]
    overages: UsageOverage[]
  }
  forecasts: RevenueForecast[]
}

export interface UsageOverage {
  metric: UsageMetric
  limit: number
  used: number
  overage: number
  overageCost: number
}

// ──────────────────────────────────────────────────────────────
// Service Input Types
// ──────────────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  orgId: string
  plan: PlanTier
  billingCycle: BillingCycle
  seats: number
  couponCode?: string
}

export interface UpdateSubscriptionInput {
  plan?: PlanTier
  billingCycle?: BillingCycle
  seats?: number
}

export interface CreateCouponInput {
  code: string
  name: string
  type: CouponType
  value: number
  maxUses?: number
  validFrom: string
  validUntil?: string
  applicablePlans: PlanTier[]
  applicableBillingCycles?: BillingCycle[]
  minAmount?: number
  maxDiscount?: number
}

export interface CreateContractInput {
  orgId: string
  startDate: string
  endDate: string
  value: number
  currency: string
  terms: Record<string, unknown>
  notes?: string
}

export interface CreateRefundInput {
  paymentId: string
  orgId: string
  amount: number
  reason: string
  requestedBy: string
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface RefundFilters {
  status?: RefundStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

// ──────────────────────────────────────────────────────────────
// Proration Result
// ──────────────────────────────────────────────────────────────

export interface ProrationResult {
  creditAmount: number
  debitAmount: number
  netAmount: number
  remainingDays: number
  totalDaysInPeriod: number
  creditDescription: string
  debitDescription: string
}

// ──────────────────────────────────────────────────────────────
// Subscription (full model from DB)
// ──────────────────────────────────────────────────────────────

export interface Subscription {
  id: string
  orgId: string
  userId: string
  planId: string
  planTier: PlanTier
  billingCycle: BillingCycle
  billingModel: BillingModel
  status: string
  seats: number
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  cancelledAt: string | null
  cancelledReason: string | null
  couponId: string | null
  trialStart: string | null
  trialEnd: string | null
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Organization Billing Overview
// ──────────────────────────────────────────────────────────────

export interface OrganizationBillingOverview {
  subscription: Subscription | null
  plan: PricingTier | null
  seatAllocation: SeatAllocation | null
  currentUsage: MeteredUsage[]
  outstandingInvoices: Invoice[]
  recentInvoices: Invoice[]
  upcomingInvoice: {
    amount: number
    currency: string
    date: string
  } | null
}

// ──────────────────────────────────────────────────────────────
// Pricing Constants
// ──────────────────────────────────────────────────────────────

export const BILLING_CYCLE_MULTIPLIERS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  biennial: 24,
  lifetime: 0,
}

export const BILLING_CYCLE_DISCOUNTS: Record<BillingCycle, number> = {
  monthly: 0,
  quarterly: 0.05,
  annual: 0.15,
  biennial: 0.25,
  lifetime: 0,
}
