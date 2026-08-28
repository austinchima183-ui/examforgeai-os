// ============================================================================
// ExamForge AI — Resend Email Provider
// ============================================================================
// Sends email via the Resend API (https://resend.com) using fetch.
// No SDK dependency — minimises bundle size and supply-chain risk.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { DeliveryResult } from '../types'

const log = createLogger('notifications:email:resend')

// ──────────────────────────────────────────────────────────────
// Environment
// ──────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const RESEND_BASE_URL = 'https://api.resend.com'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ResendEmailResponse {
  id: string
}

interface ResendEmailError {
  name: string
  message: string
  statusCode?: number
}

// ──────────────────────────────────────────────────────────────
// Send Email
// ──────────────────────────────────────────────────────────────

/**
 * Send an email via the Resend API.
 *
 * @param to      — Recipient email address
 * @param subject — Email subject line
 * @param html    — HTML body
 * @param text    — Plain-text body (fallback)
 * @param from    — Sender address (defaults to ExamForge noreply)
 * @returns DeliveryResult with the Resend email ID on success
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  from: string = 'ExamForge AI <noreply@examforge.ai>'
): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    log.error('RESEND_API_KEY is not configured')
    return { success: false, status: 'failed', error: 'Resend API key not configured' }
  }

  try {
    const response = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorBody = (await response.json()) as ResendEmailError
      const errorMessage = errorBody.message || `Resend API error: ${response.status}`
      log.error('Resend send failed', undefined, {
        to,
        subject,
        statusCode: response.status,
        resendError: errorMessage,
      })

      // Map HTTP status to delivery status
      const status = response.status === 422 ? 'bounced' : 'failed'
      return { success: false, status, error: errorMessage }
    }

    const data = (await response.json()) as ResendEmailResponse
    log.info('Email sent via Resend', { emailId: data.id, to })

    return {
      success: true,
      status: 'sent',
      providerId: data.id,
      metadata: { provider: 'resend' },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Resend error'
    log.error('Resend fetch exception', error, { to, subject })
    return { success: false, status: 'failed', error: message }
  }
}

// ──────────────────────────────────────────────────────────────
// Verify Email Delivery
// ──────────────────────────────────────────────────────────────

/**
 * Check the delivery status of a previously sent email.
 * Uses the Resend API to retrieve email status.
 *
 * @param emailId — The Resend email ID returned from sendEmail
 * @returns DeliveryResult with current delivery status
 */
export async function verifyEmailDelivery(emailId: string): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    return { success: false, status: 'failed', error: 'Resend API key not configured' }
  }

  try {
    const response = await fetch(`${RESEND_BASE_URL}/emails/${emailId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = (await response.json()) as ResendEmailError
      log.warn('Resend verify failed', { emailId, statusCode: response.status, error: errorBody.message })
      return { success: false, status: 'failed', error: errorBody.message }
    }

    const data = (await response.json()) as {
      id: string
      status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained'
    }

    // Map Resend status to our DeliveryStatus
    const statusMap: Record<string, DeliveryResult['status']> = {
      queued: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      bounced: 'bounced',
      complained: 'bounced',
    }

    const status = statusMap[data.status] ?? 'pending'
    const success = status === 'delivered' || status === 'sent'

    log.info('Resend delivery status', { emailId, resendStatus: data.status, mappedStatus: status })

    return {
      success,
      status,
      providerId: data.id,
      metadata: { resendStatus: data.status },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Resend verify error'
    log.error('Resend verify exception', error, { emailId })
    return { success: false, status: 'failed', error: message }
  }
}
