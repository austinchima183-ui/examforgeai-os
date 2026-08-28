// ============================================================================
// ExamForge AI — Webhook Idempotency Layer
// ============================================================================
// Prevents duplicate webhook processing by tracking processed events with
// a unique constraint on (provider, event_id). Expired records are cleaned
// up automatically (24-hour TTL).
//
// SECURITY PRINCIPLE: Never process the same webhook event twice.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { PaymentProvider, IdempotencyResult } from '../types-extended'
import { IDEMPOTENCY_TTL_MS } from '../types-extended'

const log = createLogger('billing:webhook:idempotency')

// ──────────────────────────────────────────────────────────────
// In-Memory Cache (Fast Path)
// ──────────────────────────────────────────────────────────────

const idempotencyCache = new Map<string, { status: 'processed' | 'failed'; expiresAt: number }>()

// ──────────────────────────────────────────────────────────────
// checkIdempotency
// ──────────────────────────────────────────────────────────────

/**
 * Checks if a webhook event has already been processed (idempotency check).
 *
 * Checks both the in-memory cache (fast path) and the database (durable path).
 * If the event was already processed, returns the existing record to allow
 * returning a cached response without re-processing.
 *
 * @param eventId - The unique event identifier from the provider
 * @param provider - The payment provider
 * @returns IdempotencyResult indicating whether the event was already processed
 */
export async function checkIdempotency(
  eventId: string,
  provider: PaymentProvider
): Promise<IdempotencyResult> {
  if (!eventId) {
    log.warn('Missing event ID for idempotency check')
    return { isProcessed: false }
  }

  const cacheKey = `${provider}:${eventId}`

  // Check in-memory cache first (fast path)
  const cached = idempotencyCache.get(cacheKey)
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      log.info('Idempotency hit (cache)', { provider, eventId })
      return {
        isProcessed: true,
        record: {
          id: cacheKey,
          key: eventId,
          provider,
          requestHash: '',
          responseHash: '',
          status: cached.status,
          createdAt: '',
          expiresAt: new Date(cached.expiresAt).toISOString(),
        },
      }
    }
    // Expired entry — remove from cache
    idempotencyCache.delete(cacheKey)
  }

  // Check database (durable path)
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('webhook_idempotency')
      .select('*')
      .eq('provider', provider)
      .eq('event_id', eventId)
      .maybeSingle()

    if (error) {
      // Table might not exist yet — log but don't block processing
      log.warn('Could not check idempotency in DB', { error: error.message })
      return { isProcessed: false }
    }

    if (data) {
      // Check if the record has expired
      const expiresAt = new Date(data.expires_at as string).getTime()
      if (expiresAt > Date.now()) {
        log.info('Idempotency hit (DB)', { provider, eventId })

        // Populate cache for future fast lookups
        idempotencyCache.set(cacheKey, {
          status: data.status as 'processed' | 'failed',
          expiresAt,
        })

        return {
          isProcessed: true,
          record: {
            id: data.id as string,
            key: eventId,
            provider,
            requestHash: (data.request_hash as string) ?? '',
            responseHash: (data.response_hash as string) ?? '',
            status: data.status as 'processed' | 'failed',
            createdAt: (data.created_at as string) ?? '',
            expiresAt: (data.expires_at as string) ?? '',
          },
        }
      }
      // Expired — allow re-processing
    }
  } catch (error) {
    log.warn('Idempotency DB check failed', { error: error instanceof Error ? error.message : String(error) })
  }

  return { isProcessed: false }
}

// ──────────────────────────────────────────────────────────────
// recordIdempotency
// ──────────────────────────────────────────────────────────────

/**
 * Records a webhook event as processed to prevent duplicate processing.
 *
 * Stores in both the in-memory cache and the database for durability.
 * The record expires after IDEMPOTENCY_TTL_MS (24 hours).
 *
 * @param eventId - The unique event identifier from the provider
 * @param provider - The payment provider
 * @param result - The processing result ('processed' or 'failed')
 */
export async function recordIdempotency(
  eventId: string,
  provider: PaymentProvider,
  result: 'processed' | 'failed'
): Promise<void> {
  if (!eventId) return

  const cacheKey = `${provider}:${eventId}`
  const expiresAt = Date.now() + IDEMPOTENCY_TTL_MS

  // Record in-memory cache
  idempotencyCache.set(cacheKey, { status: result, expiresAt })

  // Record in database for durability across restarts
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('webhook_idempotency')
      .insert({
        provider,
        event_id: eventId,
        status: result,
        expires_at: new Date(expiresAt).toISOString(),
      })

    if (error) {
      // Unique constraint violation means another process already recorded it
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        log.warn('Could not record idempotency to DB', { error: error.message })
      }
    }
  } catch (error) {
    log.warn('Failed to record idempotency', { error: error instanceof Error ? error.message : String(error) })
  }
}

// ──────────────────────────────────────────────────────────────
// cleanupExpiredIdempotencyRecords
// ──────────────────────────────────────────────────────────────

/**
 * Removes expired idempotency records from the database and in-memory cache.
 *
 * Should be called periodically (e.g., via a cron job) to prevent
 * unbounded growth of the idempotency table.
 */
export async function cleanupExpiredIdempotencyRecords(): Promise<void> {
  const now = Date.now()

  // Clean up in-memory cache
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt <= now) {
      idempotencyCache.delete(key)
    }
  }

  // Clean up database
  try {
    const supabase = await createClient()

    const { error, count } = await supabase
      .from('webhook_idempotency')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date(now).toISOString())

    if (error) {
      log.warn('Failed to cleanup expired idempotency records', { error: error.message })
    } else if (count && count > 0) {
      log.info('Cleaned up expired idempotency records', { count })
    }
  } catch (error) {
    log.warn('Idempotency cleanup failed', { error: error instanceof Error ? error.message : String(error) })
  }
}
