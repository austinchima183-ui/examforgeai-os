// ============================================================================
// ExamForge AI — API Rate Limiting
// ============================================================================
// Per-IP and per-user rate limiting for API routes. Wraps the existing
// sliding-window rate limiter from @/lib/rate-limit with API-specific
// concerns: IP extraction, user-key composition, and standard presets.
//
// Usage in API routes:
//   const { allowed, headers } = await apiRateLimit(request, RATE_LIMITS.standard)
//   if (!allowed) return rateLimitError(headers['Retry-After'])
// ============================================================================

import { NextRequest } from 'next/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { getAuthUser } from '@/lib/auth/require-auth'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/**
 * Configuration options for API rate limiting.
 */
export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed within the window */
  maxRequests: number
  /** Optional key prefix for namespace isolation (e.g., 'auth', 'ai') */
  keyPrefix?: string
}

/**
 * Result of an API rate limit check.
 */
export interface ApiRateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Rate limit headers to include in the response */
  headers: Record<string, string>
  /** Seconds until the client should retry (if rate limited) */
  retryAfter?: number
}

// ──────────────────────────────────────────────────────────────
// Default Presets
// ──────────────────────────────────────────────────────────────

/**
 * Pre-configured rate limit presets for different API route categories.
 *
 * - **strict**: Auth, billing, and security-sensitive endpoints
 * - **standard**: Most API routes (CRUD operations)
 * - **relaxed**: Read-only, search, and public endpoints
 * - **ai**: AI-powered endpoints (expensive compute)
 * - **write**: Create, update, delete mutations
 *
 * @example
 * ```ts
 * // For an authentication endpoint
 * const { allowed, headers } = await apiRateLimit(request, RATE_LIMITS.strict)
 *
 * // For a general API route
 * const { allowed, headers } = await apiRateLimit(request, RATE_LIMITS.standard)
 * ```
 */
export const RATE_LIMITS = {
  /** 10 requests/minute — auth, billing, security-sensitive */
  strict: {
    windowMs: 60_000,
    maxRequests: 10,
    keyPrefix: 'api:strict',
  } satisfies RateLimitOptions,

  /** 30 requests/minute — most API routes */
  standard: {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'api:std',
  } satisfies RateLimitOptions,

  /** 100 requests/minute — read-only, search, public endpoints */
  relaxed: {
    windowMs: 60_000,
    maxRequests: 100,
    keyPrefix: 'api:relax',
  } satisfies RateLimitOptions,

  /** 20 requests/minute — AI endpoints (expensive compute) */
  ai: {
    windowMs: 60_000,
    maxRequests: 20,
    keyPrefix: 'api:ai',
  } satisfies RateLimitOptions,

  /** 10 requests/minute — create, update, delete mutations */
  write: {
    windowMs: 60_000,
    maxRequests: 10,
    keyPrefix: 'api:write',
  } satisfies RateLimitOptions,
} as const

// ──────────────────────────────────────────────────────────────
// IP Extraction
// ──────────────────────────────────────────────────────────────

/**
 * Extract the client IP address from a Next.js request.
 *
 * Checks standard forwarded headers first (X-Forwarded-For, X-Real-IP),
 * then falls back to the request's IP property.
 *
 * Returns 'unknown' if no IP can be determined (should never block
 * on IP alone — always combine with user-based limiting).
 *
 * @param request - The incoming Next.js request
 * @returns The client IP address or 'unknown'
 */
function extractClientIp(request: NextRequest): string {
  // X-Forwarded-For: client, proxy1, proxy2 — take the first (client)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  // X-Real-IP: set by nginx and other reverse proxies
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // Next.js request IP (available in middleware and route handlers)
  const requestIp = request.headers.get('x-client-ip')
  if (requestIp) return requestIp.trim()

  return 'unknown'
}

// ──────────────────────────────────────────────────────────────
// Main Rate Limit Function
// ──────────────────────────────────────────────────────────────

/**
 * Apply per-IP and per-user rate limiting for an API route.
 *
 * This function performs TWO rate limit checks:
 * 1. **Per-IP**: Limits requests from the same IP address
 * 2. **Per-User**: If authenticated, additionally limits per-user
 *
 * Both checks must pass for the request to be allowed. This prevents
 * a single user from bypassing limits by rotating IPs, and also
 * prevents a single IP (e.g., a school network) from consuming
 * all capacity.
 *
 * @param request - The incoming Next.js API request
 * @param options - Rate limit configuration (use RATE_LIMITS presets or custom)
 * @returns ApiRateLimitResult with allowed status, headers, and retryAfter
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   // Apply standard rate limit
 *   const { allowed, headers, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
 *   if (!allowed) {
 *     return rateLimitError(retryAfter)
 *   }
 *
 *   // Process the request...
 *   const data = await fetchData()
 *   return NextResponse.json({ data }, { headers })
 * }
 * ```
 *
 * @example
 * ```ts
 * // Custom rate limit for a specific endpoint
 * const { allowed, headers } = await apiRateLimit(request, {
 *   windowMs: 5 * 60_000,  // 5 minutes
 *   maxRequests: 3,         // 3 requests per 5 minutes
 *   keyPrefix: 'api:report-gen',
 * })
 * ```
 */
export async function apiRateLimit(
  request: NextRequest,
  options: RateLimitOptions = RATE_LIMITS.standard
): Promise<ApiRateLimitResult> {
  const { windowMs, maxRequests, keyPrefix = 'api' } = options
  const clientIp = extractClientIp(request)

  // ─── Check 1: Per-IP rate limit ──────────────────────────
  const ipKey = `${keyPrefix}:ip:${clientIp}`
  const ipResult = await checkRateLimit(ipKey, maxRequests, windowMs)

  if (!ipResult.allowed) {
    const rateHeaders = getRateLimitHeaders(ipResult, maxRequests)
    const retryAfter = Math.ceil((ipResult.resetAt - Date.now()) / 1000)

    return {
      allowed: false,
      headers: {
        ...rateHeaders,
        'Retry-After': String(retryAfter),
      },
      retryAfter,
    }
  }

  // ─── Check 2: Per-user rate limit (if authenticated) ─────
  // This is a best-effort check — if we can't resolve the user,
  // we still allow the request (the IP check already passed).
  const authResult = await getAuthUser()
  if (authResult) {
    const userKey = `${keyPrefix}:user:${authResult.user.id}`
    const userResult = await checkRateLimit(userKey, maxRequests, windowMs)

    if (!userResult.allowed) {
      const rateHeaders = getRateLimitHeaders(userResult, maxRequests)
      const retryAfter = Math.ceil((userResult.resetAt - Date.now()) / 1000)

      return {
        allowed: false,
        headers: {
          ...rateHeaders,
          'Retry-After': String(retryAfter),
        },
        retryAfter,
      }
    }
  }

  // ─── Both checks passed ──────────────────────────────────
  const rateHeaders = getRateLimitHeaders(ipResult, maxRequests)

  return {
    allowed: true,
    headers: rateHeaders,
  }
}
