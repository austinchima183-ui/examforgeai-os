// ============================================================================
// ExamForge AI — Plan Feature Map
// ============================================================================
// Maps features to the minimum plan tier required to access them.
// Used by plan-gate.ts to enforce feature access based on subscription tier.
// ============================================================================

import type { PlanTier } from '@/lib/supabase/types'

/**
 * Maps each feature to the minimum PlanTier required to access it.
 * The plan hierarchy is: free < starter < professional < enterprise
 *
 * Features not listed here are available to all plans (including free).
 */
export const PLAN_FEATURES: Record<string, PlanTier> = {
  // ─── AI Features ─────────────────────────────────────────────
  ai_question_generation: 'professional',
  ai_copilot: 'professional',
  ai_lesson_planning: 'professional',
  ai_grading_assistance: 'professional',
  ai_content_summarization: 'starter',
  ai_adaptive_learning: 'enterprise',
  ai_plagiarism_detection: 'professional',
  ai_oral_question_generation: 'professional',
  ai_tutor: 'starter',

  // ─── Analytics & Reporting ───────────────────────────────────
  predictive_analytics: 'professional',
  advanced_reports: 'professional',
  custom_report_templates: 'professional',
  data_export: 'starter',
  government_analytics: 'enterprise',
  enterprise_analytics: 'enterprise',

  // ─── Branding & Customization ────────────────────────────────
  custom_branding: 'professional',
  white_label: 'enterprise',
  custom_domain: 'professional',

  // ─── Security & Access ───────────────────────────────────────
  sso: 'enterprise',
  sso_saml: 'enterprise',
  saml_sso: 'enterprise',
  api_access: 'professional',
  developer_api: 'professional',
  webhook_access: 'professional',
  audit_log_export: 'enterprise',
  role_based_access: 'starter',
  custom_roles: 'enterprise',

  // ─── Scale & Capacity ────────────────────────────────────────
  unlimited_students: 'enterprise',
  unlimited_teachers: 'professional',
  multi_campus: 'enterprise',
  cross_campus_access: 'enterprise',

  // ─── Marketplace ─────────────────────────────────────────────
  marketplace_sell: 'professional',
  marketplace_buy: 'starter',
  plugin_marketplace: 'enterprise',

  // ─── Content & Data ──────────────────────────────────────────
  bulk_import: 'professional',
  bulk_export: 'professional',
  question_bank_sharing: 'professional',
  curriculum_management: 'professional',

  // ─── Exam & Assessment ───────────────────────────────────────
  cbt_proctoring: 'enterprise',
  offline_exams: 'professional',
  custom_grading_scales: 'professional',

  // ─── Billing & Enterprise ───────────────────────────────────
  enterprise_billing: 'enterprise',
  advanced_integrations: 'professional',

  // ─── Support ─────────────────────────────────────────────────
  priority_support: 'professional',
  dedicated_account_manager: 'enterprise',
} as const

/**
 * Type representing all feature keys defined in PLAN_FEATURES.
 */
export type PlanFeature = keyof typeof PLAN_FEATURES
