// ============================================================================
// ExamForge AI — In-App Feedback Type System
// ============================================================================
// Comprehensive type definitions for the Blocker 2 feedback platform.
// Covers bug reports, feature requests, AI ratings, result disputes,
// accessibility issues, and general feedback with full context capture.
// ============================================================================

import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Feedback Type Classification
// ──────────────────────────────────────────────────────────────

/** The category of feedback being submitted */
export type FeedbackType =
  | 'bug_report'
  | 'feature_request'
  | 'ai_rating'
  | 'result_dispute'
  | 'accessibility'
  | 'general'

/** Severity level: 1 (low/cosmetic) to 5 (critical/blocking) */
export type FeedbackSeverity = 1 | 2 | 3 | 4 | 5

/** Lifecycle status of a feedback item */
export type FeedbackStatus =
  | 'open'
  | 'investigating'
  | 'in_progress'
  | 'resolved'
  | 'dismissed'
  | 'duplicate'

/** Priority for triage and scheduling */
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent'

// ──────────────────────────────────────────────────────────────
// Auto-Captured Context
// ──────────────────────────────────────────────────────────────

/** Browser, device, and route context automatically captured at submission time */
export interface FeedbackContext {
  /** Current route path when feedback was triggered */
  route: string
  /** Authenticated user's role */
  userRole: UserRole
  /** Browser name and version (e.g., 'Chrome 120') */
  browser: string
  /** Device type (e.g., 'Desktop', 'Mobile', 'Tablet') */
  device: string
  /** Operating system (e.g., 'Windows 11', 'macOS 14.2') */
  os: string
  /** Viewport dimensions (e.g., '1920x1080') */
  viewport: string
  /** ISO 8601 timestamp of context capture */
  timestamp: string
  /** Session ID for correlation */
  sessionId: string
}

// ──────────────────────────────────────────────────────────────
// Screenshot Attachment
// ──────────────────────────────────────────────────────────────

/** A screenshot attached to a feedback item */
export interface FeedbackScreenshot {
  /** Base64 data URL of the image */
  dataUrl: string
  /** Original file name */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  mimeType: string
}

// ──────────────────────────────────────────────────────────────
// AI Response Rating
// ──────────────────────────────────────────────────────────────

/** Rating for an AI-generated response — used for inline quality feedback */
export interface AIResponseRating {
  /** Quick positive/negative signal */
  thumbsUp: boolean
  /** Numeric rating 1-5 (5 = excellent) */
  rating: 1 | 2 | 3 | 4 | 5
  /** Optional free-text comment */
  comment: string
  /** AI provider name (e.g., 'openai', 'anthropic') */
  provider: string
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  model: string
}

// ──────────────────────────────────────────────────────────────
// Result Dispute
// ──────────────────────────────────────────────────────────────

/** Dispute against an exam result or specific question grading */
export interface ResultDispute {
  /** ID of the exam */
  examId: string
  /** ID of the specific question being disputed */
  questionId: string
  /** The student's submitted answer */
  studentAnswer: string
  /** The marked correct answer */
  correctAnswer: string
  /** Reason for the dispute */
  reason: string
  /** Supporting evidence or references */
  evidence: string
}

// ──────────────────────────────────────────────────────────────
// Core Feedback Interfaces
// ──────────────────────────────────────────────────────────────

/** A single feedback item — the core entity */
export interface FeedbackItem {
  id: string
  /** User who submitted the feedback */
  userId: string
  /** School ID for tenant scoping */
  schoolId: string | null
  /** Feedback category */
  type: FeedbackType
  /** Short title/summary */
  title: string
  /** Detailed description */
  description: string
  /** Severity level (1-5) */
  severity: FeedbackSeverity
  /** Current status */
  status: FeedbackStatus
  /** Triage priority */
  priority: FeedbackPriority
  /** User-assigned to this feedback for resolution */
  assigneeId: string | null
  /** IDs of attached screenshots (stored in Supabase storage) */
  screenshotUrls: string[]
  /** Auto-captured browser/device context */
  context: FeedbackContext | null
  /** AI rating data (only for type=ai_rating) */
  aiRating: AIResponseRating | null
  /** Result dispute data (only for type=result_dispute) */
  resultDispute: ResultDispute | null
  /** Tags for categorization */
  tags: string[]
  /** ID of the feedback this duplicates (only for status=duplicate) */
  duplicateOfId: string | null
  /** Upvote count for feature requests */
  upvotes: number
  /** Soft delete flag */
  isDeleted: boolean
  /** ISO 8601 creation timestamp */
  createdAt: string
  /** ISO 8601 last update timestamp */
  updatedAt: string
  /** ISO 8601 resolution timestamp (null if unresolved) */
  resolvedAt: string | null
}

/** Input for creating a new feedback item */
export interface FeedbackCreateInput {
  type: FeedbackType
  title: string
  description: string
  severity?: FeedbackSeverity
  priority?: FeedbackPriority
  /** School ID — derived server-side from authenticated user if not provided */
  schoolId?: string | null
  /** Screenshot data URLs to upload */
  screenshots?: FeedbackScreenshot[]
  /** Auto-captured context from the client */
  context?: Partial<FeedbackContext>
  /** AI rating (required when type=ai_rating) */
  aiRating?: AIResponseRating
  /** Result dispute (required when type=result_dispute) */
  resultDispute?: ResultDispute
  /** Optional tags */
  tags?: string[]
}

/** Input for updating an existing feedback item */
export interface FeedbackUpdateInput {
  title?: string
  description?: string
  severity?: FeedbackSeverity
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assigneeId?: string | null
  tags?: string[]
  duplicateOfId?: string | null
}

// ──────────────────────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────────────────────

/** A comment on a feedback item */
export interface FeedbackComment {
  id: string
  feedbackId: string
  /** User who wrote the comment */
  userId: string
  /** Comment text (markdown supported) */
  content: string
  /** Internal comments are only visible to staff/admins */
  isInternal: boolean
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Assignment
// ──────────────────────────────────────────────────────────────

/** Represents an assignment of a feedback item to a user */
export interface FeedbackAssignment {
  feedbackId: string
  assigneeId: string
  assignedBy: string
  assignedAt: string
}

// ──────────────────────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────────────────────

/** Aggregated feedback analytics for dashboard display */
export interface FeedbackAnalytics {
  /** Total count by feedback type */
  totalCounts: Record<FeedbackType, number>
  /** Average resolution time in hours (null if no resolved items) */
  avgResolutionTime: number | null
  /** Count by status */
  statusDistribution: Record<FeedbackStatus, number>
  /** Count by severity */
  severityDistribution: Record<FeedbackSeverity, number>
}

/** Filter parameters for querying feedback */
export interface FeedbackFilters {
  type?: FeedbackType
  status?: FeedbackStatus
  severity?: FeedbackSeverity
  priority?: FeedbackPriority
  assigneeId?: string
  schoolId?: string
  userId?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** Paginated feedback list result */
export interface FeedbackListResult {
  items: FeedbackItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}
