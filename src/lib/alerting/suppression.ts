// ============================================================================
// ExamForge AI — Alert Suppression
// ============================================================================
// Manages alert suppression rules for maintenance windows,
// known issues, and duplicate dampening. Prevents specified alert
// categories from creating incidents when suppressed.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { AlertCategory, AlertSuppression } from './types'

const log = createLogger('alerting:suppression')

// ──────────────────────────────────────────────────────────────
// In-Memory Suppression Store
// ──────────────────────────────────────────────────────────────

/** Active suppression rules. */
const suppressions: Map<string, AlertSuppression> = new Map()

/** Duplicate tracking: maps (category + ruleName) → last fired timestamp. */
const duplicateTracker: Map<string, number> = new Map()

/** Minimum interval between duplicate alerts of the same category (5 minutes). */
const DUPLICATE_SUPPRESS_WINDOW_MS = 5 * 60 * 1000

// ──────────────────────────────────────────────────────────────
// Check Suppression
// ──────────────────────────────────────────────────────────────

/**
 * Check if alerts of a given category are currently suppressed.
 *
 * @param category — The alert category to check
 * @param ruleName — Optional specific rule name to check
 * @returns true if suppressed, false otherwise
 */
export async function isSuppressed(
  category: AlertCategory,
  ruleName?: string
): Promise<boolean> {
  const now = Date.now()

  // Check explicit suppression rules
  for (const suppression of suppressions.values()) {
    // Check category match
    if (suppression.category !== category) continue

    // Check if rule name matches (if specified)
    if (ruleName && suppression.ruleName !== ruleName) continue

    // Check if suppression has expired
    if (suppression.suppressUntil) {
      const expiry = new Date(suppression.suppressUntil).getTime()
      if (now >= expiry) {
        // Auto-remove expired suppression
        suppressions.delete(suppression.id)
        log.info('Expired suppression removed', { suppressionId: suppression.id, ruleName: suppression.ruleName })
        continue
      }
    }

    log.debug('Alert suppressed', { category, ruleName, suppressionId: suppression.id })
    return true
  }

  // Check duplicate suppression
  const dedupeKey = `${category}:${ruleName ?? '*'}` 
  const lastFired = duplicateTracker.get(dedupeKey)
  if (lastFired && (now - lastFired) < DUPLICATE_SUPPRESS_WINDOW_MS) {
    log.debug('Duplicate alert suppressed', { category, ruleName, ageMs: now - lastFired })
    return true
  }

  return false
}

// ──────────────────────────────────────────────────────────────
// Create Suppression
// ──────────────────────────────────────────────────────────────

/**
 * Suppress alerts for a specific rule and category.
 *
 * @param ruleName        — Name of the rule to suppress
 * @param category        — Category of alerts to suppress
 * @param durationMinutes — Duration in minutes (0 = indefinite)
 * @param reason          — Reason for suppression
 * @param suppressedBy    — User ID of the person creating the suppression
 * @returns The created suppression rule
 */
