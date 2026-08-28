// ============================================================================
// ExamForge AI — Alert Recovery Detector
// ============================================================================
// Checks whether the underlying condition for an active incident
// has resolved, enabling automatic incident resolution.
// Maps alert categories to health checks and metrics for verification.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import {
  MetricNames,
  getMetricSummary,
  getErrorRate,
  getMetricRate,
} from '@/lib/observability/metrics'
import type { AlertIncident, AlertCategory } from './types'

const log = createLogger('alerting:recovery-detector')

// ──────────────────────────────────────────────────────────────
// Recovery Check
// ──────────────────────────────────────────────────────────────

/**
 * Check whether the underlying condition for an incident has recovered.
 *
 * Maps the incident category to the appropriate health check or metric
 * and verifies that the condition is no longer present.
 *
 * @param incident — The incident to check for recovery
 * @returns true if the condition has recovered, false otherwise
 */
export async function checkRecovery(incident: AlertIncident): Promise<boolean> {
  try {
    const recovered = await checkCategoryRecovery(incident.category, incident.metadata)

    if (recovered) {
      log.info('Recovery detected', {
        incidentId: incident.id,
        category: incident.category,
      })
    }

    return recovered
  } catch (error) {
    log.error('Recovery check failed', error, {
      incidentId: incident.id,
      category: incident.category,
    })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Process Recoveries
// ──────────────────────────────────────────────────────────────

/**
 * Check all active incidents for recovery and auto-resolve them.
 * Typically called on a periodic basis (e.g., every minute).
 */
export async function processRecoveries(): Promise<void> {
  const { getActiveIncidents, autoResolveIncident } = await import('./incident-manager')

  const activeIncidents = await getActiveIncidents()

  if (activeIncidents.length === 0) {
    return
  }

  log.info('Processing recoveries', { activeIncidentCount: activeIncidents.length })

  let recovered = 0

  for (const incident of activeIncidents) {
    // Only check firing incidents (acknowledged ones require manual resolution)
    if (incident.status !== 'firing') continue

    // Don't check incidents that are very recent (< 2 minutes old)
    const ageMs = Date.now() - new Date(incident.firedAt).getTime()
    if (ageMs < 2 * 60 * 1000) continue

    const isRecovered = await checkRecovery(incident)
    if (isRecovered) {
      const result = await autoResolveIncident(incident.id)
      if (!result.error) {
        recovered++
      }
    }
  }

  if (recovered > 0) {
    log.info('Recoveries processed', { recovered, checked: activeIncidents.length })
  }
}

// ──────────────────────────────────────────────────────────────
// Category-Specific Recovery Checks
// ──────────────────────────────────────────────────────────────

/**
 * Check if a specific alert category has recovered.
 * Each category maps to a different metric or health check.
 */
async function checkCategoryRecovery(
  category: AlertCategory,
  metadata: Record<string, unknown>
): Promise<boolean> {
  switch (category) {
    case 'api_failure':
      return checkApiRecovery()

    case 'database_failure':
      return checkDatabaseRecovery()

    case 'ai_failure':
      return checkAiRecovery()

    case 'payment_failure':
      return checkPaymentRecovery()

    case 'auth_failure':
      return checkAuthRecovery()

    case 'queue_failure':
      return checkQueueRecovery()

    case 'cbt_failure':
      return checkCbtRecovery()

    case 'high_latency':
      return checkLatencyRecovery(metadata)

    case 'high_error_rate':
      return checkErrorRateRecovery()

    case 'security':
      // Security incidents should NEVER auto-resolve
      return false

    default:
      return false
  }
}

/** Check API error rate recovery (< 2% = recovered). */
function checkApiRecovery(): boolean {
  const errorRate = getErrorRate(MetricNames.API_ERROR, MetricNames.API_LATENCY, 5)
  return errorRate < 2
}

/** Check database latency recovery (p95 < 300ms = recovered). */
function checkDatabaseRecovery(): boolean {
  const summary = getMetricSummary()
  const dbSummary = summary.find(s => s.name === MetricNames.DB_LATENCY)
  if (!dbSummary) return true // No data = assume recovered
  return dbSummary.p95 < 300
}

/** Check AI provider failure recovery (< 3% = recovered). */
function checkAiRecovery(): boolean {
  const errorRate = getErrorRate(MetricNames.AI_ERROR, MetricNames.AI_LATENCY, 5)
  return errorRate < 3
}

/** Check payment failure recovery (no recent payment failures). */
function checkPaymentRecovery(): boolean {
  // Payment failures are transient — if no failures in the last 5 minutes, recovered
  const failureRate = getMetricRate('payment.failure', 5)
  return failureRate < 1
}

/** Check auth failure recovery (< 5/min = recovered). */
function checkAuthRecovery(): boolean {
  const authRate = getMetricRate(MetricNames.AUTH_FAILURE, 5)
  return authRate < 5
}

/** Check queue/job failure recovery (< 5% = recovered). */
function checkQueueRecovery(): boolean {
  const jobErrorRate = getErrorRate(MetricNames.JOB_FAILURE, MetricNames.JOB_SUCCESS, 5)
  return jobErrorRate < 5
}

/** Check CBT system recovery (no recent CBT errors). */
function checkCbtRecovery(): boolean {
  const cbtErrorRate = getMetricRate('cbt.error', 5)
  return cbtErrorRate < 1
}

/** Check high latency recovery (API p95 < 1500ms and DB p95 < 400ms). */
function checkLatencyRecovery(_metadata: Record<string, unknown>): boolean {
  const summary = getMetricSummary()

  const apiSummary = summary.find(s => s.name === MetricNames.API_LATENCY)
  const dbSummary = summary.find(s => s.name === MetricNames.DB_LATENCY)

  const apiRecovered = !apiSummary || apiSummary.p95 < 1500
  const dbRecovered = !dbSummary || dbSummary.p95 < 400

  return apiRecovered && dbRecovered
}

/** Check error rate recovery (overall < 2%). */
function checkErrorRateRecovery(): boolean {
  const errorRate = getErrorRate(MetricNames.API_ERROR, MetricNames.API_LATENCY, 5)
  return errorRate < 2
}
