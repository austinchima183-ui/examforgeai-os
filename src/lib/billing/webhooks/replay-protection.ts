// ============================================================================
// ExamForge AI — Webhook Replay Protection
// ============================================================================
// Prevents replay attacks on webhook endpoints by:
// 1. Rejecting events older than a configurable tolerance (default 5 minutes)
// 2. Tracking processed event IDs with TTL
// 3. Rejecting future-dated events (> 1 minute ahead)
//
// SECURITY PRINCIPLE: Never accept stale or replayed webhook events.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { PaymentProvider } from '../types-extended'
import { DEFAULT_REPLAY_TOLERANCE_MS } from '../types-extended'

const log = createLogger('billing:webhook:replay')

// ──────────────────────────────────────────────────────────────
// In-Memory Processed Event Tracker
// ──────────────────────────────────────────────────────────────

const processedEventTracker = new Map<string, { processedAt: number; expiresAt: number }>()

// Clean up expired entries every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
const ENTRY_TTL_MS = 60 * 60 * 1000 // 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of processedEventTracker) {
      if (entry.expiresAt <= now) {
        processedEventTracker.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    ;(cleanupTimer as ReturnType<typeof setInterval> & { unref: () => void }).unref()
  }
}

startCleanup()

// ──────────────────────────────────────────────────────────────
// detectReplay
// ──────────────────────────────────────────────────────────────

/**
 * Detects replay attacks on webhook events.
 *
 * A webhook event is considered a replay if:
 * 1. The event has already been processed (duplicate event ID)
 * 2. The event timestamp is older than the tolerance (stale event)
 * 3. The event timestamp is more than 1 minute in the future (clock skew)
 *
 * @param eventId - The unique event identifier from the provider
 * @param provider - The payment provider
 * @param timestamp - The event timestamp (ISO string or epoch ms)
 * @param toleranceMs - Maximum age of an event before it's considered a replay (default 5 minutes)
 * @returns True if the event is NOT a replay (safe to process), false if it IS a replay
 */
export async function detectReplay(
  eventId: string,
  provider: PaymentProvider,
  timestamp: string | number,
  toleranceMs: number = DEFAULT_REPLAY_TOLERANCE_MS
): Promise<boolean> {
  if (!eventId) {
    log.warn('Missing event ID for replay detection')
    return false
  }

  // ─── Check 1: Is this a duplicate event? ───
  const trackerKey = `${provider}:${eventId}`

  // Check in-memory tracker
  if (processedEventTracker.has(trackerKey)) {
    log.security('Replay attack detected — duplicate event ID', { provider, eventId })
    return false
  }

  // Check database for durability
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('provider', provider)
      .eq('event_id', eventId)
      .maybeSingle()

    if (data) {
      log.security('Replay attack detected — event already in DB', { provider, eventId })
      // Populate in-memory tracker for future fast lookups
      processedEventTracker.set(trackerKey, {
        processedAt: Date.now(),
        expiresAt: Date.now() + ENTRY_TTL_MS,
      })
      return false
    }
  } catch (error) {
    // Table might not exist — don't block processing, rely on in-memory check
    log.warn('Could not check replay in DB', { error: error instanceof Error ? error.message : String(error) })
  }

  // ─── Check 2: Is the event within the timestamp tolerance? ───
  const eventTime = typeof timestamp === 'number'
    ? timestamp
    : new Date(timestamp).getTime()

  if (isNaN(eventTime)) {
    log.warn('Invalid timestamp for replay detection', { provider, eventId, timestamp })
    return false
  }

  const now = Date.now()
  const age = now - eventTime

  // Reject events older than tolerance
  if (age > toleranceMs) {
    log.security('Stale webhook event detected', {
      provider,
      eventId,
      ageMs: age,
      toleranceMs,
    })
    return false
  }

  // Reject events more than 1 minute in the future (clock skew protection)
  if (age < -60 * 1000) {
    log.security('Future-dated webhook event detected', {
      provider,
      eventId,
      ageMs: age,
    })
    return false
  }

  // ─── Record the event as seen ───
  processedEventTracker.set(trackerKey, {
    processedAt: Date.now(),
    expiresAt: Date.now() + ENTRY_TTL_MS,
  })

  // Also record in database for durability
  try {
    const supabase = await createClient()

    await supabase
      .from('webhook_events')
      .insert({
        provider,
        event_id: eventId,
        processed_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
          log.warn('Could not record event to DB for replay protection', { error: error.message })
        }
      })
  } catch (error) {
    log.warn('Failed to record event for replay protection', { error: error instanceof Error ? error.message : String(error) })
  }

  return true
}
