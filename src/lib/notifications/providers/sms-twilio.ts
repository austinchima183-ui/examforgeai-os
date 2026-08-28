// ============================================================================
// ExamForge AI — Twilio SMS Provider
// ============================================================================
// Sends SMS via the Twilio API using fetch. Includes delivery verification.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { DeliveryResult } from '../types'

const log = createLogger('notifications:sms:twilio')

// ──────────────────────────────────────────────────────────────
// Environment
// ──────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? ''

const TWILIO_BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface TwilioMessageResponse {
  sid: string
  status: string
  error_code?: number | null
  error_message?: string | null
}

// ──────────────────────────────────────────────────────────────
// Send SMS
// ──────────────────────────────────────────────────────────────

/**
 * Send an SMS message via the Twilio API.
 *
 * @param to   — Recipient phone number in E.164 format (e.g. '+2348012345678')
 * @param body — SMS body text (max 1600 characters per Twilio limits)
 * @returns DeliveryResult with Twilio message SID on success
 */
export async function sendSms(
  to: string,
  body: string
): Promise<DeliveryResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    log.error('Twilio credentials not configured', {
      hasSid: !!TWILIO_ACCOUNT_SID,
      hasToken: !!TWILIO_AUTH_TOKEN,
      hasPhone: !!TWILIO_PHONE_NUMBER,
    })
    return { success: false, status: 'failed', error: 'Twilio credentials not configured' }
  }

  try {
    // Truncate body to Twilio's 1600 character limit
    const truncatedBody = body.length > 1600 ? body.slice(0, 1597) + '...' : body

    const params = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: truncatedBody,
    })

    const response = await fetch(`${TWILIO_BASE_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('Twilio send failed', undefined, {
        to,
        statusCode: response.status,
        twilioError: errorText,
      })
      return { success: false, status: 'failed', error: `Twilio API error: ${response.status}` }
    }

    const data = (await response.json()) as TwilioMessageResponse

    // Twilio can return a 200 with a queued/failed status
    if (data.status === 'failed' || data.status === 'undelivered') {
      log.error('Twilio message failed', undefined, {
        sid: data.sid,
        errorCode: data.error_code,
        errorMessage: data.error_message,
      })
      return {
        success: false,
        status: 'failed',
        providerId: data.sid,
        error: data.error_message ?? `Twilio status: ${data.status}`,
        metadata: { errorCode: data.error_code },
      }
    }

    log.info('SMS sent via Twilio', { sid: data.sid, to, status: data.status })

    return {
      success: true,
      status: 'sent',
      providerId: data.sid,
      metadata: { provider: 'twilio', twilioStatus: data.status },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Twilio error'
    log.error('Twilio fetch exception', error, { to })
    return { success: false, status: 'failed', error: message }
  }
}

// ──────────────────────────────────────────────────────────────
// Verify SMS Delivery
// ──────────────────────────────────────────────────────────────

/**
 * Check the delivery status of a previously sent SMS.
 *
 * @param messageSid — The Twilio message SID returned from sendSms
 * @returns DeliveryResult with current delivery status
 */
export async function verifySmsDelivery(messageSid: string): Promise<DeliveryResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { success: false, status: 'failed', error: 'Twilio credentials not configured' }
  }

  try {
    const response = await fetch(`${TWILIO_BASE_URL}/Messages/${messageSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
    })

    if (!response.ok) {
      log.warn('Twilio verify failed', { messageSid, statusCode: response.status })
      return { success: false, status: 'failed', error: `Twilio API error: ${response.status}` }
    }

    const data = (await response.json()) as TwilioMessageResponse

    // Map Twilio status to our DeliveryStatus
    const statusMap: Record<string, DeliveryResult['status']> = {
      queued: 'pending',
      sending: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
      receiving: 'pending',
      received: 'delivered',
    }

    const status = statusMap[data.status] ?? 'pending'
    const success = status === 'delivered' || status === 'sent'

    log.info('Twilio delivery status', { messageSid, twilioStatus: data.status, mappedStatus: status })

    return {
      success,
      status,
      providerId: data.sid,
      metadata: { twilioStatus: data.status, errorCode: data.error_code },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Twilio verify error'
    log.error('Twilio verify exception', error, { messageSid })
    return { success: false, status: 'failed', error: message }
  }
}
