// ============================================================================
// ExamForge AI — Microsoft Teams Alert Channel
// ============================================================================
// Delivers alert incidents to Microsoft Teams via Workflows/Incoming Webhook.
// Formats Adaptive Card JSON for rich Teams messages.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { AlertIncident } from '../types'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../types'

const log = createLogger('alerting:teams')

// ──────────────────────────────────────────────────────────────
// Send Teams Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident to Microsoft Teams via Incoming Webhook.
 * Uses Adaptive Card format for rich message rendering.
 *
 * @param webhookUrl — Teams Incoming Webhook URL
 * @param alert     — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendTeamsAlert(
  webhookUrl: string,
  alert: AlertIncident
): Promise<boolean> {
  log.info('Sending Teams alert', { incidentId: alert.id, severity: alert.severity })

  try {
    const card = formatAdaptiveCard(alert)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('Teams webhook failed', undefined, {
        statusCode: response.status,
        error: errorText,
        incidentId: alert.id,
      })
      return false
    }

    log.info('Teams alert delivered', { incidentId: alert.id })
    return true
  } catch (error) {
    log.error('Teams delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Adaptive Card Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format an alert incident as a Microsoft Teams Adaptive Card.
 */
function formatAdaptiveCard(alert: AlertIncident): Record<string, unknown> {
  const icon = CATEGORY_ICONS[alert.category]
  const categoryLabel = CATEGORY_LABELS[alert.category]
  const severityEmoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
  const statusEmoji = alert.status === 'firing' ? '🔥' : alert.status === 'acknowledged' ? '👀' : '✅'

  const facts: Array<{ title: string; value: string }> = [
    { title: 'Category', value: `${icon} ${categoryLabel}` },
    { title: 'Status', value: `${statusEmoji} ${alert.status}` },
    { title: 'Severity', value: alert.severity.toUpperCase() },
    { title: 'Fired At', value: formatTime(alert.firedAt) },
  ]

  // Add metadata facts
  const metadataKeys = Object.keys(alert.metadata)
  for (const key of metadataKeys.slice(0, 10)) {
    facts.push({ title: key, value: String(alert.metadata[key]) })
  }

  if (alert.acknowledgedBy) {
    facts.push({ title: 'Acknowledged By', value: alert.acknowledgedBy })
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            // Header with severity color accent
            {
              type: 'Container',
              style: alert.severity === 'critical' ? 'attention' : alert.severity === 'warning' ? 'warning' : 'default',
              items: [
                {
                  type: 'TextBlock',
                  text: `${severityEmoji} ${icon} [${alert.severity.toUpperCase()}] ${alert.title}`,
                  weight: 'Bolder',
                  size: 'Large',
                  wrap: true,
                  color: alert.severity === 'critical' ? 'attention' : 'default',
                },
              ],
              bleed: true,
            },
            // Description
            {
              type: 'TextBlock',
              text: alert.description,
              wrap: true,
              spacing: 'Medium',
            },
            // Divider
            {
              type: 'FactSet',
              facts,
              spacing: 'Medium',
            },
            // Footer
            {
              type: 'TextBlock',
              text: `Incident ID: \`${alert.id}\` • ExamForge AI Alerting`,
              size: 'Small',
              color: 'Secondary',
              spacing: 'Medium',
              isSubtle: true,
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
      },
    ],
  }
}

/**
 * Format an ISO-8601 timestamp for display.
 */
function formatTime(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return iso
  }
}
