// ============================================================================
// ExamForge AI — Alert Delivery Engine
// ============================================================================
// Orchestrates multi-channel alert delivery. Dispatches alerts to all
// configured channels in parallel, tracks delivery attempts and failures,
// and provides a channel dispatcher factory for routing.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { sendSlackAlert } from './channels/slack'
import { sendDiscordAlert } from './channels/discord'
import { sendTeamsAlert } from './channels/teams'
import { sendEmailAlert } from './channels/email-alert'
import { sendSmsAlert } from './channels/sms-alert'
import { sendWebhookAlert } from './channels/webhook'
import type {
  AlertChannel,
  AlertChannelConfig,
  AlertIncident,
  NotificationAttempt,
  SlackChannelConfig,
  DiscordChannelConfig,
  TeamsChannelConfig,
  EmailChannelConfig,
  SmsChannelConfig,
  WebhookChannelConfig,
} from './types'

const log = createLogger('alerting:delivery-engine')

// ──────────────────────────────────────────────────────────────
// Channel Dispatcher Type
// ──────────────────────────────────────────────────────────────

/** A function that dispatches an alert to a specific channel. */
export type ChannelDispatcher = (_alert: AlertIncident) => Promise<boolean>

// ──────────────────────────────────────────────────────────────
// Delivery Engine
// ──────────────────────────────────────────────────────────────

/** In-memory log of recent delivery attempts. */
const deliveryLog: NotificationAttempt[] = []
const MAX_DELIVERY_LOG_SIZE = 1000

/**
 * Deliver an alert incident to all configured channels in parallel.
 *
 * Each channel receives the alert independently — a failure on one
 * channel does not prevent delivery to others.
 *
 * @param alert    — The alert incident to deliver
 * @param channels — Channel configurations to deliver to
 * @returns Summary of delivery results
 */
export async function deliverAlert(
  alert: AlertIncident,
  channels: AlertChannelConfig[]
): Promise<{
  total: number
  succeeded: number
  failed: number
  attempts: NotificationAttempt[]
}> {
  const enabledChannels = channels.filter(c => c.enabled)

  if (enabledChannels.length === 0) {
    log.warn('No enabled channels for alert delivery', { incidentId: alert.id })
    return { total: 0, succeeded: 0, failed: 0, attempts: [] }
  }

  log.info('Delivering alert to channels', {
    incidentId: alert.id,
    channelCount: enabledChannels.length,
    channels: enabledChannels.map(c => c.channel),
  })

  const timestamp = new Date().toISOString()
  const attempts: NotificationAttempt[] = []

  // Deliver to all channels in parallel
  const results = await Promise.allSettled(
    enabledChannels.map(async (channelConfig) => {
      const dispatcher = getChannelDispatcher(channelConfig.channel)
      return {
        channel: channelConfig.channel,
        result: await dispatcher(alert, channelConfig),
      }
    })
  )

  // Process results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { channel, result: success } = result.value
      const attempt: NotificationAttempt = {
        channel,
        timestamp,
        success,
      }
      attempts.push(attempt)
      recordDeliveryAttempt(attempt)
    } else {
      // Promise rejected (unexpected error in dispatcher)
      log.error('Channel dispatcher threw unexpectedly', result.reason, {
        incidentId: alert.id,
      })
      const attempt: NotificationAttempt = {
        channel: 'webhook' as AlertChannel, // best guess
        timestamp,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      }
      attempts.push(attempt)
      recordDeliveryAttempt(attempt)
    }
  }

  const succeeded = attempts.filter(a => a.success).length
  const failed = attempts.filter(a => !a.success).length

  log.info('Alert delivery completed', {
    incidentId: alert.id,
    total: attempts.length,
    succeeded,
    failed,
  })

  return { total: attempts.length, succeeded, failed, attempts }
}

// ──────────────────────────────────────────────────────────────
// Channel Dispatcher Factory
// ──────────────────────────────────────────────────────────────

/**
 * Get the dispatcher function for a specific alert channel.
 * Factory pattern for routing alert delivery to the appropriate provider.
 *
 * @param channel — The alert channel type
 * @returns A dispatcher function that sends an alert via the channel
 */
export function getChannelDispatcher(channel: AlertChannel): (_alert: AlertIncident, _config: AlertChannelConfig) => Promise<boolean> {
  switch (channel) {
    case 'slack':
      return async (alert, config) => {
        const slackConfig = config.config as SlackChannelConfig
        return sendSlackAlert(slackConfig.webhookUrl, alert)
      }

    case 'discord':
      return async (alert, config) => {
        const discordConfig = config.config as DiscordChannelConfig
        return sendDiscordAlert(discordConfig.webhookUrl, alert)
      }

    case 'microsoft_teams':
      return async (alert, config) => {
        const teamsConfig = config.config as TeamsChannelConfig
        return sendTeamsAlert(teamsConfig.webhookUrl, alert)
      }

    case 'email':
      return async (alert, config) => {
        const emailConfig = config.config as EmailChannelConfig
        return sendEmailAlert(emailConfig.recipients, alert)
      }

    case 'sms':
      return async (alert, config) => {
        const smsConfig = config.config as SmsChannelConfig
        return sendSmsAlert(smsConfig.recipients, alert)
      }

    case 'webhook':
      return async (alert, config) => {
        const webhookConfig = config.config as WebhookChannelConfig
        return sendWebhookAlert(webhookConfig.url, webhookConfig.secret, alert)
      }

    default: {
      const exhaustive: never = channel
      log.error('Unknown alert channel', undefined, { channel: exhaustive as string })
      return async () => false
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Delivery Attempt Tracking
// ──────────────────────────────────────────────────────────────

/**
 * Record a delivery attempt in the in-memory log.
 */
function recordDeliveryAttempt(attempt: NotificationAttempt): void {
  deliveryLog.push(attempt)
  // Evict oldest entries if we exceed the limit
  if (deliveryLog.length > MAX_DELIVERY_LOG_SIZE) {
    deliveryLog.splice(0, deliveryLog.length - MAX_DELIVERY_LOG_SIZE)
  }
}

/**
 * Get recent delivery attempts (for debugging/monitoring).
 *
 * @param limit — Maximum number of attempts to return
 * @returns Recent delivery attempts, newest first
 */
export function getDeliveryAttempts(limit: number = 100): NotificationAttempt[] {
  return deliveryLog.slice(-limit).reverse()
}

/**
 * Get delivery statistics for the current session.
 */
export function getDeliveryStats(): {
  totalAttempts: number
  successful: number
  failed: number
  byChannel: Record<string, { success: number; failed: number }>
} {
  const totalAttempts = deliveryLog.length
  const successful = deliveryLog.filter(a => a.success).length
  const failed = deliveryLog.filter(a => !a.success).length

  const byChannel: Record<string, { success: number; failed: number }> = {}
  for (const attempt of deliveryLog) {
    if (!byChannel[attempt.channel]) {
      byChannel[attempt.channel] = { success: 0, failed: 0 }
    }
    if (attempt.success) {
      byChannel[attempt.channel].success++
    } else {
      byChannel[attempt.channel].failed++
    }
  }

  return { totalAttempts, successful, failed, byChannel }
}
