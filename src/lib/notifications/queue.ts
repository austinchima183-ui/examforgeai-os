// ============================================================================
// ExamForge AI — Notification Retry Queue
// ============================================================================
// Persistent queue backed by Supabase (notification_queue table).
// Supports enqueue, process, retry with exponential backoff, and
// monitoring stats. Dead-letter handling after max attempts.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { processNotificationEvent } from './delivery-engine'
import type {
  NotificationEvent,
  NotificationChannel,
  NotificationQueue,
  QueueStats,
} from './types'

const log = createLogger('notifications:queue')

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/** Maximum retry attempts before dead-letter. */
const MAX_ATTEMPTS = 5

/** Base backoff in milliseconds (1 minute). */
const BASE_BACKOFF_MS = 60_000

/** Maximum number of items to process in one batch. */
const BATCH_SIZE = 50

// ──────────────────────────────────────────────────────────────
// Enqueue Notification
// ──────────────────────────────────────────────────────────────

/**
 * Add a notification event to the processing queue.
 * The event will be processed immediately or at the scheduled time.
 *
 * @param event — The notification event to enqueue
 * @returns Queue entry ID, or null on failure
 */
export async function enqueueNotification(event: NotificationEvent): Promise<string | null> {
  try {
    const supabase = await createClient()

    const processAt = event.sendAt ?? new Date().toISOString()

    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        event_id: event.id,
        channel: 'in_app' as NotificationChannel, // Primary channel for queue entry
        status: 'queued',
        attempt: 0,
        max_attempts: MAX_ATTEMPTS,
        backoff_ms: BASE_BACKOFF_MS,
        process_at: processAt,
        event_data: event,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      log.error('Failed to enqueue notification', error, { eventId: event.id })
      return null
    }

    log.info('Notification enqueued', { queueId: data?.id, eventId: event.id, processAt })
    return data?.id ?? null
  } catch (error) {
    log.error('Enqueue exception', error, { eventId: event.id })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Process Queue
// ──────────────────────────────────────────────────────────────

/**
 * Process pending notifications in the queue.
 *
 * Fetches entries with status='queued' and process_at <= now,
 * marks them as 'processing', invokes the delivery engine,
 * and updates status based on the result.
 *
 * Should be called by a cron job or scheduled worker.
 *
 * @returns Number of entries processed
 */
export async function processQueue(): Promise<number> {
  log.info('Processing notification queue')

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Fetch pending entries
    const { data: entries, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('process_at', now)
      .order('process_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      log.error('Failed to fetch queue entries', fetchError)
      return 0
    }

    if (!entries || entries.length === 0) {
      log.debug('No pending queue entries')
      return 0
    }

    log.info('Processing queue entries', { count: entries.length })

    let processed = 0

    for (const entry of entries) {
      try {
        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', entry.id)

        // Deserialize event
        const event = (entry.event_data as unknown) as NotificationEvent

        // Process the event
        await processNotificationEvent(event)

        // Mark as completed
        await supabase
          .from('notification_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', entry.id)

        processed++
      } catch (error) {
        log.error('Queue entry processing failed', error, { queueId: entry.id })

        // Calculate next attempt
        const nextAttempt = (entry.attempt ?? 0) + 1
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, entry.attempt ?? 0)
        const nextProcessAt = new Date(Date.now() + backoffMs).toISOString()

        if (nextAttempt >= (entry.max_attempts ?? MAX_ATTEMPTS)) {
          // Move to dead letter
          await supabase
            .from('notification_queue')
            .update({
              status: 'dead_letter',
              completed_at: new Date().toISOString(),
              last_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', entry.id)

          log.warn('Entry moved to dead letter', { queueId: entry.id, attempts: nextAttempt })
        } else {
          // Schedule retry
          await supabase
            .from('notification_queue')
            .update({
              status: 'queued',
              attempt: nextAttempt,
              backoff_ms: backoffMs,
              process_at: nextProcessAt,
              last_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', entry.id)
        }
      }
    }

    log.info('Queue processing complete', { processed, total: entries.length })
    return processed
  } catch (error) {
    log.error('Queue processing exception', error)
    return 0
  }
}

// ──────────────────────────────────────────────────────────────
// Retry Failed
// ──────────────────────────────────────────────────────────────

/**
 * Manually retry a failed notification delivery on a specific channel.
 *
 * @param channel        — The channel to retry
 * @param notificationId — The notification to retry
 * @returns True if retry was scheduled, false otherwise
 */
export async function retryFailed(
  channel: NotificationChannel,
  notificationId: string
): Promise<boolean> {
  log.info('Manual retry requested', { channel, notificationId })

  try {
    const supabase = await createClient()

    // Find the existing failed delivery
    const { data: delivery, error } = await supabase
      .from('notification_delivery_log')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('channel', channel)
      .single()

    if (error || !delivery) {
      log.error('Failed delivery not found', error, { notificationId, channel })
      return false
    }

    // Reset the delivery status and enqueue for retry
    const backoffMs = BASE_BACKOFF_MS
    const processAt = new Date(Date.now() + backoffMs).toISOString()

    const { error: insertError } = await supabase
      .from('notification_queue')
      .insert({
        notification_id: notificationId,
        event_id: delivery.event_id,
        channel,
        status: 'queued',
        attempt: 1,
        max_attempts: MAX_ATTEMPTS,
        backoff_ms: backoffMs,
        process_at: processAt,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      log.error('Failed to enqueue retry', insertError, { notificationId, channel })
      return false
    }

    log.info('Retry scheduled', { notificationId, channel, processAt })
    return true
  } catch (error) {
    log.error('Retry scheduling exception', error, { notificationId, channel })
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Queue Stats
// ──────────────────────────────────────────────────────────────

/**
 * Get monitoring statistics about the notification queue.
 *
 * @returns QueueStats with counts by status
 */
export async function getQueueStats(): Promise<QueueStats> {
  const defaultStats: QueueStats = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadLetter: 0,
    total: 0,
    oldestQueuedAt: null,
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_queue')
      .select('status, created_at')

    if (error || !data) {
      log.error('Failed to fetch queue stats', error)
      return defaultStats
    }

    const stats: QueueStats = { ...defaultStats }

    for (const entry of data) {
      stats.total++
      switch (entry.status as NotificationQueue['status']) {
        case 'queued':
          stats.queued++
          if (!stats.oldestQueuedAt || entry.created_at < stats.oldestQueuedAt) {
            stats.oldestQueuedAt = entry.created_at
          }
          break
        case 'processing':
          stats.processing++
          break
        case 'completed':
          stats.completed++
          break
        case 'failed':
          stats.failed++
          break
        case 'dead_letter':
          stats.deadLetter++
          break
      }
    }

    return stats
  } catch (error) {
    log.error('Queue stats exception', error)
    return defaultStats
  }
}
