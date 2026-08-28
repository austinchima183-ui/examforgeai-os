// ============================================================================
// ExamForge AI — Distributed Rate Limiter
// ============================================================================
// Production-safe rate limiting that works across multiple server instances.
//
// Strategy:
// 1. Redis (preferred) — sliding window via sorted sets + Lua scripts
// 2. Supabase (fallback) — persisted counters with atomic upserts
// 3. In-memory (last resort) — per-process sliding window
//
// Rate limit categories:
// - API: General API rate limits (per-user, per-IP)
// - AI: AI generation limits (per-user, per-org, per-provider)
// - AUTH: Authentication attempts (login, register, password reset)
// - WEBHOOK: Webhook delivery attempts
// - BURST: Short-window burst protection
// ============================================================================
// FIXES: Replaces all in-memory rate limiting that disappears on horizontal scale.
// ============================================================================

import { getRedis, isRedisAvailable } from '@/lib/redis'
import { logger } from '@/lib/utils/logger'
import { getClientIp } from '@/lib/security'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type RateLimitCategory = 'api' | 'ai' | 'auth' | 'webhook' | 'burst'

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Burst allowance (extra requests allowed briefly) */
  burstLimit?: number
  /** Burst refill rate in ms between tokens */
  burstRefillMs?: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the window resets */
  resetAt: number
  /** The effective limit (may differ from config due to overrides) */
  limit: number
  /** Retry-after duration in ms (0 if allowed) */
  retryAfterMs: number
  /** Which backend was used for this check */
  backend: 'redis' | 'supabase' | 'memory'
}

export interface RateLimitKey {
  category: RateLimitCategory
  identifier: string
  /** Optional sub-identifier (e.g., provider name for AI limits) */
  subIdentifier?: string
}

// ──────────────────────────────────────────────────────────────
// Pre-configured Limits by Category
// ──────────────────────────────────────────────────────────────

const CATEGORY_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  api: { limit: 100, windowMs: 60_000, burstLimit: 20, burstRefillMs: 3000 },
  ai: { limit: 30, windowMs: 60_000, burstLimit: 5, burstRefillMs: 12000 },
  auth: { limit: 10, windowMs: 60_000, burstLimit: 3, burstRefillMs: 20000 },
  webhook: { limit: 50, windowMs: 60_000, burstLimit: 10, burstRefillMs: 6000 },
  burst: { limit: 20, windowMs: 10_000 }, // 20 requests per 10 seconds
}

// Organization-level overrides (higher limits for enterprise plans)
const ORG_TIER_MULTIPLIERS: Record<string, number> = {
  free: 1,
  starter: 2,
  professional: 5,
  enterprise: 20,
}

// ──────────────────────────────────────────────────────────────
// Redis Sliding Window (Lua Script)
// ──────────────────────────────────────────────────────────────

// Lua script for atomic sliding window rate limiting in Redis.
// Uses a sorted set to store request timestamps.
// Returns: [allowed (0/1), current_count, oldest_timestamp_ms]
const REDIS_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_start = now - window_ms

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current entries in window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Add current request
  redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
  -- Set expiry on the key to auto-clean
  redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)
  return {1, count + 1, 0}
else
  -- Get oldest entry for reset time calculation
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_ts = 0
  if #oldest >= 2 then
    oldest_ts = tonumber(oldest[2])
  end
  return {0, count, oldest_ts}
