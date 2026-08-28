// ============================================================================
// ExamForge AI — Canonical Shared Types
// ============================================================================
// Single source of truth for all shared types across the platform.
// Eliminates duplicated type definitions scattered across services.
// ============================================================================
// RULE: If a type is used by 2+ modules, it MUST be defined here.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// User & Auth Types
// ──────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'parent' | 'teacher' | 'school_admin' | 'super_admin'

export const USER_ROLES: UserRole[] = ['student', 'parent', 'teacher', 'school_admin', 'super_admin']

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  parent: 1,
  teacher: 2,
  school_admin: 3,
  super_admin: 4,
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  schoolId: string | null
  organizationId: string | null
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
}

// ──────────────────────────────────────────────────────────────
// Organization & Tenant Types
// ──────────────────────────────────────────────────────────────

export type OrganizationType = 'school' | 'district' | 'state' | 'national' | 'tutoring_center' | 'corporate'

export type OrganizationTier = 'free' | 'starter' | 'professional' | 'enterprise'

export interface OrganizationContext {
  organizationId: string
  organizationType: OrganizationType
  tier: OrganizationTier
  name: string
  code: string
  isActive: boolean
}

// ──────────────────────────────────────────────────────────────
// Exam & CBT Types
// ──────────────────────────────────────────────────────────────

export type ExamStatus = 'draft' | 'review' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled'

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank'
  | 'multi_select'
  | 'matching'
  | 'ordering'

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'timed_out'

export interface ExamSummary {
  id: string
  title: string
  subject: string
  status: ExamStatus
  totalQuestions: number
  totalMarks: number
  durationMinutes: number
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// API Response Types
// ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CursorPaginatedResponse<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
}

export interface ApiErrorResponse {
  error: string
  code: string
  message: string
  details?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Billing Types
// ──────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

// ──────────────────────────────────────────────────────────────
// AI Types
// ──────────────────────────────────────────────────────────────

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'grok' | 'local_llm'

export type AiGenerationStatus = 'processing' | 'completed' | 'failed'

// ──────────────────────────────────────────────────────────────
// Audit & Security Types
// ──────────────────────────────────────────────────────────────

export type AuditResult = 'success' | 'failure' | 'denied' | 'error' | 'warning'

export type AnomalyType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'privilege_escalation'
  | 'unusual_time_access'
  | 'mass_export'
  | 'multiple_failed_mfa'
  | 'account_takeover'

// ──────────────────────────────────────────────────────────────
// Marketplace Types
// ──────────────────────────────────────────────────────────────

export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'disputed'

// ──────────────────────────────────────────────────────────────
// Event Bus Types
// ──────────────────────────────────────────────────────────────

export type EventResult = 'success' | 'failure'

// ──────────────────────────────────────────────────────────────
// Utility Types
// ──────────────────────────────────────────────────────────────

/** Make specific keys required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/** Brand type for IDs to prevent mixing (e.g., UserId vs SchoolId) */
export type Brand<K, T> = K & { __brand: T }

export type UserId = Brand<string, 'UserId'>
export type SchoolId = Brand<string, 'SchoolId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type ExamId = Brand<string, 'ExamId'>
