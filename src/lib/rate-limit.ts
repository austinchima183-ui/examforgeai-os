// ============================================================================
// ExamForge AI — Rate Limiter (Delegates to Distributed Implementation)
// ============================================================================
// SEC-006 FIX: This module now delegates to the distributed rate limiter
// which uses Redis → Supabase → in-memory (last resort).
// The old pure in-memory implementation has been removed.
// ============================================================================

import { checkDistributedRateLimit } from '@/lib/rate-limit-distributed'
import type { RateLimitResult as DistributedResult } from '@/lib/rate-limit-distributed'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  total: number
}

/**
 * Check rate limit using the distributed implementation.
 * @param key - Unique identifier (e.g., IP address, email)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(key: string, limit: number = 10, windowMs: number = 60_000): Promise<RateLimitResult> {
  const result = await checkDistributedRateLimit(
    { category: 'api', identifier: key },
    { limit, windowMs }
  )

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.resetAt,
    total: result.limit,
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}

/**
 * Clear rate limit for a key (useful for testing)
 */
export async function clearRateLimit(key: string): Promise<void> {
  const { clearDistributedRateLimit } = await import('@/lib/rate-limit-distributed')
  await clearDistributedRateLimit({ category: 'api', identifier: key })
}