end
`

// ──────────────────────────────────────────────────────────────
// In-Memory Fallback
// ──────────────────────────────────────────────────────────────

interface MemoryEntry {
  timestamps: number[]
}

const memoryStore = new Map<string, MemoryEntry>()
const burstTokens = new Map<string, { tokens: number; lastRefill: number }>()

// Cleanup expired memory entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupMemoryStore(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key)
      burstTokens.delete(key)
    }
  }
}

function checkBurstTokenMemory(identifier: string, burstLimit: number, refillMs: number): boolean {
  const now = Date.now()
  let bucket = burstTokens.get(identifier)

  if (!bucket) {
    bucket = { tokens: burstLimit, lastRefill: now }
    burstTokens.set(identifier, bucket)
  }

  const elapsed = now - bucket.lastRefill
  const tokensToAdd = Math.floor(elapsed / refillMs)
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(burstLimit, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now - (elapsed % refillMs)
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1
    return true
  }

  return false
}

// ──────────────────────────────────────────────────────────────
// Core Rate Limit Check
// ──────────────────────────────────────────────────────────────

/**
 * Check rate limit using distributed sliding window.
 *
 * Priority: Redis → Supabase → In-memory
 * Each backend gets its own isolated key namespace.
 */
export async function checkDistributedRateLimit(
  key: RateLimitKey,
  config?: Partial<RateLimitConfig>,
  orgTier?: string
): Promise<RateLimitResult> {
  const categoryConfig = CATEGORY_LIMITS[key.category]
  const effectiveConfig: RateLimitConfig = {
    limit: config?.limit ?? categoryConfig.limit,
    windowMs: config?.windowMs ?? categoryConfig.windowMs,
    burstLimit: config?.burstLimit ?? categoryConfig.burstLimit,
    burstRefillMs: config?.burstRefillMs ?? categoryConfig.burstRefillMs,
  }

  // Apply organization tier multiplier
  if (orgTier && ORG_TIER_MULTIPLIERS[orgTier]) {
    effectiveConfig.limit = Math.floor(effectiveConfig.limit * ORG_TIER_MULTIPLIERS[orgTier])
    if (effectiveConfig.burstLimit) {
      effectiveConfig.burstLimit = Math.floor(effectiveConfig.burstLimit * ORG_TIER_MULTIPLIERS[orgTier])
    }
  }

  const compositeKey = `ef:rl:${key.category}:${key.identifier}${key.subIdentifier ? `:${key.subIdentifier}` : ''}`

  // ── Try Redis first ──
  if (isRedisAvailable()) {
    const result = await checkRedisRateLimit(compositeKey, effectiveConfig)
    if (result) return result
  }

  // ── Try Supabase fallback ──
  const supabaseResult = await checkSupabaseRateLimit(compositeKey, effectiveConfig)
  if (supabaseResult) return supabaseResult

  // ── In-memory last resort ──
  return checkMemoryRateLimit(compositeKey, effectiveConfig)
}

// ──────────────────────────────────────────────────────────────
// Redis Implementation
// ──────────────────────────────────────────────────────────────

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  try {
    const redis = await getRedis()
    if (!redis) return null

    const now = Date.now()

    const result = await redis.eval(
      REDIS_SLIDING_WINDOW_SCRIPT,
      [key],
      [now, config.windowMs, config.limit]
    ) as [number, number, number]

    const [allowed, count, oldestTs] = result
    const isAllowed = allowed === 1
    const remaining = Math.max(0, config.limit - count)
    const resetAt = oldestTs > 0 ? oldestTs + config.windowMs : now + config.windowMs
    const retryAfterMs = isAllowed ? 0 : Math.max(0, resetAt - now)

    // If denied but burst tokens available, allow
    if (!isAllowed && config.burstLimit && config.burstRefillMs) {
      const burstKey = `${key}:burst`
      const burstResult = await checkRedisBurstToken(burstKey, config.burstLimit, config.burstRefillMs)
      if (burstResult) {
        return {
          allowed: true,
          remaining: 0, // No guaranteed remaining after burst
          resetAt,
          limit: config.burstLimit,
          retryAfterMs: 0,
          backend: 'redis',
        }
      }
    }

    return {
      allowed: isAllowed,
      remaining,
      resetAt,
      limit: config.limit,
      retryAfterMs,
      backend: 'redis',
    }
  } catch (error) {
    logger.error('Redis rate limit check failed, falling back', error)
    return null // Signal to fall through to next backend
  }
}

async function checkRedisBurstToken(
  key: string,
  burstLimit: number,
  refillMs: number
): Promise<boolean> {
  try {
    const redis = await getRedis()
    if (!redis) return false

    const now = Date.now()
    const data = await redis.get(key)

    if (!data) {
      // Initialize bucket
      await redis.set(key, JSON.stringify({ tokens: burstLimit - 1, lastRefill: now }), 'EX', Math.ceil(refillMs * burstLimit / 1000) + 10)
      return true
    }

    const bucket = JSON.parse(data) as { tokens: number; lastRefill: number }
    const elapsed = now - bucket.lastRefill
    const tokensToAdd = Math.floor(elapsed / refillMs)
    bucket.tokens = Math.min(burstLimit, bucket.tokens + tokensToAdd)
    if (tokensToAdd > 0) {
      bucket.lastRefill = now - (elapsed % refillMs)
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1
      await redis.set(key, JSON.stringify(bucket), 'KEEPTTL')
      return true
    }

    return false
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Supabase Implementation
// ──────────────────────────────────────────────────────────────

async function checkSupabaseRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get current counter
    const { data, error } = await supabase
      .from('rate_limit_counters')
      .select('timestamps')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      // Not a "not found" error — actual DB error
      logger.error('Supabase rate limit query failed', error)
      return null
    }

    let timestamps: number[] = []
    if (data?.timestamps) {
      timestamps = (data.timestamps as number[]).filter(ts => ts > windowStart)
    }

    const current = timestamps.length
    const isAllowed = current < config.limit

    if (isAllowed) {
      timestamps.push(now)
      await supabase
        .from('rate_limit_counters')
        .upsert(
          { key, timestamps, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
    }

    const remaining = Math.max(0, config.limit - current - (isAllowed ? 1 : 0))
    const resetAt = timestamps.length > 0 ? timestamps[0] + config.windowMs : now + config.windowMs
    const retryAfterMs = isAllowed ? 0 : Math.max(0, resetAt - now)

    // Check burst if denied
    if (!isAllowed && config.burstLimit) {
      const burstAllowed = checkBurstTokenMemory(`${key}:burst`, config.burstLimit, config.burstRefillMs ?? 6000)
      if (burstAllowed) {
        return {
          allowed: true,
          remaining: 0,
          resetAt,
          limit: config.burstLimit,
          retryAfterMs: 0,
          backend: 'supabase',
        }
      }
    }

    return {
      allowed: isAllowed,
      remaining,
      resetAt,
      limit: config.limit,
      retryAfterMs,
      backend: 'supabase',
    }
  } catch (error) {
    logger.error('Supabase rate limit check failed, falling back to memory', error)
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// In-Memory Implementation
// ──────────────────────────────────────────────────────────────

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupMemoryStore()

  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = memoryStore.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    memoryStore.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

  const current = entry.timestamps.length
  let isAllowed = current < config.limit

  // If denied, check burst tokens
  if (!isAllowed && config.burstLimit && config.burstRefillMs) {
    isAllowed = checkBurstTokenMemory(`${key}:burst`, config.burstLimit, config.burstRefillMs)
  }

  if (isAllowed && current < config.limit) {
    entry.timestamps.push(now)
  }

  const remaining = Math.max(0, config.limit - current - (isAllowed ? 1 : 0))
  const resetAt = entry.timestamps.length > 0 ? entry.timestamps[0] + config.windowMs : now + config.windowMs
  const retryAfterMs = isAllowed ? 0 : Math.max(0, resetAt - now)

  return {
    allowed: isAllowed,
    remaining,
    resetAt,
    limit: config.limit,
    retryAfterMs,
    backend: 'memory',
  }
}

// ──────────────────────────────────────────────────────────────
// Convenience Functions
// ──────────────────────────────────────────────────────────────

/**
 * Rate limit an API request. Checks per-user and per-IP limits.
 */
export async function rateLimitAPI(
  request: Request,
  userId?: string,
  orgTier?: string
): Promise<RateLimitResult> {
  const ip = getClientIp(request)

  // Per-IP check (more restrictive for unauthenticated)
  const ipResult = await checkDistributedRateLimit(
    { category: 'api', identifier: `ip:${ip}` },
    undefined,
    orgTier
  )

  if (!ipResult.allowed) return ipResult

  // Per-user check (if authenticated)
  if (userId) {
    const userResult = await checkDistributedRateLimit(
      { category: 'api', identifier: `user:${userId}` },
      undefined,
      orgTier
    )
    if (!userResult.allowed) return userResult
  }

  return ipResult
}

/**
 * Rate limit an AI generation request.
 */
export async function rateLimitAI(
  userId: string,
  orgId: string,
  provider?: string,
  orgTier?: string
): Promise<RateLimitResult> {
  // Per-user AI limit
  const userResult = await checkDistributedRateLimit(
    { category: 'ai', identifier: `user:${userId}`, subIdentifier: provider },
    undefined,
    orgTier
  )

  if (!userResult.allowed) return userResult

  // Per-organization AI limit
  const orgResult = await checkDistributedRateLimit(
    { category: 'ai', identifier: `org:${orgId}`, subIdentifier: provider },
    { limit: 200, windowMs: 60_000 }, // Org gets higher limit
    orgTier
  )

  return orgResult
}

/**
 * Rate limit an authentication attempt.
 */
export async function rateLimitAuth(
  request: Request,
  identifier: string
): Promise<RateLimitResult> {
  const ip = getClientIp(request)

  // Per-IP auth limit (very restrictive to prevent brute force)
  const ipResult = await checkDistributedRateLimit(
    { category: 'auth', identifier: `ip:${ip}` }
  )

  if (!ipResult.allowed) return ipResult

  // Per-identifier auth limit (e.g., per email)
  const identResult = await checkDistributedRateLimit(
    { category: 'auth', identifier: `ident:${identifier}` }
  )

  return identResult
}

/**
 * Rate limit a webhook delivery.
 */
export async function rateLimitWebhook(
  orgId: string,
  webhookId: string
): Promise<RateLimitResult> {
  return checkDistributedRateLimit(
    { category: 'webhook', identifier: `org:${orgId}:wh:${webhookId}` }
  )
}

/**
 * Get rate limit headers for HTTP response.
 */
export function getDistributedRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'X-RateLimit-Backend': result.backend,
    ...(result.retryAfterMs > 0
      ? { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  }
}

/**
 * Clear rate limit for a key (for testing or admin override).
 */
export async function clearDistributedRateLimit(key: RateLimitKey): Promise<void> {
  const compositeKey = `ef:rl:${key.category}:${key.identifier}${key.subIdentifier ? `:${key.subIdentifier}` : ''}`

  // Clear from all backends
  try {
    const redis = await getRedis()
    if (redis) {
      await redis.del(compositeKey)
      await redis.del(`${compositeKey}:burst`)
    }
  } catch {
    // Ignore
  }

  memoryStore.delete(compositeKey)
  burstTokens.delete(`${compositeKey}:burst`)

  logger.info('Rate limit cleared', { category: key.category, identifier: key.identifier })
}
