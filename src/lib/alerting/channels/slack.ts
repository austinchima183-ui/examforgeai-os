// ============================================================================
// ExamForge AI — Slack Alert Channel
// ============================================================================
// Delivers alert incidents to Slack via Incoming Webhook API.
// Formats rich Slack Block Kit messages with severity colors,
// category icons, metadata fields, and action buttons.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { AlertIncident } from '../types'
import { SEVERITY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../types'

const log = createLogger('alerting:slack')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
  accessories?: unknown
  elements?: unknown[]
}

interface SlackMessage {
  text: string
  blocks: SlackBlock[]
  attachments?: Array<{
    color: string
    blocks: SlackBlock[]
  }>
}

// ──────────────────────────────────────────────────────────────
// Send Slack Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident to Slack via Incoming Webhook.
 *
 * @param webhookUrl — Slack Incoming Webhook URL
 * @param alert     — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendSlackAlert(
  webhookUrl: string,
  alert: AlertIncident
): Promise<boolean> {
  log.info('Sending Slack alert', { incidentId: alert.id, severity: alert.severity })

  try {
    const message = formatSlackMessage(alert)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('Slack webhook failed', undefined, {
        statusCode: response.status,
        error: errorText,
        incidentId: alert.id,
      })
      return false
    }

    log.info('Slack alert delivered', { incidentId: alert.id })
    return true
  } catch (error) {
    log.error('Slack delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Message Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format an alert incident as a rich Slack Block Kit message.
 */
function formatSlackMessage(alert: AlertIncident): SlackMessage {
  const icon = CATEGORY_ICONS[alert.category]
  const categoryLabel = CATEGORY_LABELS[alert.category]
  const severityEmoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
  const statusEmoji = alert.status === 'firing' ? '🔥' : alert.status === 'acknowledged' ? '👀' : '✅'

  const blocks: SlackBlock[] = [
    // Header
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severityEmoji} ${icon} [${alert.severity.toUpperCase()}] ${alert.title}`,
      },
    },

    // Description
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alert.description,
      },
    },

    // Key-value fields
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Category:*\n${categoryLabel}` },
        { type: 'mrkdwn', text: `*Status:*\n${statusEmoji} ${alert.status}` },
        { type: 'mrkdwn', text: `*Severity:*\n${alert.severity}` },
        { type: 'mrkdwn', text: `*Fired At:*\n${formatTime(alert.firedAt)}` },
      ],
    },

    // Divider
    { type: 'divider' },
  ]

  // Add metadata fields if present
  const metadataKeys = Object.keys(alert.metadata)
  if (metadataKeys.length > 0) {
    const metadataFields = metadataKeys.slice(0, 10).map(key => ({
      type: 'mrkdwn' as const,
      text: `*${key}:*\n${String(alert.metadata[key])}`,
    }))

    blocks.push({
      type: 'section',
      fields: metadataFields,
    })
  }

  // Acknowledgement info
  if (alert.acknowledgedBy) {
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Acknowledged by <@${alert.acknowledgedBy}> at ${formatTime(alert.acknowledgedAt!)}` },
      ],
    })
  }

  // Footer
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `Incident ID: \`${alert.id}\` • ExamForge AI Alerting` },
    ],
  })

  return {
    text: `${severityEmoji} [${alert.severity.toUpperCase()}] ${alert.title}`,
    blocks,
    attachments: [
      {
        color: SEVERITY_COLORS[alert.severity],
        blocks,
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
