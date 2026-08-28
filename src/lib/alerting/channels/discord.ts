// ============================================================================
// ExamForge AI — Discord Alert Channel
// ============================================================================
// Delivers alert incidents to Discord via Webhook API.
// Formats Discord embed messages with color coding, fields, and footer.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { AlertIncident } from '../types'
import { SEVERITY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../types'

const log = createLogger('alerting:discord')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: DiscordEmbedField[]
  footer: { text: string }
  timestamp: string
}

interface DiscordMessage {
  content: string
  embeds: DiscordEmbed[]
}

// ──────────────────────────────────────────────────────────────
// Send Discord Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident to Discord via Webhook.
 *
 * @param webhookUrl — Discord Webhook URL
 * @param alert     — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendDiscordAlert(
  webhookUrl: string,
  alert: AlertIncident
): Promise<boolean> {
  log.info('Sending Discord alert', { incidentId: alert.id, severity: alert.severity })

  try {
    const message = formatDiscordMessage(alert)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('Discord webhook failed', undefined, {
        statusCode: response.status,
        error: errorText,
        incidentId: alert.id,
      })
      return false
    }

    // Discord returns 204 No Content on success
    log.info('Discord alert delivered', { incidentId: alert.id })
    return true
  } catch (error) {
    log.error('Discord delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Message Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format an alert incident as a Discord embed message.
 */
function formatDiscordMessage(alert: AlertIncident): DiscordMessage {
  const icon = CATEGORY_ICONS[alert.category]
  const categoryLabel = CATEGORY_LABELS[alert.category]
  const severityEmoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
  const statusEmoji = alert.status === 'firing' ? '🔥' : alert.status === 'acknowledged' ? '👀' : '✅'

  // Convert hex color to decimal for Discord
  const colorHex = SEVERITY_COLORS[alert.severity].replace('#', '')
  const colorDecimal = parseInt(colorHex, 16)

  const fields: DiscordEmbedField[] = [
    { name: 'Category', value: `${icon} ${categoryLabel}`, inline: true },
    { name: 'Status', value: `${statusEmoji} ${alert.status}`, inline: true },
    { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
    { name: 'Fired At', value: formatTime(alert.firedAt), inline: false },
  ]

  // Add metadata fields (up to Discord's limit of 25 fields total)
  const metadataKeys = Object.keys(alert.metadata)
  for (const key of metadataKeys.slice(0, 21)) {
    fields.push({
      name: key,
      value: String(alert.metadata[key]),
      inline: true,
    })
  }

  if (alert.acknowledgedBy) {
    fields.push({
      name: 'Acknowledged By',
      value: alert.acknowledgedBy,
      inline: true,
    })
  }

  return {
    content: `${severityEmoji} **[${alert.severity.toUpperCase()}]** ${alert.title}`,
    embeds: [
      {
        title: `${icon} ${alert.title}`,
        description: alert.description,
        color: colorDecimal,
        fields,
        footer: {
          text: `Incident ID: ${alert.id} • ExamForge AI Alerting`,
        },
        timestamp: alert.firedAt,
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
