// ============================================================================
// ExamForge AI — SMS Provider Abstraction
// ============================================================================
// Factory pattern for SMS providers with Africa-focused support.
// Supports Twilio, Africa's Talking, and Termii as SMS backends.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { SmsProviderName, DeliveryResult } from '../types'

const log = createLogger('notifications:sms:abstract')

// ──────────────────────────────────────────────────────────────
// SMS Provider Interface
// ──────────────────────────────────────────────────────────────

/**
 * Abstract SMS provider interface.
 * All SMS providers must implement sendSms and verifyDelivery.
 */
export interface SmsProvider {
  /** Provider name. */
  readonly name: SmsProviderName

  /**
   * Send an SMS message.
   *
   * @param to   — Recipient phone number in E.164 format
   * @param body — Message body text
   * @returns DeliveryResult with provider-specific ID
   */
  sendSms(_to: string, _body: string): Promise<DeliveryResult>

  /**
   * Verify delivery status of a previously sent message.
   *
   * @param messageId — Provider-specific message ID
   * @returns DeliveryResult with current status
   */
  verifyDelivery(_messageId: string): Promise<DeliveryResult>
}

// ──────────────────────────────────────────────────────────────
// Africa's Talking Provider
// ──────────────────────────────────────────────────────────────

const AT_BASE_URL = 'https://api.africastalking.com/v1'

/**
 * Africa's Talking SMS provider implementation.
 * Popular in East and West Africa (Kenya, Uganda, Nigeria, Tanzania).
 */
class AfricasTalkingProvider implements SmsProvider {
  readonly name: SmsProviderName = 'africas_talking'
  private readonly username: string
  private readonly apiKey: string
  private readonly sender: string

  constructor() {
    this.username = process.env.AT_USERNAME ?? ''
    this.apiKey = process.env.AT_API_KEY ?? ''
    this.sender = process.env.AT_SENDER_ID ?? 'ExamForge'
  }

