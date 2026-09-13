// ============================================================================
// ExamForge AI — Centralized Brand Constants
// ============================================================================
// Single source of truth for brand identity used across the marketing
// website. HONESTY POLICY (RC1 reality audit): this file must contain only
// verifiable facts about the platform. We do not publish adoption metrics,
// customer counts, uptime SLAs, ratings, funding, or certifications we
// cannot substantiate. Capability claims live with the feature code itself.
// ============================================================================

export const BRAND = {
  name: 'ExamForge AI',
  tagline: 'The AI Operating System for Modern Schools',
  domain: 'examforge.ai',
  url: 'https://examforge.ai',
  description: 'One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
} as const

// ─── Platform Facts (verifiable from the shipped product) ───
// These describe WHAT THE PRODUCT DOES — not adoption numbers.
// Used across: hero, about, cta, footer.
export const METRICS = {
  roles: 5,
  rolesLabel: '5',
  modules: 8,
  modulesLabel: '8',
  offlineTolerance: true,
  offlineToleranceLabel: 'Offline-capable CBT',
  aiProviders: 1,
  aiProvidersLabel: 'Real AI question generation',
  curriculumAligned: true,
  curriculumLabel: 'Built for African curricula',
} as const

// ─── Company Info (honest — no unverified funding claims) ───
export const COMPANY = {
  founded: '2023',
  stage: 'Early stage (pilot)',
  teamSize: 'small dedicated team',
  location: 'Lagos, Nigeria',
  hq: 'Lagos, Nigeria',
  email: 'hello@examforge.ai',
  address: 'Lagos, Nigeria',
} as const

// ─── Product Info ───
export const PRODUCT = {
  trialDays: 14,
  trialLabel: '14-day free trial',
  paymentProvider: 'Flutterwave',
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
  moneyBackDays: 14,
  moneyBackLabel: '14-day money-back guarantee',
} as const
