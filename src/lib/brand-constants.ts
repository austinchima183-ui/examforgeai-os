// ============================================================================
// ExamForge AI — Centralized Brand Constants
// ============================================================================
// Single source of truth for all metrics, stats, and claims used across
// the marketing website. This prevents the data inconsistency issues
// flagged in the design audit (e.g., 120K vs 200K students).
// ============================================================================

export const BRAND = {
  name: 'ExamForge AI',
  tagline: 'The AI Operating System for Modern Schools',
  domain: 'examforge.ai',
  url: 'https://examforge.ai',
  description: 'One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
} as const

// ─── Verified Metrics (Single Source of Truth) ───
// These numbers are used across: hero, trusted-by, about, customers, cta, footer
// Update HERE and all pages will reflect the change.
export const METRICS = {
  schools: 500,
  schoolsLabel: '500+',
  students: 120_000,
  studentsLabel: '120K+',
  examsDelivered: 2_000_000,
  examsDeliveredLabel: '2M+',
  countries: 4,
  countriesLabel: '4',
  uptimeSla: 99.9,
  uptimeSlaLabel: '99.9%',
  aiAccuracy: 99,
  aiAccuracyLabel: '99%',
  timeSaved: 85,
  timeSavedLabel: '85%',
} as const

// ─── Company Info ───
export const COMPANY = {
  founded: '2023',
  funding: 'Series A',
  fundingAmount: '$2.5M',
  teamSize: '15+',
  location: 'Lagos, Nigeria',
  hq: 'Lagos, Nigeria',
  email: 'hello@examforge.ai',
  phone: '+234 (0) 1 234 5678', // Use official contact format
  address: 'Lagos, Nigeria',
} as const

// ─── Product Info ───
export const PRODUCT = {
  trialDays: 14,
  trialLabel: '14-day free trial',
  paymentProvider: 'Flutterwave', // Single source — not "Stripe" in some places
  pricingCurrency: '₦',
  starterPrice: 49,
  proPrice: 149,
  starterPriceAnnual: 39,
  proPriceAnnual: 119,
} as const

// ─── Trial & Guarantee (Consistent) ───
export const GUARANTEE = {
  trialDays: PRODUCT.trialDays,
  trialLabel: PRODUCT.trialLabel,
  moneyBackDays: 14, // Matches trial — no confusion
  moneyBackLabel: '14-day money-back guarantee',
} as const