  async sendSms(to: string, body: string): Promise<DeliveryResult> {
    if (!this.apiKey) {
      return { success: false, status: 'failed', error: "Africa's Talking API key not configured" }
    }

    try {
      const response = await fetch(`${AT_BASE_URL}/messaging`, {
        method: 'POST',
        headers: {
          'ApiKey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: this.username,
          to,
          message: body,
          from: this.sender,
        }).toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error("Africa's Talking send failed", undefined, { to, statusCode: response.status, error: errorText })
        return { success: false, status: 'failed', error: `AT API error: ${response.status}` }
      }

      const data = (await response.json()) as {
        SMSMessageData: { Message: string; Recipients: Array<{ statusCode: number; messageId: string; status: string }> }
      }

      const recipient = data.SMSMessageData.Recipients?.[0]
      if (!recipient || recipient.statusCode > 200) {
        return { success: false, status: 'failed', error: `AT send error: ${recipient?.status ?? 'unknown'}` }
      }

      log.info("SMS sent via Africa's Talking", { messageId: recipient.messageId, to })

      return {
        success: true,
        status: 'sent',
        providerId: recipient.messageId,
        metadata: { provider: 'africas_talking' },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Africa's Talking error"
      log.error("Africa's Talking exception", error, { to })
      return { success: false, status: 'failed', error: message }
    }
  }

  async verifyDelivery(messageId: string): Promise<DeliveryResult> {
    if (!this.apiKey) {
      return { success: false, status: 'failed', error: "Africa's Talking API key not configured" }
    }

    try {
      const response = await fetch(
        `${AT_BASE_URL}/messaging?username=${this.username}&messageId=${messageId}`,
        {
          method: 'GET',
          headers: {
            'ApiKey': this.apiKey,
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        return { success: false, status: 'failed', error: `AT API error: ${response.status}` }
      }

      const data = (await response.json()) as {
        SMSMessageData: { Recipients: Array<{ status: string }> }
      }

      const recipient = data.SMSMessageData.Recipients?.[0]
      const atStatus = recipient?.status ?? 'Unknown'

      const statusMap: Record<string, DeliveryResult['status']> = {
        Success: 'delivered',
        Sent: 'sent',
        Failed: 'failed',
        Queued: 'pending',
        Unknown: 'pending',
      }

      const status = statusMap[atStatus] ?? 'pending'
      return { success: status === 'delivered' || status === 'sent', status, metadata: { atStatus } }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AT verify error'
      log.error("Africa's Talking verify exception", error, { messageId })
      return { success: false, status: 'failed', error: message }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Termii Provider
// ──────────────────────────────────────────────────────────────

const TERMII_BASE_URL = 'https://api.ng.termii.com/api'

/**
 * Termii SMS provider implementation.
 * Popular in Nigeria and West Africa.
 */
class TermiiProvider implements SmsProvider {
  readonly name: SmsProviderName = 'termii'
  private readonly apiKey: string
  private readonly sender: string

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY ?? ''
    this.sender = process.env.TERMII_SENDER_ID ?? 'ExamForge'
  }

  async sendSms(to: string, body: string): Promise<DeliveryResult> {
    if (!this.apiKey) {
      return { success: false, status: 'failed', error: 'Termii API key not configured' }
    }

    try {
      const response = await fetch(`${TERMII_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to,
          from: this.sender,
          sms: body,
          type: 'plain',
          channel: 'dnd',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error('Termii send failed', undefined, { to, statusCode: response.status, error: errorText })
        return { success: false, status: 'failed', error: `Termii API error: ${response.status}` }
      }

      const data = (await response.json()) as { message_id: string; message: string }

      log.info('SMS sent via Termii', { messageId: data.message_id, to })

      return {
        success: true,
        status: 'sent',
        providerId: data.message_id,
        metadata: { provider: 'termii' },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Termii error'
      log.error('Termii exception', error, { to })
      return { success: false, status: 'failed', error: message }
    }
  }

  async verifyDelivery(messageId: string): Promise<DeliveryResult> {
    if (!this.apiKey) {
      return { success: false, status: 'failed', error: 'Termii API key not configured' }
    }

    try {
      const response = await fetch(`${TERMII_BASE_URL}/sms/inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          message_id: messageId,
        }),
      })

      if (!response.ok) {
        return { success: false, status: 'failed', error: `Termii API error: ${response.status}` }
      }

      // Termii status response
      const data = (await response.json()) as { status: string }
      const statusMap: Record<string, DeliveryResult['status']> = {
        delivered: 'delivered',
        sent: 'sent',
        failed: 'failed',
        pending: 'pending',
      }

      const status = statusMap[data.status] ?? 'pending'
      return { success: status === 'delivered' || status === 'sent', status }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Termii verify error'
      log.error('Termii verify exception', error, { messageId })
      return { success: false, status: 'failed', error: message }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Twilio Wrapper (implements SmsProvider interface)
// ──────────────────────────────────────────────────────────────

/**
 * Twilio provider wrapped as an SmsProvider.
 * Delegates to the existing sms-twilio module.
 */
class TwilioProviderWrapper implements SmsProvider {
  readonly name: SmsProviderName = 'twilio'

  async sendSms(to: string, body: string): Promise<DeliveryResult> {
    const { sendSms } = await import('./sms-twilio')
    return sendSms(to, body)
  }

  async verifyDelivery(messageId: string): Promise<DeliveryResult> {
    const { verifySmsDelivery } = await import('./sms-twilio')
    return verifySmsDelivery(messageId)
  }
}

// ──────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────

/**
 * Create an SMS provider instance by name.
 *
 * @param provider — The SMS provider to instantiate
 * @returns SmsProvider instance
 *
 * @example
 * ```ts
 * const sms = createSmsProvider('twilio')
 * const result = await sms.sendSms('+2348012345678', 'Your code is 123456')
 * ```
 */
export function createSmsProvider(provider: SmsProviderName): SmsProvider {
  switch (provider) {
    case 'twilio':
      return new TwilioProviderWrapper()
    case 'africas_talking':
      return new AfricasTalkingProvider()
    case 'termii':
      return new TermiiProvider()
    default: {
      const exhaustive: never = provider
      log.error('Unknown SMS provider', undefined, { provider: exhaustive as string })
      throw new Error(`Unknown SMS provider: ${exhaustive as string}`)
    }
  }
}
