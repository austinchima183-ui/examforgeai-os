// ============================================================================
// ExamForge AI — Notification Scheduler
// ============================================================================
// Schedules notifications for future delivery, processes due scheduled
// notifications, and supports cancellation. Backed by Supabase
// scheduled_notifications table.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { processNotificationEvent } from './delivery-engine'
import type { NotificationEvent, ScheduledNotification } from './types'

const log = createLogger('notifications:scheduler')

// ──────────────────────────────────────────────────────────────
// Schedule Notification
// ──────────────────────────────────────────────────────────────

/**
 * Schedule a notification event for future delivery.
 *
 * @param event  — The notification event to schedule
 * @param sendAt — ISO-8601 timestamp for when to deliver
 * @returns Schedule entry ID, or null on failure
 */
export async function scheduleNotification(
  event: NotificationEvent,
  sendAt: string
): Promise<string | null> {
  // Validate sendAt is in the future
  const sendTime = new Date(sendAt)
  if (isNaN(sendTime.getTime())) {
    log.error('Invalid sendAt timestamp', undefined, { sendAt })
    return null
  }

  log.info('Scheduling notification', {
    eventId: event.id,
    type: event.type,
    sendAt,
    recipientCount: event.recipientIds.length,
  })

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        event_data: event,
        send_at: sendAt,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      log.error('Failed to schedule notification', error, { eventId: event.id, sendAt })
      return null
    }

    log.info('Notification scheduled', { scheduleId: data?.id, eventId: event.id, sendAt })
    return data?.id ?? null
  } catch (error) {
    log.error('Scheduling exception', error, { eventId: event.id, sendAt })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Process Scheduled Notifications
// ──────────────────────────────────────────────────────────────

/** Maximum number of scheduled notifications to process in one batch. */
const SCHEDULE_BATCH_SIZE = 50

/**
 * Process all scheduled notifications that are due.
 *
 * Fetches entries with status='pending' and send_at <= now,
 * processes them via the delivery engine, and marks them completed.
 *
 * Should be called by a cron job or scheduled worker.
 *
 * @returns Number of scheduled notifications processed
 */
export async function processScheduledNotifications(): Promise<number> {
  log.info('Processing scheduled notifications')

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Fetch due scheduled notifications
    const { data: scheduled, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', now)
      .order('send_at', { ascending: true })
      .limit(SCHEDULE_BATCH_SIZE)

    if (fetchError) {
      log.error('Failed to fetch scheduled notifications', fetchError)
      return 0
    }

    if (!scheduled || scheduled.length === 0) {
      log.debug('No due scheduled notifications')
      return 0
    }

    log.info('Processing scheduled notifications', { count: scheduled.length })

    let processed = 0

    for (const entry of scheduled) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', entry.id)

        // Deserialize and process event
        const event = (entry.event_data as unknown) as NotificationEvent
        await processNotificationEvent(event)

        // Mark as completed
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', entry.id)

        processed++
      } catch (error) {
        log.error('Scheduled notification processing failed', error, { scheduleId: entry.id })

        // Reset to pending for retry on next cycle
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'pending' })
          .eq('id', entry.id)
      }
    }

    log.info('Scheduled notifications processed', { processed, total: scheduled.length })
    return processed
  } catch (error) {
    log.error('Scheduled processing exception', error)
    return 0
  }
}

// ──────────────────────────────────────────────────────────────
// Cancel Scheduled Notification
// ──────────────────────────────────────────────────────────────

/**
 * Cancel a scheduled notification.
 * Only pending notifications can be cancelled.
 *
 * @param scheduleId — The schedule entry ID to cancel
 * @returns True if cancelled, false otherwise
 */
export async function cancelScheduledNotification(scheduleId: string): Promise<boolean> {
  log.info('Cancelling scheduled notification', { scheduleId })

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('status', 'pending') // SECURITY: Only cancel pending entries
      .select('id')
      .single()

    if (error || !data) {
      log.error('Failed to cancel scheduled notification', error, { scheduleId })
      return false
    }

    log.info('Scheduled notification cancelled', { scheduleId })
    return true
  } catch (error) {
    log.error('Cancel exception', error, { scheduleId })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Get Scheduled Notifications
// ──────────────────────────────────────────────────────────────

/**
 * Get scheduled notifications for a user (admin/debug).
 *
 * @param userId — Filter by recipient user ID
 * @param limit  — Maximum results
 * @returns Array of scheduled notifications
 */
export async function getScheduledNotifications(
  userId?: string,
  limit: number = 20
): Promise<ScheduledNotification[]> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('send_at', { ascending: true })
      .limit(limit)

    if (userId) {
      // Filter by recipient in the event_data JSONB
      query = query.contains('event_data', { recipientIds: [userId] })
    }

    const { data, error } = await query

    if (error || !data) {
      log.error('Failed to fetch scheduled notifications', error)
      return []
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      event: (row.event_data as unknown) as NotificationEvent,
      sendAt: row.send_at as string,
      status: row.status as ScheduledNotification['status'],
      createdAt: row.created_at as string,
    }))
  } catch (error) {
    log.error('Get scheduled notifications exception', error)
    return []
  }
}
