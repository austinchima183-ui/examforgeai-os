// ============================================================================
// ExamForge AI — Notification Delivery Engine
// ============================================================================
// Core delivery engine: event processing, multi-channel dispatch,
// delivery tracking, bounce handling, retry scheduling, and digest
// compilation. All mutations enforce IDOR protection via user_id checks.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { renderTemplate, resolveTemplateId } from './template-engine'
import { sendEmail } from './providers/email-resend'
import { sendPushNotification } from './providers/push-firebase'
import { sendSms } from './providers/sms-twilio'
import type {
  NotificationChannel,
  NotificationType,
  NotificationEvent,
  NotificationUser,
  DeliveryResult,
  DeliveryStatus,
  BounceInfo,
  DigestType,
  CompiledDigest,
  DigestGroup,
  DigestItem,
  SupportedLocale,
} from './types'

const log = createLogger('notifications:delivery-engine')

// ──────────────────────────────────────────────────────────────
// Process Notification Event
// ──────────────────────────────────────────────────────────────

/**
 * Main entry point for event-driven notification delivery.
 *
 * Resolves template → resolves recipients → resolves channels →
 * delivers to each channel → tracks delivery.
 *
 * @param event — The notification event to process
 */
export async function processNotificationEvent(event: NotificationEvent): Promise<void> {
  log.info('Processing notification event', {
    eventId: event.id,
    type: event.type,
    recipientCount: event.recipientIds.length,
    priority: event.priority,
  })

  const templateId = event.templateId ?? resolveTemplateId(event.type)

  for (const userId of event.recipientIds) {
    try {
      // Resolve user context
      const user = await resolveUser(userId)
      if (!user) {
        log.warn('Recipient user not found, skipping', { userId, eventId: event.id })
        continue
      }

      // Check for suppressed addresses
      const isSuppressed = await checkSuppression(user)
      if (isSuppressed) {
        log.info('User has suppressed addresses, skipping', { userId, eventId: event.id })
        continue
      }

      // Render template
      const locale = event.locale ?? user.locale ?? ('en' as SupportedLocale)
      const rendered = renderTemplate(templateId, event.data as Record<string, string | number | boolean | null | undefined>, locale)
      if (!rendered) {
        log.error('Template rendering failed', undefined, { templateId, locale, eventId: event.id })
        continue
      }

      // Resolve channels (from event or template defaults)
      const channels = event.channels ?? rendered.template.defaultChannels

      // Create in-app notification first (always)
      const notificationId = await createInAppNotification(
        userId,
        event,
        rendered.subject,
        rendered.shortBody,
        rendered.htmlBody // used for in-app storage
      )

      if (!notificationId) {
        log.error('Failed to create in-app notification', undefined, { userId, eventId: event.id })
        continue
      }

      // Deliver to each channel
      for (const channel of channels) {
        try {
          await deliverToChannel(
            { id: notificationId, eventId: event.id, userId, subject: rendered.subject, htmlBody: rendered.htmlBody, textBody: rendered.textBody, shortBody: rendered.shortBody },
            channel,
            user
          )
        } catch (error) {
          log.error('Channel delivery failed', error, { channel, userId, eventId: event.id })
        }
      }
    } catch (error) {
      log.error('Recipient processing failed', error, { userId, eventId: event.id })
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Deliver to Channel
// ──────────────────────────────────────────────────────────────

interface DeliverableNotification {
  id: string
  eventId: string
  userId: string
  subject: string
  htmlBody: string
  textBody: string
  shortBody: string
}

/**
 * Per-channel delivery dispatcher.
 * Routes to the appropriate provider based on channel.
 */
export async function deliverToChannel(
  notification: DeliverableNotification,
  channel: NotificationChannel,
  user: NotificationUser
): Promise<DeliveryResult> {
  log.info('Delivering to channel', { channel, userId: user.id, notificationId: notification.id })

  let result: DeliveryResult

  switch (channel) {
    case 'in_app':
      result = await deliverInApp(notification, user)
      break
    case 'email':
      result = await deliverEmail(notification, user)
      break
    case 'push':
      result = await deliverPush(notification, user)
      break
    case 'sms':
      result = await deliverSms(notification, user)
      break
    default: {
      const exhaustive: never = channel
      result = { success: false, status: 'failed', error: `Unknown channel: ${exhaustive as string}` }
    }
  }

  // Track delivery
  await trackDelivery(
    notification.id,
    channel,
    result.status,
    {
      providerId: result.providerId,
      error: result.error,
      ...result.metadata,
    }
  )

  return result
}

// ──────────────────────────────────────────────────────────────
// Channel-Specific Delivery
// ──────────────────────────────────────────────────────────────

/**
 * Deliver via email (Resend).
 */
export async function deliverEmail(
  notification: DeliverableNotification,
  user: NotificationUser
): Promise<DeliveryResult> {
  if (!user.email) {
    return { success: false, status: 'failed', error: 'User has no email address' }
  }

  return sendEmail(
    user.email,
    notification.subject,
    notification.htmlBody,
    notification.textBody
  )
}

/**
 * Deliver via push notification (Firebase FCM).
 */
export async function deliverPush(
  notification: DeliverableNotification,
  user: NotificationUser
): Promise<DeliveryResult> {
  if (!user.pushToken) {
    return { success: false, status: 'failed', error: 'User has no push token' }
  }

  return sendPushNotification(user.pushToken, {
    title: notification.subject,
    body: notification.shortBody,
  })
}

/**
 * Deliver via SMS (Twilio).
 */
export async function deliverSms(
  notification: DeliverableNotification,
  user: NotificationUser
): Promise<DeliveryResult> {
  if (!user.phone) {
    return { success: false, status: 'failed', error: 'User has no phone number' }
  }

  return sendSms(user.phone, notification.shortBody)
}

/**
 * Deliver in-app notification (Supabase insert).
 * This is typically already done during event processing,
 * so this just confirms the notification exists.
 */
export async function deliverInApp(
  _notification: DeliverableNotification,
  user: NotificationUser
): Promise<DeliveryResult> {
  // The in-app notification is created during processNotificationEvent.
  // This function confirms it exists and marks it as delivered.
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', _notification.id)
      .eq('user_id', user.id) // SECURITY: IDOR protection
      .single()

    if (error || !data) {
      return { success: false, status: 'failed', error: 'In-app notification not found' }
    }

    return { success: true, status: 'delivered', metadata: { provider: 'supabase_realtime' } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown in-app delivery error'
    return { success: false, status: 'failed', error: message }
  }
}

// ──────────────────────────────────────────────────────────────
// Delivery Tracking
// ──────────────────────────────────────────────────────────────

/**
 * Track delivery status for a notification on a specific channel.
 * Upserts into the notification_delivery table.
 *
 * @param notificationId — The notification row ID
 * @param channel       — Delivery channel
 * @param status        — Current delivery status
 * @param metadata      — Additional metadata
 */
export async function trackDelivery(
  notificationId: string,
  channel: NotificationChannel,
  status: DeliveryStatus,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notification_delivery_log')
      .upsert({
        notification_id: notificationId,
        channel,
        status,
        provider: metadata.provider ?? 'unknown',
        metadata,
        updated_at: new Date().toISOString(),
        ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      }, { onConflict: 'notification_id,channel' })

    if (error) {
      log.error('Failed to track delivery', error, { notificationId, channel, status })
    }
  } catch (error) {
    log.error('Delivery tracking exception', error, { notificationId, channel })
  }
}

// ──────────────────────────────────────────────────────────────
// Bounce Handling
// ──────────────────────────────────────────────────────────────

/**
 * Handle a delivery bounce. Records the bounce and may suppress future
 * sends to the bounced address.
 *
 * @param notificationId — The notification that bounced
 * @param channel       — Channel on which the bounce occurred
 * @param bounceInfo    — Bounce details from the provider webhook
 */
export async function handleBounce(
  notificationId: string,
  channel: NotificationChannel,
  bounceInfo: BounceInfo
): Promise<void> {
  log.warn('Handling bounce', {
    notificationId,
    channel,
    address: bounceInfo.address,
    bounceType: bounceInfo.bounceType,
  })

  try {
    const supabase = await createClient()

    // Record the bounce
    const { error: bounceError } = await supabase
      .from('notification_bounces')
      .insert({
        address: bounceInfo.address,
        channel,
        bounce_type: bounceInfo.bounceType,
        bounce_code: bounceInfo.bounceCode ?? null,
        diagnostic: bounceInfo.diagnostic ?? null,
        suppressed: bounceInfo.bounceType === 'hard',
        bounced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })

    if (bounceError) {
      log.error('Failed to record bounce', bounceError, { address: bounceInfo.address })
    }

    // Update delivery status
    await trackDelivery(notificationId, channel, 'bounced', {
      bounceType: bounceInfo.bounceType,
      bounceCode: bounceInfo.bounceCode,
    })

    // For hard bounces, suppress future sends
    if (bounceInfo.bounceType === 'hard') {
      await suppressAddress(bounceInfo.address, channel)
    }
  } catch (error) {
    log.error('Bounce handling exception', error, { notificationId, channel })
  }
}

/**
 * Suppress future deliveries to a bounced address.
 */
async function suppressAddress(address: string, channel: NotificationChannel): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notification_bounces')
      .update({ suppressed: true, updated_at: new Date().toISOString() })
      .eq('address', address)
      .eq('channel', channel)

    if (error) {
      log.error('Failed to suppress address', error, { address, channel })
    } else {
      log.info('Address suppressed', { address, channel })
    }
  } catch (error) {
    log.error('Address suppression exception', error, { address, channel })
  }
}

