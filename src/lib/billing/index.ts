// ============================================================================
// ExamForge AI — Billing Platform — Central Exports
// ============================================================================
// Single entry point for all billing platform services and types.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  BillingCycle,
  InvoiceStatus,
  CouponType,
  TaxType,
  UsageMetric,
  RefundStatus,
  ContractStatus,
  LineItemType,
  PricingTier,
  PlanLimits,
  Invoice,
  InvoiceLineItem,
  Receipt,
  TaxRate,
  Coupon,
  SeatAllocation,
  UsageRecord,
  MeteredUsage,
  EnterpriseContract,
  RefundRequest,
  RevenueMetrics,
  RevenueForecast,
  ChurnAnalysis,
  ChurnReason,
  RevenueByPlan,
  BillingDashboard,
  UsageOverage,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateCouponInput,
  CreateContractInput,
  CreateRefundInput,
  InvoiceFilters,
  RefundFilters,
  ProrationResult,
  Subscription,
  OrganizationBillingOverview,
} from './types'

export {
  BILLING_CYCLE_MULTIPLIERS,
  BILLING_CYCLE_DISCOUNTS,
} from './types'

// ──────────────────────────────────────────────────────────────
// Subscription Service
// ──────────────────────────────────────────────────────────────

export {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  changePlan,
  calculateProration,
  getSubscriptionUsage,
  checkSeatAvailability,
  addSeats,
  removeSeats,
  getOrganizationBilling,
} from './subscription-service'

// ──────────────────────────────────────────────────────────────
// Invoice Service
// ──────────────────────────────────────────────────────────────

export {
  generateInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  voidInvoice,
  markInvoiceSent,
  calculateInvoiceTotal,
  applyTaxRates,
  getTaxRatesForRegion,
  getNextInvoiceNumber,
  sendInvoiceEmail,
  generateInvoicePDF,
  getOutstandingInvoices,
} from './invoice-service'

// ──────────────────────────────────────────────────────────────
// Usage Service
// ──────────────────────────────────────────────────────────────

export {
  recordUsage,
  getUsage,
  getMeteredBilling,
  checkUsageLimit,
  getUsageBreakdown,
  aggregateUsage,
  getUsageForecast,
} from './usage-service'

// ──────────────────────────────────────────────────────────────
// Coupon Service
// ──────────────────────────────────────────────────────────────

export {
  createCoupon,
  getCoupon,
  validateCoupon,
  applyCoupon,
  deactivateCoupon,
  getCouponUsageStats,
} from './coupon-service'

// ──────────────────────────────────────────────────────────────
// Enterprise Contract Service
// ──────────────────────────────────────────────────────────────

export {
  createContract,
  getContract,
  updateContract,
  signContract,
  terminateContract,
  renewContract,
  getActiveContracts,
  getContractRevenueForecast,
} from './enterprise-contract-service'

// ──────────────────────────────────────────────────────────────
// Revenue Dashboard Service
// ──────────────────────────────────────────────────────────────

export {
  getRevenueMetrics,
  getRevenueByPeriod,
  getRevenueByPlan,
  getRevenueForecast,
  getChurnAnalysis,
  getOutstandingRevenue,
  getCollectionRate,
  getTopRevenueOrgs,
  getBillingDashboard,
} from './revenue-dashboard-service'

// ──────────────────────────────────────────────────────────────
// Refund Service
// ──────────────────────────────────────────────────────────────

export {
  createRefundRequest,
  processRefund,
  getRefund,
  listRefunds,
  approveRefund,
  rejectRefund,
  calculateRefundAmount,
} from './refund-service'

// ──────────────────────────────────────────────────────────────
// Plan Gate (Feature Gating)
// ──────────────────────────────────────────────────────────────

export {
  PLAN_HIERARCHY,
  PLAN_TIERS_ASCENDING,
  canAccessFeature,
  requirePlan,
  requireFeature,
  enforcePlanLimit,
  getPlanForOrganization,
  checkFeatureAccess,
} from './plan-gate'

export { PLAN_FEATURES, type PlanFeature } from './plan-features'
