// ============================================================================
// ExamForge AI — SMS Alert Channel
// ============================================================================
// Delivers alert incidents via SMS using the Twilio API
// (same provider as the notification system).
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { sendSms } from '@/lib/notifications/providers/sms-twilio'
import type { AlertIncident } from '../types'
import { CATEGORY_LABELS } from '../types'

const log = createLogger('alerting:sms')

// ──────────────────────────────────────────────────────────────
// Send SMS Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident via SMS to one or more recipients.
 * Uses the existing Twilio SMS provider from the notification system.
 *
 * @param to    — Array of recipient phone numbers in E.164 format
 * @param alert — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendSmsAlert(
  to: string[],
  alert: AlertIncident
): Promise<boolean> {
  if (to.length === 0) {
    log.warn('No SMS recipients provided', { incidentId: alert.id })
    return false
  }

  log.info('Sending SMS alert', { incidentId: alert.id, recipientCount: to.length })

  try {
    const body = formatSmsBody(alert)

    // Send to all recipients in parallel
    const results = await Promise.allSettled(
      to.map(recipient => sendSms(recipient, body))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - succeeded

    if (failed > 0) {
      log.warn('Some SMS deliveries failed', {
        incidentId: alert.id,
        succeeded,
        failed,
      })
    }

    log.info('SMS alert delivered', { incidentId: alert.id, succeeded, failed })
    return succeeded > 0
  } catch (error) {
    log.error('SMS alert delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// SMS Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format an alert incident as an SMS body.
 * Keeps messages concise for SMS character limits.
 */
function formatSmsBody(alert: AlertIncident): string {
  const severity = alert.severity.toUpperCase()
  const category = CATEGORY_LABELS[alert.category]
  const statusIcon = alert.status === 'firing' ? '🚨' : alert.status === 'acknowledged' ? '👀' : '✅'
  const shortDesc = alert.description.length > 100
    ? alert.description.slice(0, 97) + '...'
    : alert.description

  return `${statusIcon} [${severity}] ${alert.title}

${shortDesc}

Category: ${category}
Status: ${alert.status}
Fired: ${formatTime(alert.firedAt)}
ID: ${alert.id}

— ExamForge AI`
}

/**
 * Format an ISO-8601 timestamp for SMS display.
 */
function formatTime(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