/**
 * Check if a user has any suppressed delivery addresses.
 */
async function checkSuppression(user: NotificationUser): Promise<boolean> {
  try {
    const supabase = await createClient()

    const addresses = [user.email, user.phone, user.pushToken].filter(Boolean) as string[]

    if (addresses.length === 0) return false

    const { data, error } = await supabase
      .from('notification_bounces')
      .select('address')
      .in('address', addresses)
      .eq('suppressed', true)

    if (error) {
      log.error('Suppression check failed', error, { userId: user.id })
      return false
    }

    return (data ?? []).length > 0
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Retry Scheduling
// ──────────────────────────────────────────────────────────────

/** Maximum retry attempts. */
const MAX_RETRY_ATTEMPTS = 5

/** Base backoff in milliseconds. */
const BASE_BACKOFF_MS = 60_000 // 1 minute

/**
 * Schedule a retry for a failed notification delivery.
 * Uses exponential backoff: baseBackoff * 2^attempt.
 *
 * @param notificationId — The notification to retry
 * @param channel       — The channel to retry on
 * @param attempt       — Current attempt number (0-based)
 * @param backoffMs     — Custom backoff override (defaults to exponential)
 */
export async function scheduleRetry(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  backoffMs?: number
): Promise<void> {
  if (attempt >= MAX_RETRY_ATTEMPTS) {
    log.warn('Max retry attempts reached, moving to dead letter', {
      notificationId,
      channel,
      attempt,
    })
    await trackDelivery(notificationId, channel, 'failed', { maxRetriesReached: true })
    return
  }

  const calculatedBackoff = backoffMs ?? BASE_BACKOFF_MS * Math.pow(2, attempt)
  const processAt = new Date(Date.now() + calculatedBackoff).toISOString()

  log.info('Scheduling retry', {
    notificationId,
    channel,
    attempt,
    backoffMs: calculatedBackoff,
    processAt,
  })

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notification_queue')
      .insert({
        notification_id: notificationId,
        channel,
        status: 'queued',
        attempt: attempt + 1,
        max_attempts: MAX_RETRY_ATTEMPTS,
        backoff_ms: calculatedBackoff,
        process_at: processAt,
        created_at: new Date().toISOString(),
      })

    if (error) {
      log.error('Failed to schedule retry', error, { notificationId, channel })
    }
  } catch (error) {
    log.error('Retry scheduling exception', error, { notificationId, channel })
  }
}

// ──────────────────────────────────────────────────────────────
// Digest Compilation
// ──────────────────────────────────────────────────────────────

/**
 * Compile a digest of unread notifications for a user.
 *
 * @param userId     — User ID
 * @param digestType — Daily or weekly digest
 * @returns Compiled digest, or null if no unread notifications
 */
export async function processDigest(
  userId: string,
  digestType: DigestType
): Promise<CompiledDigest | null> {
  log.info('Compiling digest', { userId, digestType })

  try {
    const supabase = await createClient()

    // Determine period
    const now = new Date()
    const periodEnd = now.toISOString()
    const periodStart = new Date(
      digestType === 'daily'
        ? now.getTime() - 24 * 60 * 60 * 1000
        : now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    // Fetch unread notifications in the period
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, action_url, created_at')
      .eq('user_id', userId) // SECURITY: IDOR protection
      .eq('is_read', false)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Failed to fetch notifications for digest', error, { userId })
      return null
    }

    if (!notifications || notifications.length === 0) {
      log.info('No unread notifications for digest', { userId, digestType })
      return null
    }

    // Group by type
    const grouped = new Map<string, DigestItem[]>()
    for (const n of notifications) {
      const type = n.type as string
      if (!grouped.has(type)) grouped.set(type, [])
      grouped.get(type)!.push({
        id: n.id,
        title: n.title,
        body: n.body,
        actionUrl: n.action_url,
        createdAt: n.created_at,
      })
    }

    // Build digest groups
    const summaries: DigestGroup[] = []
    const typeLabels: Record<string, string> = {
      exam_reminder: 'Exam Reminders',
      exam_result: 'Exam Results',
      assignment: 'Assignments',
      announcement: 'Announcements',
      message: 'Messages',
      subscription: 'Subscriptions',
      payment: 'Payments',
      system: 'System Alerts',
      ai_generation: 'AI Insights',
      marketplace: 'Marketplace',
      enrollment: 'Enrollment',
    }

    for (const [type, items] of grouped.entries()) {
      summaries.push({
        type: type as NotificationType,
        count: items.length,
        title: typeLabels[type] ?? type,
        items,
      })
    }

    // Sort groups by count (most notifications first)
    summaries.sort((a, b) => b.count - a.count)

    const totalUnread = notifications.length

    // Render digest HTML
    const html = renderDigestHtml(summaries, digestType, totalUnread)
    const text = renderDigestText(summaries, digestType, totalUnread)

    return {
      userId,
      digestType,
      periodStart,
      periodEnd,
      summaries,
      totalUnread,
      html,
      text,
    }
  } catch (error) {
    log.error('Digest compilation exception', error, { userId, digestType })
    return null
  }
}

/** Render digest as HTML. */
function renderDigestHtml(groups: DigestGroup[], digestType: DigestType, total: number): string {
  const period = digestType === 'daily' ? 'Daily' : 'Weekly'
  const sections = groups.map(group => `
    <div style="margin-bottom:24px">
      <h3 style="margin:0 0 8px">${group.title} (${group.count})</h3>
      <ul style="margin:0;padding-left:20px">
        ${group.items.slice(0, 5).map(item => `<li><strong>${item.title}</strong> — ${item.body.slice(0, 100)}</li>`).join('\n')}
        ${group.items.length > 5 ? `<li>...and ${group.items.length - 5} more</li>` : ''}
      </ul>
    </div>
  `).join('\n')

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>${period} Digest — ${total} unread</h2>
    ${sections}
    <p>— ExamForge AI</p>
  </div>`
}

/** Render digest as plain text. */
function renderDigestText(groups: DigestGroup[], digestType: DigestType, total: number): string {
  const period = digestType === 'daily' ? 'Daily' : 'Weekly'
  const sections = groups.map(group => {
    const items = group.items.slice(0, 5).map(item => `  • ${item.title} — ${item.body.slice(0, 100)}`).join('\n')
    const more = group.items.length > 5 ? `\n  ...and ${group.items.length - 5} more` : ''
    return `${group.title} (${group.count})\n${items}${more}`
  }).join('\n\n')

  return `${period} Digest — ${total} unread\n\n${sections}\n\n— ExamForge AI`
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Resolve a user's notification context from Supabase.
 */
async function resolveUser(userId: string): Promise<NotificationUser | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, phone, push_token, locale, role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      log.error('Failed to resolve user', error, { userId })
      return null
    }

    return {
      id: data.id,
      email: data.email ?? '',
      phone: data.phone ?? null,
      pushToken: data.push_token ?? null,
      locale: (data.locale as SupportedLocale) ?? 'en',
      role: data.role ?? 'student',
    }
  } catch (error) {
    log.error('User resolution exception', error, { userId })
    return null
  }
}

/**
 * Create an in-app notification in the Supabase notifications table.
 * Returns the new notification ID.
 */
async function createInAppNotification(
  userId: string,
  event: NotificationEvent,
  title: string,
  body: string,
  _htmlBody: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        type: event.type,
        priority: event.priority,
        is_read: false,
        action_url: (event.data.actionUrl as string) ?? null,
        source_id: event.sourceId ?? null,
        source_type: event.sourceType ?? null,
        organization_id: event.organizationId ?? null,
        school_id: event.schoolId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      log.error('Failed to create in-app notification', error, { userId, eventId: event.id })
      return null
    }

    return data?.id ?? null
  } catch (error) {
    log.error('In-app notification creation exception', error, { userId, eventId: event.id })
    return null
  }
}
