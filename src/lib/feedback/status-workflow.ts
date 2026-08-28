// ============================================================================
// ExamForge AI — Feedback Status Workflow
// ============================================================================
// Defines valid status transitions for feedback items, enforces workflow rules,
// and provides a validated transition function that creates audit trail comments.
// ============================================================================

import type { FeedbackStatus } from './types'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('feedback:status-workflow')

// ──────────────────────────────────────────────────────────────
// Transition Map
// ──────────────────────────────────────────────────────────────

/**
 * Allowed status transitions.
 * Key = current status, Value = set of valid next statuses.
 *
 * Workflow:
 *   open → investigating → in_progress → resolved
 *   open → dismissed                   (invalid/spam)
 *   open → duplicate                   (already reported)
 *   investigating → open              (reopened after investigation)
 *   investigating → dismissed          (not actionable)
 *   investigating → duplicate          (already reported)
 *   in_progress → resolved            (fixed)
 *   in_progress → open                (reopened)
 *   resolved → open                   (reopened — regression)
 *   dismissed → open                  (reopened — reconsidered)
 *   duplicate → open                  (reopened — not actually duplicate)
 */
const VALID_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  open: ['investigating', 'dismissed', 'duplicate'],
  investigating: ['in_progress', 'open', 'dismissed', 'duplicate'],
  in_progress: ['resolved', 'open'],
  resolved: ['open'],
  dismissed: ['open'],
  duplicate: ['open'],
}

// ──────────────────────────────────────────────────────────────
// Transition Validation
// ──────────────────────────────────────────────────────────────

/**
 * Check if a transition from one status to another is valid.
 *
 * @param from - Current status
 * @param to - Proposed new status
 * @returns True if the transition is allowed
 */
export function isValidTransition(from: FeedbackStatus, to: FeedbackStatus): boolean {
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

/**
 * Get all statuses that can be reached from the current status.
 *
 * @param currentStatus - The current feedback status
 * @returns Array of valid next statuses (empty if terminal)
 */
export function getAllowedTransitions(currentStatus: FeedbackStatus): FeedbackStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? []
}

// ──────────────────────────────────────────────────────────────
// Transition Descriptions
// ──────────────────────────────────────────────────────────────

/**
 * Human-readable description for a status transition.
 * Used for audit trail comments.
 */
const TRANSITION_LABELS: Record<string, string> = {
  'open→investigating': 'Status changed to Investigating — team is reviewing the issue',
  'open→dismissed': 'Status changed to Dismissed — issue is not actionable',
  'open→duplicate': 'Status changed to Duplicate — this has already been reported',
  'investigating→in_progress': 'Status changed to In Progress — work has started',
  'investigating→open': 'Status reverted to Open — investigation found no immediate action',
  'investigating→dismissed': 'Status changed to Dismissed — not actionable after investigation',
  'investigating→duplicate': 'Status changed to Duplicate — already reported during investigation',
  'in_progress→resolved': 'Status changed to Resolved — issue has been fixed',
  'in_progress→open': 'Status reverted to Open — work could not be completed',
  'resolved→open': 'Status changed to Open — issue has been reopened (regression)',
  'dismissed→open': 'Status changed to Open — issue has been reopened for reconsideration',
  'duplicate→open': 'Status changed to Open — not actually a duplicate',
}

/**
 * Get a human-readable label for a transition.
 *
 * @param from - Current status
 * @param to - New status
 * @returns Description string, or a generic fallback
 */
export function getTransitionLabel(from: FeedbackStatus, to: FeedbackStatus): string {
  const key = `${from}→${to}`
  return TRANSITION_LABELS[key] ?? `Status changed from ${from} to ${to}`
}

// ──────────────────────────────────────────────────────────────
// Transition Execution
// ──────────────────────────────────────────────────────────────

/**
 * Transition a feedback item to a new status with validation.
 *
 * This is a pure validation + description function. The actual database
 * update is performed by the feedback service, which calls this to
 * validate before persisting.
 *
 * @param feedbackId - ID of the feedback item
 * @param currentStatus - Current status of the feedback
 * @param newStatus - Desired new status
 * @param comment - Optional additional comment for the transition
 * @returns Object with success flag, description, and error if invalid
 */
export function transitionFeedback(
  feedbackId: string,
  currentStatus: FeedbackStatus,
  newStatus: FeedbackStatus,
  comment?: string
): { success: boolean; description: string; error: string | null } {
  // Same status — no-op
  if (currentStatus === newStatus) {
    return {
      success: true,
      description: 'No status change — already in requested state',
      error: null,
    }
  }

  // Validate transition
  if (!isValidTransition(currentStatus, newStatus)) {
    const allowed = getAllowedTransitions(currentStatus)
    log.warn('Invalid status transition attempted', {
      feedbackId,
      from: currentStatus,
      to: newStatus,
      allowed,
    })

    return {
      success: false,
      description: '',
      error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ') || 'none'}`,
    }
  }

  // Build audit trail description
  const label = getTransitionLabel(currentStatus, newStatus)
  const description = comment ? `${label}\n\n${comment}` : label

  log.info('Feedback status transition', {
    feedbackId,
    from: currentStatus,
    to: newStatus,
  })

  return {
    success: true,
    description,
    error: null,
  }
}

// ──────────────────────────────────────────────────────────────
// Status Priority Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Numeric priority for status ordering (lower = more urgent).
 * Used for sorting and UI display order.
 */
export const STATUS_PRIORITY: Record<FeedbackStatus, number> = {
  open: 0,
  investigating: 1,
  in_progress: 2,
  resolved: 3,
  dismissed: 4,
  duplicate: 5,
}

/**
 * Check if a status represents an "active" (unresolved) state.
 */
export function isActiveStatus(status: FeedbackStatus): boolean {
  return status === 'open' || status === 'investigating' || status === 'in_progress'
}

/**
 * Check if a status represents a "terminal" (resolved/closed) state.
 */
export function isTerminalStatus(status: FeedbackStatus): boolean {
  return status === 'resolved' || status === 'dismissed' || status === 'duplicate'
}
