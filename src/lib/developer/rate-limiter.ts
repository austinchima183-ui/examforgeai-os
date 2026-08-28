// ============================================================================
// ExamForge AI — Advanced Rate Limiter
// ============================================================================
// Implements sliding window rate limiting with burst support (token bucket)
// and multi-window enforcement (per-minute, per-hour, per-day). Backed by
// Supabase for distributed rate limiting across multiple instances.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import type {
  RateLimitCheckResult,
  RateLimitConfig,
  RateLimitOverride,
  RateLimitStatus,
} from './types';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  burstLimit: 10,
};

const BURST_REFILL_RATE_MS = 6000; // Refill 1 burst token every 6 seconds
const DB_TABLE = 'rate_limit_counters';
const DB_OVERRIDE_TABLE = 'rate_limit_overrides';

// ----------------------------------------------------------------------------
// Sliding Window Entry
// ----------------------------------------------------------------------------

interface SlidingWindowEntry {
  timestamps: number[];
}

/** In-memory fallback for when Supabase is unavailable */
const memoryStore = new Map<string, SlidingWindowEntry>();
const burstTokens = new Map<string, { tokens: number; lastRefill: number }>();

// Cleanup expired memory entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemoryStore(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key);
      burstTokens.delete(key);
    }
  }
}

// ----------------------------------------------------------------------------
// Token Bucket (Burst Support)
// ----------------------------------------------------------------------------

/**
 * Check and consume a burst token. Returns true if a token was available.
 */
function checkBurstToken(identifier: string, burstLimit: number): boolean {
  const now = Date.now();
  let bucket = burstTokens.get(identifier);

  if (!bucket) {
    bucket = { tokens: burstLimit, lastRefill: now };
    burstTokens.set(identifier, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / BURST_REFILL_RATE_MS);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(burstLimit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now - (elapsed % BURST_REFILL_RATE_MS);
  }

  // Try to consume a token
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

// ----------------------------------------------------------------------------
// Sliding Window Algorithm
// ----------------------------------------------------------------------------

/**
 * Get timestamps from the sliding window for a given identifier and window.
 * Uses Supabase when available; falls back to in-memory store.
 */
async function getWindowTimestamps(
  identifier: string,
  windowKey: string
): Promise<number[]> {
  const compoundKey = `${identifier}:${windowKey}`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DB_TABLE)
      .select('timestamps')
      .eq('key', compoundKey)
      .single();

    if (!error && data) {
      return data.timestamps as number[];
    }
  } catch {
    // Fall back to in-memory store
  }

  const entry = memoryStore.get(compoundKey);
  return entry?.timestamps ?? [];
}

/**
 * Persist timestamps to the data store.
 */
async function setWindowTimestamps(
  identifier: string,
  windowKey: string,
  timestamps: number[]
): Promise<void> {
  const compoundKey = `${identifier}:${windowKey}`;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(DB_TABLE)
      .upsert(
        { key: compoundKey, timestamps, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      // Fall back to memory
      memoryStore.set(compoundKey, { timestamps });
    }
  } catch {
    memoryStore.set(compoundKey, { timestamps });
  }
}

/**
 * Apply sliding window rate limiting for a specific window.
 * Returns the count of requests within the window and the reset time.
 */
async function applySlidingWindow(
  identifier: string,
  windowKey: string,
  windowMs: number,
  limit: number
): Promise<{ allowed: boolean; current: number; resetAt: Date }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get and filter timestamps within the window
  let timestamps = await getWindowTimestamps(identifier, windowKey);
  timestamps = timestamps.filter((ts) => ts > windowStart);

  const current = timestamps.length;
  const allowed = current < limit;

  // If allowed, add the current timestamp
  if (allowed) {
    timestamps.push(now);
    await setWindowTimestamps(identifier, windowKey, timestamps);
  }

  // Calculate reset time (when the oldest request in the window expires)
  const resetAt =
    timestamps.length > 0
      ? new Date(timestamps[0] + windowMs)
      : new Date(now + windowMs);

  return { allowed, current, resetAt };
}

// ----------------------------------------------------------------------------
// Rate Limit Override Management
// ----------------------------------------------------------------------------

/**
 * Get the rate limit override for an identifier, if one exists.
 */
async function getOverride(identifier: string): Promise<RateLimitConfig | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DB_OVERRIDE_TABLE)
      .select('config')
      .eq('identifier', identifier)
      .single();

    if (!error && data) {
      return data.config as RateLimitConfig;
    }
  } catch {
    // No override available
  }
  return null;
}

/**
 * Set a per-identifier rate limit override.
 */
