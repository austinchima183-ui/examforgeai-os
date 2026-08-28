// ============================================================================
// ExamForge AI — Security Headers Middleware
// ============================================================================
// Adds security headers to all responses:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 0 (modern approach)
// - Referrer-Policy: strict-origin-when-cross-origin
// - Permissions-Policy: camera=(), microphone=(), geolocation=()
// - Content-Security-Policy (from content-security.ts)
// - Strict-Transport-Security (in production)
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { generateCSP } from '@/lib/security/content-security'

// ──────────────────────────────────────────────────────────────
// Security Headers Configuration
// ──────────────────────────────────────────────────────────────

interface SecurityHeadersConfig {
  /** Whether to include CSP headers (default: true) */
  includeCSP?: boolean
  /** Whether to include HSTS header (default: true in production) */
  includeHSTS?: boolean
  /** HSTS max-age in seconds (default: 2 years) */
  hstsMaxAge?: number
  /** Whether to include HSTS subdomains flag */
  hstsIncludeSubDomains?: boolean
  /** Whether to include HSTS preload flag */
  hstsPreload?: boolean
  /** CSP report URI */
  cspReportUri?: string
  /** Additional CSP domains */
  cspAdditionalDomains?: {
    script?: string[]
    style?: string[]
    img?: string[]
    connect?: string[]
    font?: string[]
    frame?: string[]
  }
}

// ──────────────────────────────────────────────────────────────
// Security Headers Map
// ──────────────────────────────────────────────────────────────

/**
 * Get the standard security headers (excluding CSP and HSTS which are
 * environment-dependent).
 */
function getStandardSecurityHeaders(): Record<string, string> {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent framing (clickjacking protection)
    'X-Frame-Options': 'DENY',

    // Disable XSS filtering (modern approach — don't let the browser
    // try to "fix" XSS; handle it properly on the server instead)
    'X-XSS-Protection': '0',

    // Control referrer information sent with requests
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Restrict browser features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'document-domain=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'publickey-credentials-get=()',
      'sync-xhr=()',
      'wake-lock=()',
      'xr-spatial-tracking=()',
    ].join(', '),

    // Prevent cross-origin isolation issues
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}

/**
 * Get the HSTS header (production only).
 */
function getHSTSHeader(config: SecurityHeadersConfig = {}): Record<string, string> {
  const {
    hstsMaxAge = 63072000, // 2 years
    hstsIncludeSubDomains = true,
    hstsPreload = true,
  } = config

  let value = `max-age=${hstsMaxAge}`
  if (hstsIncludeSubDomains) value += '; includeSubDomains'
  if (hstsPreload) value += '; preload'

  return { 'Strict-Transport-Security': value }
}

// ──────────────────────────────────────────────────────────────
// Apply Security Headers
// ──────────────────────────────────────────────────────────────

/**
 * Apply security headers to a Next.js response.
 *
 * @param request - The incoming request
 * @param response - The response to add headers to
 * @param config - Security headers configuration
 * @returns The modified response with security headers
 *
 * @example
 * ```ts
 * // In middleware.ts:
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next()
 *   return applySecurityHeaders(request, response)
 * }
 * ```
 */
export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const env = process.env.NODE_ENV as 'development' | 'staging' | 'production'
  const isProduction = env === 'production'

  // Apply standard security headers
  const standardHeaders = getStandardSecurityHeaders()
  for (const [key, value] of Object.entries(standardHeaders)) {
    response.headers.set(key, value)
  }

  // Apply HSTS in production
  const includeHSTS = config.includeHSTS ?? isProduction
  if (includeHSTS && isProduction) {
    const hstsHeaders = getHSTSHeader(config)
    for (const [key, value] of Object.entries(hstsHeaders)) {
      response.headers.set(key, value)
    }
  }

  // Apply CSP
  const includeCSP = config.includeCSP ?? true
  if (includeCSP) {
    const cspResult = generateCSP(env, {
      reportOnly: env === 'staging',
      reportUri: config.cspReportUri ?? (isProduction ? '/api/csp-report' : undefined),
      additionalDomains: config.cspAdditionalDomains,
    })

    response.headers.set(cspResult.headerName, cspResult.headerValue)
    response.headers.set('X-CSP-Nonce', cspResult.nonce)

    // Store nonce for use in the page
    // (Accessible via request headers in server components)
    response.headers.set('x-nonce', cspResult.nonce)
  }

  // Cache control for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Don't cache API responses by default
    if (!response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }
  }

  return response
}

// ──────────────────────────────────────────────────────────────
// Security Headers Middleware Function
// ──────────────────────────────────────────────────────────────

/**
 * Next.js middleware function that adds security headers to all responses.
 *
 * Integrate this into your main middleware.ts:
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { securityHeadersMiddleware } from '@/middleware-security'
 *
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next()
 *   return securityHeadersMiddleware(request, response)
 * }
 * ```
 */
export function securityHeadersMiddleware(
  request: NextRequest,
  response?: NextResponse,
  config?: SecurityHeadersConfig
): NextResponse {
  const nextResponse = response ?? NextResponse.next()
  return applySecurityHeaders(request, nextResponse, config)
}

// ──────────────────────────────────────────────────────────────
// CSP Nonce Retrieval Helper
// ──────────────────────────────────────────────────────────────

/**
 * Get the CSP nonce from request headers.
 * Use this in server components to get the nonce for inline scripts.
 *
 * @param request - The incoming request
 * @returns The CSP nonce string, or empty string if not set
 *
 * @example
 * ```tsx
 * // In a server component:
 * export default function Page({ headers }: { headers: Headers }) {
 *   const nonce = getCSPNonce(headers)
 *   return (
 *     <script nonce={nonce}>
 *       {`console.log('hello')`}
 *     </script>
 *   )
 * }
 * ```
 */
export function getCSPNonce(headers: Headers): string {
  return headers.get('x-nonce') ?? ''
}

export type { SecurityHeadersConfig }
