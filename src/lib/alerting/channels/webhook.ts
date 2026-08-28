// ============================================================================
// ExamForge AI — Generic Webhook Alert Channel
// ============================================================================
// Delivers alert incidents to any HTTP endpoint via signed POST.
// Uses HMAC-SHA256 for secure, verifiable webhook delivery.
// ============================================================================

import { createHmac } from 'crypto'
import { createLogger } from '@/lib/observability/logger'
import type { AlertIncident } from '../types'

const log = createLogger('alerting:webhook')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface WebhookPayload {
  id: string
  incident: AlertIncident
  timestamp: string
  signature: string
}

// ──────────────────────────────────────────────────────────────
// Send Webhook Alert
// ──────────────────────────────────────────────────────────────

/**
 * Send an alert incident to a generic webhook endpoint.
 * The payload is HMAC-SHA256 signed for secure delivery verification.
 *
 * @param url    — Webhook endpoint URL
 * @param secret — HMAC signing secret
 * @param alert  — The alert incident to deliver
 * @returns true if delivered successfully, false otherwise
 */
export async function sendWebhookAlert(
  url: string,
  secret: string,
  alert: AlertIncident
): Promise<boolean> {
  log.info('Sending webhook alert', { incidentId: alert.id, url: url.replace(/\/[^/]*$/, '/***') })

  try {
    const timestamp = new Date().toISOString()
    const payload = formatWebhookPayload(alert, timestamp)
    const body = JSON.stringify(payload)
    const signature = computeHmacSignature(body, secret)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ExamForge-Signature': `sha256=${signature}`,
        'X-ExamForge-Timestamp': timestamp,
        'X-ExamForge-Incident-Id': alert.id,
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('Webhook delivery failed', undefined, {
        statusCode: response.status,
        error: errorText,
        incidentId: alert.id,
        url: url.replace(/\/[^/]*$/, '/***'),
      })
      return false
    }

    log.info('Webhook alert delivered', { incidentId: alert.id })
    return true
  } catch (error) {
    log.error('Webhook delivery exception', error, { incidentId: alert.id })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Payload Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format the webhook payload.
 */
function formatWebhookPayload(alert: AlertIncident, timestamp: string): Omit<WebhookPayload, 'signature'> {
  return {
    id: `wh_${alert.id}_${Date.now()}`,
    incident: alert,
    timestamp,
  }
}

// ──────────────────────────────────────────────────────────────
// HMAC Signature
// ──────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 signature for secure webhook delivery.
 *
 * Recipients can verify the signature by computing:
 *   hmac_sha256(secret, body) === signature
 *
 * @param body   — JSON string of the payload
 * @param secret — Shared secret for signing
 * @returns Hex-encoded HMAC signature
 */
export function computeHmacSignature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Verify an HMAC-SHA256 signature (for incoming webhook validation).
 *
 * @param body      — Raw body string
 * @param secret    — Shared secret
 * @param signature — Signature to verify (with or without 'sha256=' prefix)
 * @returns true if the signature is valid
 */
export function verifyHmacSignature(
  body: string,
  secret: string,
  signature: string
): boolean {
  const expected = computeHmacSignature(body, secret)
  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== provided.length) return false
  let result = 0
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return result === 0
}
