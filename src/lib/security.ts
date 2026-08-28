// ============================================================================
// ExamForge AI — Security Utilities
// ============================================================================
// Input sanitization, bot detection, CSRF protection, spam detection,
// client IP extraction, and Cloudflare Turnstile verification.
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Sanitize user input — strip HTML tags, trim, normalize whitespace
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[^\S\n]+/g, ' ') // Normalize whitespace (except newlines)
    .trim()
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v)
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized as T
}

/**
 * Check if user agent belongs to a bot
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawl/i, /spider/i, /scrape/i, /slurp/i,
    /mediapartners/i, /preview/i, /fetch/i, /curl/i,
    /wget/i, /python-requests/i, /httpclient/i,
    /google-webfonts/i, /semrush/i, /ahrefs/i,
    /mj12bot/i, /dotbot/i, /rogerbot/i,
  ]
  return botPatterns.some(pattern => pattern.test(userAgent))
}

/**
 * Generate CSRF token using HMAC
 */
export function generateCsrfToken(sessionId: string, secret?: string): string {
  const key = secret || process.env.CSRF_SECRET
  if (!key) {
    // FAIL FAST: No fallback — CSRF_SECRET must be set in all environments.
    // In development, generate a random per-process secret and warn.
    // In production/staging, throw immediately.
    if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'staging') {
      throw new Error('CSRF_SECRET environment variable is required. Application refuses to start without it.')
    }
    // Dev: generate a cryptographically random per-process fallback
    if (!(globalThis as Record<string, unknown>).__EF_CSRF_DEV_SECRET) {
      const devBytes = new Uint8Array(32)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(devBytes)
      }
      (globalThis as Record<string, unknown>).__EF_CSRF_DEV_SECRET = Buffer.from(devBytes).toString('hex')
      console.warn('[SECURITY] CSRF_SECRET not set — using random per-process dev secret. Set CSRF_SECRET env var.')
    }
    return createHmac('sha256', (globalThis as Record<string, unknown>).__EF_CSRF_DEV_SECRET as string).update(sessionId).digest('hex')
  }
  return createHmac('sha256', key).update(sessionId).digest('hex')
}

/**
 * Validate CSRF token with timing-safe comparison
 */
export function validateCsrfToken(token: string, sessionId: string, secret?: string): boolean {
  const expected = generateCsrfToken(sessionId, secret)
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Detect spam patterns in content
 */
export function detectSpam(content: string): { isSpam: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length
  if (urlCount > 3) reasons.push('too_many_urls')

  // Check for repeated characters
  if (/(.)\1{10,}/.test(content)) reasons.push('repeated_characters')

  // Check for common spam phrases
  const spamPhrases = ['click here', 'free money', 'make money fast', 'nigerian prince', 'work from home']
  const lowerContent = content.toLowerCase()
  for (const phrase of spamPhrases) {
    if (lowerContent.includes(phrase)) {
      reasons.push('spam_phrase')
      break
    }
  }

  // Check for excessive capitalization
  const upperCount = (content.match(/[A-Z]/g) || []).length
  const alphaCount = (content.match(/[A-Za-z]/g) || []).length
  if (alphaCount > 10 && upperCount / alphaCount > 0.7) reasons.push('excessive_caps')

  // Check for very short message with links
  if (content.length < 30 && urlCount > 0) reasons.push('short_with_links')

  return { isSpam: reasons.length > 0, reasons }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  if (cfIp) return cfIp
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Verify Cloudflare Turnstile CAPTCHA token
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // In production, CAPTCHA must be configured
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] TURNSTILE_SECRET_KEY not set in production — CAPTCHA bypassed!')
      return false
    }
    // Dev-only: skip verification when not configured
    console.warn('[SECURITY] Turnstile secret not configured, skipping verification (dev only)')
    return true
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    return false
  }
}