export async function setRateLimitOverride(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitOverride> {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from(DB_OVERRIDE_TABLE)
    .upsert(
      {
        identifier,
        config,
        updated_at: now.toISOString(),
      },
      { onConflict: 'identifier' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to set rate limit override: ${error.message}`);
  }

  return {
    id: data.id,
    identifier,
    config,
    createdAt: new Date(data.created_at ?? now),
    updatedAt: now,
  };
}

// ----------------------------------------------------------------------------
// Main Rate Limit Check
// ----------------------------------------------------------------------------

/**
 * Check rate limit for an identifier using sliding window algorithm
 * across multiple time windows (per-minute, per-hour, per-day) with
 * burst support via token bucket.
 *
 * Returns whether the request is allowed, remaining quota, and reset time.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitCheckResult> {
  cleanupMemoryStore();

  // Check for per-identifier override
  const override = await getOverride(identifier);
  const effectiveConfig = override ?? config;

  // Check all three windows — the most restrictive one wins
  const minuteResult = await applySlidingWindow(
    identifier,
    'minute',
    60_000,
    effectiveConfig.requestsPerMinute
  );

  const hourResult = await applySlidingWindow(
    identifier,
    'hour',
    3_600_000,
    effectiveConfig.requestsPerHour
  );

  const dayResult = await applySlidingWindow(
    identifier,
    'day',
    86_400_000,
    effectiveConfig.requestsPerDay
  );

  // If any window denies the request, check burst token as last resort
  let allowed = minuteResult.allowed && hourResult.allowed && dayResult.allowed;

  if (!allowed) {
    // Allow the request if burst tokens are available
    allowed = checkBurstToken(identifier, effectiveConfig.burstLimit);
  }

  // Determine the most restrictive window for reporting
  let remaining: number;
  let resetAt: Date;
  let window: 'minute' | 'hour' | 'day';
  let limit: number;

  const minuteRemaining = effectiveConfig.requestsPerMinute - minuteResult.current;
  const hourRemaining = effectiveConfig.requestsPerHour - hourResult.current;
  const dayRemaining = effectiveConfig.requestsPerDay - dayResult.current;

  if (minuteRemaining <= hourRemaining && minuteRemaining <= dayRemaining) {
    remaining = Math.max(0, minuteRemaining - 1);
    resetAt = minuteResult.resetAt;
    limit = effectiveConfig.requestsPerMinute;
    window = 'minute';
  } else if (hourRemaining <= dayRemaining) {
    remaining = Math.max(0, hourRemaining - 1);
    resetAt = hourResult.resetAt;
    limit = effectiveConfig.requestsPerHour;
    window = 'hour';
  } else {
    remaining = Math.max(0, dayRemaining - 1);
    resetAt = dayResult.resetAt;
    limit = effectiveConfig.requestsPerDay;
    window = 'day';
  }

  // If burst was used, remaining reflects burst capacity
  if (allowed && !minuteResult.allowed) {
    const burstBucket = burstTokens.get(identifier);
    remaining = burstBucket?.tokens ?? 0;
    limit = effectiveConfig.burstLimit;
  }

  const retryAfterMs = allowed
    ? 0
    : Math.max(0, resetAt.getTime() - Date.now());

  return {
    allowed,
    remaining,
    resetAt,
    retryAfterMs,
    limit,
    window,
  };
}

// ----------------------------------------------------------------------------
// Rate Limit Status
// ----------------------------------------------------------------------------

/**
 * Get the current rate limit status for an identifier without consuming quota.
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitStatus> {
  const override = await getOverride(identifier);
  const effectiveConfig = override ?? config;

  const now = Date.now();

  // Get current counts from all windows
  const minuteTimestamps = (await getWindowTimestamps(identifier, 'minute')).filter(
    (ts) => ts > now - 60_000
  );
  const hourTimestamps = (await getWindowTimestamps(identifier, 'hour')).filter(
    (ts) => ts > now - 3_600_000
  );
  const dayTimestamps = (await getWindowTimestamps(identifier, 'day')).filter(
    (ts) => ts > now - 86_400_000
  );

  // Calculate remaining from the most restrictive window
  const minuteRemaining = effectiveConfig.requestsPerMinute - minuteTimestamps.length;
  const hourRemaining = effectiveConfig.requestsPerHour - hourTimestamps.length;
  const dayRemaining = effectiveConfig.requestsPerDay - dayTimestamps.length;

  const remaining = Math.min(minuteRemaining, hourRemaining, dayRemaining);

  // Calculate reset time from the window with the earliest expiring request
  const allTimestamps = [...minuteTimestamps, ...hourTimestamps, ...dayTimestamps];
  const resetAt =
    allTimestamps.length > 0
      ? new Date(Math.min(...allTimestamps) + 60_000)
      : new Date(now + 60_000);

  return {
    remaining: Math.max(0, remaining),
    resetAt,
    currentUsage: Math.max(
      minuteTimestamps.length,
      hourTimestamps.length,
      dayTimestamps.length
    ),
  };
}