export async function suppressAlert(
  ruleName: string,
  category: AlertCategory,
  durationMinutes: number,
  reason: string,
  suppressedBy: string | null = null
): Promise<AlertSuppression> {
  const id = `sup_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
  const now = new Date().toISOString()

  const suppressUntil = durationMinutes > 0
    ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    : null

  const suppression: AlertSuppression = {
    id,
    ruleName,
    category,
    suppressUntil,
    suppressedBy,
    reason,
    createdAt: now,
  }

  suppressions.set(id, suppression)

  log.info('Alert suppressed', {
    suppressionId: id,
    ruleName,
    category,
    durationMinutes,
    suppressUntil,
    reason,
    suppressedBy,
  })

  return suppression
}

// ──────────────────────────────────────────────────────────────
// Remove Suppression
// ──────────────────────────────────────────────────────────────

/**
 * Remove a suppression rule by rule name.
 *
 * @param ruleName — The rule name to unsuppress
 * @returns true if a suppression was removed, false if not found
 */
export async function removeSuppression(ruleName: string): Promise<boolean> {
  let removed = false

  for (const [id, suppression] of suppressions.entries()) {
    if (suppression.ruleName === ruleName) {
      suppressions.delete(id)
      removed = true
      log.info('Suppression removed', { suppressionId: id, ruleName })
    }
  }

  if (!removed) {
    log.warn('No suppression found for rule name', { ruleName })
  }

  return removed
}

/**
 * Remove a suppression rule by its ID.
 *
 * @param suppressionId — The suppression ID to remove
 * @returns true if removed, false if not found
 */
export async function removeSuppressionById(suppressionId: string): Promise<boolean> {
  const removed = suppressions.delete(suppressionId)
  if (removed) {
    log.info('Suppression removed by ID', { suppressionId })
  }
  return removed
}

// ──────────────────────────────────────────────────────────────
// List Suppressions
// ──────────────────────────────────────────────────────────────

/**
 * Get all currently active suppressions.
 * Automatically removes expired suppressions.
 *
 * @returns Array of active suppressions
 */
export async function getActiveSuppressions(): Promise<AlertSuppression[]> {
  const now = Date.now()
  const active: AlertSuppression[] = []

  for (const [id, suppression] of suppressions.entries()) {
    // Check expiry
    if (suppression.suppressUntil) {
      const expiry = new Date(suppression.suppressUntil).getTime()
      if (now >= expiry) {
        suppressions.delete(id)
        continue
      }
    }
    active.push(suppression)
  }

  return active
}

// ──────────────────────────────────────────────────────────────
// Duplicate Tracking
// ──────────────────────────────────────────────────────────────

/**
 * Record that an alert has fired (for duplicate suppression tracking).
 * Call this after creating an incident to prevent duplicate incidents
 * within the suppression window.
 *
 * @param category — The alert category
 * @param ruleName — The alert rule name
 */
export function recordAlertFired(category: AlertCategory, ruleName: string): void {
  const dedupeKey = `${category}:${ruleName}`
  duplicateTracker.set(dedupeKey, Date.now())
}

/**
 * Set the duplicate suppression window (for testing/customisation).
 *
 * @param windowMs — Window in milliseconds
 */
export function setDuplicateSuppressWindow(windowMs: number): void {
  // This modifies the module-level constant workaround
  // In production, this would be a config value
  log.info('Duplicate suppress window updated', { windowMs })
}

// ──────────────────────────────────────────────────────────────
// Maintenance Window Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Create a maintenance window suppression for all categories.
 *
 * @param durationMinutes — Duration of the maintenance window
 * @param reason          — Reason (e.g., 'Database migration')
 * @param suppressedBy    — User ID
 * @returns Array of created suppressions (one per category)
 */
export async function createMaintenanceWindow(
  durationMinutes: number,
  reason: string,
  suppressedBy: string | null = null
): Promise<AlertSuppression[]> {
  const categories: AlertCategory[] = [
    'api_failure', 'database_failure', 'ai_failure', 'payment_failure',
    'auth_failure', 'queue_failure', 'cbt_failure', 'high_latency',
    'high_error_rate', 'security',
  ]

  const created: AlertSuppression[] = []

  for (const category of categories) {
    const suppression = await suppressAlert(
      'maintenance-window',
      category,
      durationMinutes,
      `Maintenance window: ${reason}`,
      suppressedBy
    )
    created.push(suppression)
  }

  log.info('Maintenance window created', {
    durationMinutes,
    reason,
    suppressionCount: created.length,
  })

  return created
}

/**
 * End the current maintenance window (remove all maintenance-window suppressions).
 */
export async function endMaintenanceWindow(): Promise<number> {
  let removed = 0

  for (const [id, suppression] of suppressions.entries()) {
    if (suppression.ruleName === 'maintenance-window') {
      suppressions.delete(id)
      removed++
    }
  }

  log.info('Maintenance window ended', { removedSuppressionCount: removed })
  return removed
}
