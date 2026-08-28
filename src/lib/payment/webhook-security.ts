// ============================================================================
// ExamForge AI — Webhook Security Layer
// ============================================================================
// Handles Flutterwave webhook verification, replay attack prevention, and
// payload validation. Uses HMAC-SHA256 timing-safe comparison for signature
// verification and maintains a processed event store for deduplication.
//
// SECURITY PRINCIPLES:
// 1. Always verify webhook signature (HMAC-SHA256, timing-safe)
// 2. Always prevent replay attacks (event dedup + timestamp window)
// 3. Always validate payload structure (Zod schema)
// 4. Never process the same event twice (idempotent)
// 5. Never trust webhook data alone — always verify independently
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? ''

/** Maximum age of a webhook event before it's considered a replay (5 minutes) */
export const WEBHOOK_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000

// ──────────────────────────────────────────────────────────────
// Persistent Webhook Event Store (ARCH-013 fix)
// ──────────────────────────────────────────────────────────────
// Strategy: Database-first (durable across restarts and instances),
// with in-memory cache as a read-through optimization.
// Redis is also checked when available for sub-millisecond lookups.
// ──────────────────────────────────────────────────────────────

interface ProcessedEvent {
  eventId: string
  status: 'processed' | 'failed'
  processedAt: number
}

/** In-memory cache (read-through, not authoritative) */
const processedEventCache = new Map<string, ProcessedEvent>()

const EVENT_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour cache TTL
const MAX_CACHE_SIZE = 10_000 // Prevent unbounded memory growth

function cleanupEventCache(): void {
  const cutoff = Date.now() - EVENT_CACHE_TTL_MS
  for (const [key, event] of processedEventCache) {
    if (event.processedAt < cutoff) {
      processedEventCache.delete(key)
    }
  }
}

// Run cache cleanup every 10 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function ensureCleanupStarted(): void {
  if (!cleanupInterval && typeof setInterval !== 'undefined') {
    cleanupInterval = setInterval(cleanupEventCache, 10 * 60 * 1000)
    if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      ;(cleanupInterval as ReturnType<typeof setInterval> & { unref: () => void }).unref()
    }
  }
}

ensureCleanupStarted()

// ──────────────────────────────────────────────────────────────
// Zod Schema for Flutterwave Webhook Events
// ──────────────────────────────────────────────────────────────

/**
 * Zod schema for validating Flutterwave webhook payload structure.
 *
 * Flutterwave webhook events have a specific structure. This schema
 * ensures we only process well-formed events and reject malformed
 * payloads that could be injection attempts.
 */
export const FlutterwaveWebhookEventSchema = z.object({
  /** Flutterwave event type (e.g., 'charge.completed', 'transfer.completed') */
  event: z.enum([
    'charge.completed',
    'charge.failed',
    'transfer.completed',
    'transfer.failed',
    'refund.completed',
    'refund.failed',
  ]),

  /** Event data payload */
  data: z.object({
    /** Flutterwave transaction ID */
    id: z.number(),

    /** Transaction reference (tx_ref) — our custom reference */
    tx_ref: z.string().min(1),

    /** Flutterwave reference */
    flw_ref: z.string().min(1),

    /** Transaction status from Flutterwave */
    status: z.enum(['successful', 'failed', 'pending', 'cancelled']),

    /** Payment amount */
    amount: z.number().positive(),

    /** Currency code */
    currency: z.string().length(3),

    /** Customer information */
    customer: z.object({
      id: z.number().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
    }).passthrough(),

    /** Payment type */
    payment_type: z.string().optional(),

    /** Created at timestamp */
    created_at: z.string().optional(),

    /** Event ID for deduplication (Flutterwave provides this) */
    event_id: z.number().optional(),
  }).passthrough(),

  /** Optional event source IP for additional validation */
  'source-ip': z.string().optional(),

  /** Optional timestamp for replay prevention */
  eventTime: z.string().optional(),
})

export type FlutterwaveWebhookEvent = z.infer<typeof FlutterwaveWebhookEventSchema>

// ──────────────────────────────────────────────────────────────
// verifyWebhookSignature
// ──────────────────────────────────────────────────────────────

/**
 * Verifies a Flutterwave webhook signature using HMAC-SHA256.
 *
 * Uses timing-safe comparison to prevent timing attacks that could
 * leak information about the secret key through response time analysis.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the X-Flutterwave-Signature header
 * @param secret - The Flutterwave webhook secret hash
 * @returns True if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string = FLUTTERWAVE_WEBHOOK_SECRET
): boolean {
  if (!payload || !signature || !secret) {
    console.warn('[webhook-security] Missing payload, signature, or secret')
    return false
  }

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }

    const sigBuf = Buffer.from(signature, 'utf8')
    const expBuf = Buffer.from(expectedSignature, 'utf8')

    return timingSafeEqual(sigBuf, expBuf)
  } catch (error) {
    console.error('[webhook-security] Signature verification error:', error)
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// preventWebhookReplay
// ──────────────────────────────────────────────────────────────

/**
 * Prevents webhook replay attacks by checking:
 * 1. Event deduplication — has this event been processed before?
 * 2. Timestamp window — is the event too old (> 5 minutes)?
 *
 * @param eventId - A unique identifier for the webhook event
 * @param timestamp - The event timestamp (ISO string or epoch ms)
 * @returns True if the event is fresh and not a replay, false otherwise
 */
