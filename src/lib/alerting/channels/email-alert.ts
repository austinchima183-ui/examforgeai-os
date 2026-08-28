// ============================================================================
// ExamForge AI — Email Alert Channel
// ============================================================================
// Delivers alert incidents via email using the Resend API
// (same provider as the notification system).
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { sendEmail } from '@/lib/notifications/providers/email-resend'
import type { AlertIncident } from '../types'
import { CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_COLORS } from '../types'

const log = createLogger('alerting:email')

// ──────────────────────────────────────────────────────────────
// Send Email Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident via email to one or more recipients.
 * Uses the existing Resend email provider from the notification system.
 *
 * @param to    — Array of recipient email addresses
 * @param alert — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendEmailAlert(
  to: string[],
  alert: AlertIncident
): Promise<boolean> {
  if (to.length === 0) {
    log.warn('No email recipients provided', { incidentId: alert.id })
    return false
  }

  log.info('Sending email alert', { incidentId: alert.id, recipientCount: to.length })

  try {
    const subject = formatEmailSubject(alert)
    const html = formatEmailHtml(alert)
    const text = formatEmailText(alert)

    // Send to all recipients in parallel
    const results = await Promise.allSettled(
      to.map(recipient =>
        sendEmail(
          recipient,
          subject,
          html,
          text,
          'ExamForge AI Alerts <alerts@examforge.ai>'
        )
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - succeeded

    if (failed > 0) {
      log.warn('Some email deliveries failed', {
        incidentId: alert.id,
        succeeded,
        failed,
      })
    }

    log.info('Email alert delivered', { incidentId: alert.id, succeeded, failed })
    return succeeded > 0
  } catch (error) {
    log.error('Email alert delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Email Formatting
// ──────────────────────────────────────────────────────────────

function formatEmailSubject(alert: AlertIncident): string {
  const severity = alert.severity.toUpperCase()
  const icon = CATEGORY_ICONS[alert.category]
  const status = alert.status === 'firing' ? '🚨' : alert.status === 'acknowledged' ? '👀' : '✅'
  return `${status} [${severity}] ${icon} ${alert.title}`
}

function formatEmailHtml(alert: AlertIncident): string {
  const icon = CATEGORY_ICONS[alert.category]
  const categoryLabel = CATEGORY_LABELS[alert.category]
  const color = SEVERITY_COLORS[alert.severity]
  const statusLabel = alert.status.charAt(0).toUpperCase() + alert.status.slice(1)

  const metadataRows = Object.entries(alert.metadata)
    .slice(0, 10)
    .map(([key, value]) => `
      <tr>
        <td style="padding:4px 12px;font-weight:bold;white-space:nowrap">${escapeHtml(key)}</td>
        <td style="padding:4px 12px">${escapeHtml(String(value))}</td>
      </tr>
    `)
    .join('')

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:${color};color:white;padding:16px 24px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:18px">${icon} [${alert.severity.toUpperCase()}] ${escapeHtml(alert.title)}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${escapeHtml(alert.description)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="padding:4px 12px;font-weight:bold">Category</td>
          <td style="padding:4px 12px">${icon} ${escapeHtml(categoryLabel)}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;font-weight:bold">Status</td>
          <td style="padding:4px 12px">${statusLabel}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;font-weight:bold">Severity</td>
          <td style="padding:4px 12px">${alert.severity.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;font-weight:bold">Fired At</td>
          <td style="padding:4px 12px">${formatTime(alert.firedAt)}</td>
        </tr>
        ${metadataRows}
      </table>
      ${alert.acknowledgedBy ? `<p style="margin-top:16px;font-size:12px;color:#6b7280">Acknowledged by ${escapeHtml(alert.acknowledgedBy)} at ${formatTime(alert.acknowledgedAt!)}</p>` : ''}
      <p style="margin-top:16px;font-size:11px;color:#9ca3af">Incident ID: <code>${alert.id}</code> &mdash; ExamForge AI Alerting</p>
    </div>
  </div>`
}

function formatEmailText(alert: AlertIncident): string {
  const icon = CATEGORY_ICONS[alert.category]
  const categoryLabel = CATEGORY_LABELS[alert.category]

  const metadataLines = Object.entries(alert.metadata)
    .slice(0, 10)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n')

  return `[${alert.severity.toUpperCase()}] ${icon} ${alert.title}

${alert.description}

Category: ${categoryLabel}
Status: ${alert.status}
Severity: ${alert.severity.toUpperCase()}
Fired At: ${formatTime(alert.firedAt)}
${metadataLines ? `\nMetadata:\n${metadataLines}` : ''}
${alert.acknowledgedBy ? `Acknowledged by: ${alert.acknowledgedBy} at ${formatTime(alert.acknowledgedAt!)}` : ''}

Incident ID: ${alert.id}
— ExamForge AI Alerting`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch { return iso }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
