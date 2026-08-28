// ============================================================================
// ExamForge AI — Alert Bridge
// ============================================================================
// Bridges the existing observability/alerts.ts system to the new
// alerting platform. Processes results from checkAlerts() and creates
// incidents for active alerts, while syncing state bidirectionally.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { checkAlerts, getActiveAlerts } from '@/lib/observability/alerts'
import type { AlertCategory, AlertChannelConfig } from './types'
import { RULE_CATEGORY_MAP } from './types'
import { createIncident, getActiveIncidents } from './incident-manager'
import { deliverAlert } from './delivery-engine'
import { isSuppressed, recordAlertFired } from './suppression'
import { evaluateEscalation, getPolicyForCategory } from './escalation'
import { addTimelineEvent } from './incident-manager'

const log = createLogger('alerting:bridge')

// ──────────────────────────────────────────────────────────────
// Track Known Incidents
// ──────────────────────────────────────────────────────────────

/** Maps alert rule IDs to their incident IDs for deduplication. */
const alertToIncidentMap: Map<string, string> = new Map()

// ──────────────────────────────────────────────────────────────
// Process Existing Alerts
// ──────────────────────────────────────────────────────────────

/**
 * Process the results of checkAlerts() and create incidents for
 * any newly active alerts. This is the main entry point for
 * bridging the existing alert system to the new incident manager.
 *
 * Call this after checkAlerts() in your monitoring loop.
 *
 * @param channelConfigs — Alert channel configurations for delivery
 * @returns Number of new incidents created
 */
export async function processExistingAlerts(
  channelConfigs: AlertChannelConfig[] = []
): Promise<number> {
  const activeAlerts = getActiveAlerts()
  let created = 0

  log.info('Processing existing alerts', { activeAlertCount: activeAlerts.length })

  for (const alert of activeAlerts) {
    try {
      // Check if an incident already exists for this alert
      const existingIncidentId = alertToIncidentMap.get(alert.id)
      if (existingIncidentId) {
        log.debug('Alert already has active incident', { alertId: alert.id, incidentId: existingIncidentId })
        continue
      }

      // Check if the alert category is suppressed
      const category: AlertCategory = RULE_CATEGORY_MAP[alert.id] ?? 'api_failure'
      const suppressed = await isSuppressed(category, alert.id)
      if (suppressed) {
        log.info('Alert suppressed, skipping incident creation', { alertId: alert.id, category })
        continue
      }

      // Create incident from the alert rule
      const incident = await createIncident(alert)
      alertToIncidentMap.set(alert.id, incident.id)

      // Record for duplicate suppression
      recordAlertFired(category, alert.id)

      // Deliver the alert to configured channels
      if (channelConfigs.length > 0) {
        const deliveryResult = await deliverAlert(incident, channelConfigs)

        // Record delivery in timeline
        for (const attempt of deliveryResult.attempts) {
          await addTimelineEvent(incident.id, {
            timestamp: attempt.timestamp,
            type: attempt.success ? 'notification_sent' : 'notification_failed',
            actor: attempt.channel,
            details: attempt.success
              ? `Notification sent via ${attempt.channel}`
              : `Notification failed via ${attempt.channel}: ${attempt.error ?? 'Unknown error'}`,
            metadata: {
              channel: attempt.channel,
              success: attempt.success,
              error: attempt.error,
            },
          })
        }
      }

      // Evaluate and execute initial escalation
      const policy = getPolicyForCategory(category)
      const escalationAction = evaluateEscalation(incident, policy)
      if (escalationAction) {
        await addTimelineEvent(incident.id, {
          timestamp: new Date().toISOString(),
          type: 'escalated',
          actor: 'system',
          details: `Initial escalation: ${escalationAction.reason}`,
          metadata: { level: escalationAction.level, channels: escalationAction.channels },
        })
      }

      created++
    } catch (error) {
      log.error('Failed to process alert', error, { alertId: alert.id })
    }
  }

  log.info('Alert processing complete', { activeAlerts: activeAlerts.length, newIncidents: created })

  return created
}

// ──────────────────────────────────────────────────────────────
// Sync Alert State
// ──────────────────────────────────────────────────────────────

/**
 * Synchronize the existing alert state with the incident manager.
 * - Resolves incidents for alerts that are no longer active
 * - Updates the alert-to-incident mapping
 */
export async function syncAlertState(): Promise<void> {
  const alertResult = checkAlerts()
  const activeAlertIds = new Set(
    alertResult.alerts.filter(a => a.active).map(a => a.id)
  )

  const activeIncidents = await getActiveIncidents()

  for (const incident of activeIncidents) {
    const alertId = incident.metadata.alertId as string | undefined
    if (!alertId) continue

    // If the underlying alert is no longer active, check for auto-resolution
    if (!activeAlertIds.has(alertId)) {
      log.info('Alert no longer active, checking for auto-resolution', {
        incidentId: incident.id,
        alertId,
      })

      try {
        const { checkRecovery } = await import('./recovery-detector')
        const recovered = await checkRecovery(incident)

        if (recovered) {
          const { autoResolveIncident } = await import('./incident-manager')
          await autoResolveIncident(incident.id)

          // Remove from mapping
          for (const [key, value] of alertToIncidentMap.entries()) {
            if (value === incident.id) {
              alertToIncidentMap.delete(key)
            }
          }
        }
      } catch (error) {
        log.error('Auto-resolution check failed', error, { incidentId: incident.id })
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Full Monitoring Cycle
// ──────────────────────────────────────────────────────────────

/**
 * Run a complete monitoring cycle:
 * 1. Process existing alerts → create incidents
 * 2. Sync state → auto-resolve recovered incidents
 * 3. Evaluate escalation for active incidents
 *
 * @param channelConfigs — Alert channel configurations
 * @returns Summary of the cycle
 */
export async function runMonitoringCycle(
  channelConfigs: AlertChannelConfig[] = []
): Promise<{
  newIncidents: number
  resolvedIncidents: number
  activeIncidents: number
}> {
  const newIncidents = await processExistingAlerts(channelConfigs)

  // Count active incidents before sync
  const beforeSync = await getActiveIncidents()
  const beforeCount = beforeSync.length

  await syncAlertState()

  // Count active incidents after sync
  const afterSync = await getActiveIncidents()
  const afterCount = afterSync.length

  const resolvedIncidents = beforeCount - afterCount

  // Process escalations for remaining active incidents
  for (const incident of afterSync) {
    if (incident.status !== 'firing') continue

    const category = incident.category
    const policy = getPolicyForCategory(category)
    const escalationAction = evaluateEscalation(incident, policy)

    if (escalationAction) {
      const { executeEscalation } = await import('./escalation')
      await executeEscalation(incident.id, escalationAction.level)

      // Deliver escalation notifications
      if (channelConfigs.length > 0) {
        const escalationChannels = channelConfigs.filter(c =>
          escalationAction.channels.includes(c.channel)
        )
        await deliverAlert(incident, escalationChannels)
      }
    }
  }

  return {
    newIncidents,
    resolvedIncidents,
    activeIncidents: afterCount,
  }
}

// ──────────────────────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────────────────────

/**
 * Get the current alert-to-incident mapping (for debugging).
 */
export function getAlertIncidentMap(): Record<string, string> {
  return Object.fromEntries(alertToIncidentMap)
}

/**
 * Check if an alert rule currently has an active incident.
 */
export function alertHasIncident(alertId: string): boolean {
  return alertToIncidentMap.has(alertId)
}