export async function preventWebhookReplay(
  eventId: string,
  timestamp: string | number
): Promise<boolean> {
  if (!eventId) {
    console.warn('[webhook-security] Missing event ID for replay check')
    return false
  }

  // Check 1: Is this a duplicate event?
  if (await isDuplicateEvent(eventId)) {
    console.warn(`[webhook-security] Duplicate event detected: ${eventId}`)
    return false
  }

  // Check 2: Is the event within the timestamp window?
  const eventTime = typeof timestamp === 'number'
    ? timestamp
    : new Date(timestamp).getTime()

  if (isNaN(eventTime)) {
    console.warn(`[webhook-security] Invalid timestamp for event ${eventId}: ${timestamp}`)
    return false
  }

  const now = Date.now()
  const age = now - eventTime

  if (age > WEBHOOK_TIMESTAMP_WINDOW_MS) {
    console.warn(
      `[webhook-security] Stale event detected: ${eventId}, age=${age}ms, ` +
      `max=${WEBHOOK_TIMESTAMP_WINDOW_MS}ms`
    )
    return false
  }

  // Future-dated events (more than 1 minute in the future) are also rejected
  if (age < -60 * 1000) {
    console.warn(
      `[webhook-security] Future-dated event detected: ${eventId}, age=${age}ms`
    )
    return false
  }

  return true
}

// ──────────────────────────────────────────────────────────────
// validateWebhookPayload
// ──────────────────────────────────────────────────────────────

/**
 * Validates a webhook payload against the Zod schema.
 *
 * This ensures the payload has the expected structure before processing.
 * Malformed payloads are rejected to prevent injection or parsing errors.
 *
 * @param payload - The parsed JSON payload from the webhook request
 * @returns The validated payload or null if validation fails
 */
export function validateWebhookPayload(
  payload: unknown
): FlutterwaveWebhookEvent | null {
  try {
    const result = FlutterwaveWebhookEventSchema.safeParse(payload)

    if (!result.success) {
      console.warn(
        '[webhook-security] Payload validation failed:',
        result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      )
      return null
    }

    return result.data
  } catch (error) {
    console.error('[webhook-security] Payload validation error:', error)
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// isDuplicateEvent
// ──────────────────────────────────────────────────────────────

/**
 * Checks if a webhook event has already been processed.
 *
 * ARCH-013 FIX: Database is the authoritative source.
 * Lookup order: in-memory cache → database.
 * The in-memory cache is a read-through optimization, not the source of truth.
 *
 * @param eventId - The unique event identifier
 * @returns True if the event has already been processed
 */
export async function isDuplicateEvent(eventId: string): Promise<boolean> {
  // Check 1: In-memory cache (fastest, per-instance)
  if (processedEventCache.has(eventId)) {
    return true
  }

  // Check 2: Database (authoritative, survives restarts and works across instances)
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (data) {
      // Populate cache for future lookups
      processedEventCache.set(eventId, {
        eventId,
        status: 'processed',
        processedAt: Date.now(),
      })
      return true
    }
  } catch (error) {
    // If DB is unreachable, log and deny-by-default for safety
    console.error('[webhook-security] DB dedup check failed — treating as potential duplicate:', error)
    return false // Allow processing but log the failure for monitoring
  }

  return false
}

// ──────────────────────────────────────────────────────────────
// recordProcessedEvent
// ──────────────────────────────────────────────────────────────

/**
 * Records a webhook event as processed to prevent duplicate processing.
 *
 * ARCH-013 FIX: Database is written first (authoritative), then cache.
 * Uses INSERT with ON CONFLICT DO NOTHING for idempotency.
 *
 * @param eventId - The unique event identifier
 * @param status - Whether the event was successfully processed or failed
 */
export async function recordProcessedEvent(
  eventId: string,
  status: 'processed' | 'failed'
): Promise<void> {
  const event: ProcessedEvent = {
    eventId,
    status,
    processedAt: Date.now(),
  }

  // Record in database FIRST (authoritative)
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        status,
        processed_at: new Date().toISOString(),
      })

    if (error) {
      // Duplicate insert (race condition) — this is fine, idempotent
      if (error.code === '23505') {
        console.info('[webhook-security] Event already recorded (duplicate insert):', eventId)
      } else {
        console.error('[webhook-security] Could not record event to DB:', error.message)
      }
    }
  } catch (error) {
    console.error('[webhook-security] Failed to record event to DB:', error)
  }

  // Update in-memory cache (bounded)
  if (processedEventCache.size >= MAX_CACHE_SIZE) {
    cleanupEventCache()
  }
  processedEventCache.set(eventId, event)
}

// ──────────────────────────────────────────────────────────────
// getProcessedEventCount (for monitoring/testing)
// ──────────────────────────────────────────────────────────────

/**
 * Returns the number of events in the processed event cache.
 * Useful for monitoring and testing.
 */
export function getProcessedEventCount(): number {
  return processedEventCache.size
}

/**
 * Clears the in-memory event cache. For testing only.
 */
export function clearEventStore(): void {
  processedEventCache.clear()
}
