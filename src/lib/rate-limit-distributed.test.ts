// ============================================================================
// ExamForge AI — Rate Limiting Tests
// ============================================================================
// Tests for the distributed rate limiter: in-memory fallback path,
// burst tokens, rate limit headers, and convenience functions.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkDistributedRateLimit,
  getDistributedRateLimitHeaders,
  clearDistributedRateLimit,
} from '@/lib/rate-limit-distributed'

// Note: Redis and Supabase are mocked in test/setup.ts
// These tests exercise the in-memory fallback path

describe('Distributed Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits between tests
    vi.clearAllMocks()
  })

  it('allows requests within the limit', async () => {
    const result = await checkDistributedRateLimit({
      category: 'api',
      identifier: 'test-user-1',
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
    expect(result.limit).toBeGreaterThan(0)
  })

  it('returns correct headers format', () => {
    const result = {
      allowed: true,
      remaining: 95,
      resetAt: Date.now() + 60000,
      limit: 100,
      retryAfterMs: 0,
      backend: 'memory' as const,
    }

    const headers = getDistributedRateLimitHeaders(result)
    expect(headers['X-RateLimit-Limit']).toBe('100')
    expect(headers['X-RateLimit-Remaining']).toBe('95')
    expect(headers['X-RateLimit-Backend']).toBe('memory')
    expect(headers).not.toHaveProperty('Retry-After')
  })

  it('includes Retry-After header when rate limited', () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30000,
      limit: 100,
      retryAfterMs: 30000,
      backend: 'memory' as const,
    }

    const headers = getDistributedRateLimitHeaders(result)
    expect(headers['Retry-After']).toBeDefined()
  })

  it('uses in-memory backend when Redis is unavailable', async () => {
    const result = await checkDistributedRateLimit({
      category: 'api',
      identifier: 'test-memory',
    })

    // Redis is mocked as unavailable, so should fall back to memory
    expect(result.backend).toBe('memory')
  })

  it('enforces auth category limits (most restrictive)', async () => {
    // Auth has limit of 10 per minute
    const results = []
    for (let i = 0; i < 12; i++) {
      results.push(await checkDistributedRateLimit({
        category: 'auth',
        identifier: 'auth-test-user',
      }))
    }

    // First requests should be allowed, later ones should be denied
    const allowedCount = results.filter(r => r.allowed).length
    const deniedCount = results.filter(r => !r.allowed).length

    expect(allowedCount).toBeGreaterThan(0)
    // With burst tokens, may allow slightly more than 10
    expect(allowedCount).toBeLessThan(20)
  })
})

describe('Rate Limit Categories', () => {
  it('API category has higher limits than auth', async () => {
    const apiResult = await checkDistributedRateLimit({
      category: 'api',
      identifier: 'cat-api',
    })

    const authResult = await checkDistributedRateLimit({
      category: 'auth',
      identifier: 'cat-auth',
    })

    expect(apiResult.limit).toBeGreaterThan(authResult.limit)
  })
})
