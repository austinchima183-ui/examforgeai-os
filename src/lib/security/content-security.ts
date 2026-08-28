// ============================================================================
// ExamForge AI — Content Security Policy (CSP)
// ============================================================================
// Generates Content-Security-Policy headers for different environments:
// - Report-only mode for staging (monitors violations without blocking)
// - Strict mode for production (enforces policy)
// - Nonce generation for inline scripts/styles
// - Report URI configuration for violation monitoring
// ============================================================================

// Edge-compatible: Use Web Crypto API (available in Node, Browser, and Edge Runtime)
// No node:crypto import — it breaks Edge Runtime (middleware)

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type Environment = 'development' | 'staging' | 'production'

interface CSPDirective {
  name: string
  values: string[]
}

interface CSPConfig {
  /** Whether to use report-only mode (doesn't block, just reports) */
  reportOnly?: boolean
  /** URI to send violation reports to */
  reportUri?: string
  /** Nonce for inline scripts and styles */
  nonce?: string
  /** Additional domains to allow */
  additionalDomains?: {
    script?: string[]
    style?: string[]
    img?: string[]
    connect?: string[]
    font?: string[]
    frame?: string[]
    media?: string[]
    object?: string[]
  }
}

interface CSPResult {
  /** The CSP header value */
  headerValue: string
  /** The header name (Content-Security-Policy or Content-Security-Policy-Report-Only) */
  headerName: string
  /** The nonce used (if generated) */
  nonce: string
}

// ──────────────────────────────────────────────────────────────
// Nonce Generation
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographic nonce for use with inline scripts and styles.
 * The nonce must be base64-encoded and at least 128 bits (16 bytes).
 *
 * @param byteLength - Length of random bytes (default: 16 for 128-bit entropy)
 * @returns Base64-encoded nonce string
 *
 * @example
 * ```ts
 * const nonce = generateNonce()
 * // "dGhpcyBpcyBhIHJhbmRvbSBub25jZQ=="
 *
 * // Use in HTML:
 * <script nonce={nonce}>...</script>
 * <style nonce={nonce}>...</style>
 * ```
 */
export function generateNonce(byteLength: number = 16): string {
  // Web Crypto API — works in Edge Runtime, Node.js, and browsers
  const array = new Uint8Array(byteLength)
  crypto.getRandomValues(array)
  // Manual base64 encode (no Buffer, no btoa — fully Edge Runtime safe)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  for (let i = 0; i < array.length; i += 3) {
    const b1 = array[i]
    const b2 = i + 1 < array.length ? array[i + 1] : 0
    const b3 = i + 2 < array.length ? array[i + 2] : 0
    result += chars[b1 >> 2]
    result += chars[((b1 & 0x03) << 4) | (b2 >> 4)]
    result += i + 1 < array.length ? chars[((b2 & 0x0f) << 2) | (b3 >> 6)] : '='
    result += i + 2 < array.length ? chars[b3 & 0x3f] : '='
  }
  return result
}

// ──────────────────────────────────────────────────────────────
// Base CSP Directives
// ──────────────────────────────────────────────────────────────

function getBaseDirectives(
  env: Environment,
  nonce?: string,
  additionalDomains?: CSPConfig['additionalDomains']
): CSPDirective[] {
  const isDev = env === 'development'

  // Core application domains
  const selfOrigin = "'self'"
  const nonceSource = nonce ? `'nonce-${nonce}'` : ''

  // Scripts: self + specific trusted CDNs
  const scriptSrc = [
    selfOrigin,
    nonceSource,
    // Next.js dev tools
    ...(isDev ? ['http://localhost:3000'] : []),
    // Analytics (if used)
    'https://va.vercel.app',
    'https://events.vercel.app',
    // Vercel live
    'https://vercel.live',
    'https://vitals.vercel-insights.com',
    // Additional user-specified domains
    ...(additionalDomains?.script ?? []),
  ].filter(Boolean)

  // Styles: self + nonce + inline (Next.js requires some inline styles)
  const styleSrc = [
    selfOrigin,
    nonceSource,
    "'unsafe-inline'", // Next.js requires inline styles for CSS-in-JS
    // Additional
    ...(additionalDomains?.style ?? []),
  ].filter(Boolean)

  // Images
  const imgSrc = [
    selfOrigin,
    'data:', // Data URIs for inline images
    'blob:', // Blob URIs for dynamic content
    // Supabase storage (derived from NEXT_PUBLIC_SUPABASE_URL)
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [process.env.NEXT_PUBLIC_SUPABASE_URL] : []),
    // Vercel OG images
    'https://vercel.com',
    // Additional
    ...(additionalDomains?.img ?? []),
  ]

  // Connect (fetch, WebSocket, XMLHttpRequest)
  const connectSrc = [
    selfOrigin,
    // Supabase realtime & API (derived from NEXT_PUBLIC_SUPABASE_URL)
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [process.env.NEXT_PUBLIC_SUPABASE_URL] : []),
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?/, 'wss')] : []),
    // Vercel analytics
    'https://va.vercel.app',
    'https://events.vercel.app',
    'https://vitals.vercel-insights.com',
    // Development
    ...(isDev ? ['http://localhost:3000', 'ws://localhost:3000'] : []),
    // Additional
    ...(additionalDomains?.connect ?? []),
  ]

  // Fonts
  const fontSrc = [
    selfOrigin,
    'data:', // Base64-encoded fonts
    // Additional
    ...(additionalDomains?.font ?? []),
  ]

  // Frames
  const frameSrc = [
    'none',
    // Additional (e.g., Stripe, YouTube)
    ...(additionalDomains?.frame ?? []),
  ]

  // Media (audio/video)
  const mediaSrc = [
    selfOrigin,
    'blob:',
    ...(additionalDomains?.media ?? []),
  ]

  // Objects (Flash, Java, etc.)
  const objectSrc = [
    'none',
    ...(additionalDomains?.object ?? []),
  ]

  const directives: CSPDirective[] = [
    { name: 'default-src', values: [selfOrigin] },
    { name: 'script-src', values: scriptSrc },
    { name: 'style-src', values: styleSrc },
    { name: 'img-src', values: imgSrc },
    { name: 'connect-src', values: connectSrc },
    { name: 'font-src', values: fontSrc },
    { name: 'frame-src', values: frameSrc },
    { name: 'media-src', values: mediaSrc },
    { name: 'object-src', values: objectSrc },
    // Base URI: restrict to self
    { name: 'base-uri', values: [selfOrigin] },
    // Form actions: restrict to self
    { name: 'form-action', values: [selfOrigin] },
    // Frame ancestors: prevent framing (clickjacking protection)
    { name: 'frame-ancestors', values: ['none'] },
    // Navigate-to: restrict navigation targets
    { name: 'navigate-to', values: [selfOrigin] },
    // Require trusted types for DOM manipulation
    { name: 'require-trusted-types-for', values: ["'script'"] },
    // Upgrade insecure requests in production
    ...(env === 'production' ? [{ name: 'upgrade-insecure-requests', values: [] as string[] }] : []),
  ]

  return directives
}

// ──────────────────────────────────────────────────────────────
// CSP Builder
// ──────────────────────────────────────────────────────────────

/**
 * Build a CSP header value from directives.
 */
function buildCSPString(directives: CSPDirective[], reportUri?: string): string {
  const parts = directives
    .filter((d) => d.values.length > 0 || d.name === 'upgrade-insecure-requests')
    .map((d) => {
      if (d.values.length === 0) return d.name
      return `${d.name} ${d.values.join(' ')}`
    })

  if (reportUri) {
    parts.push(`report-uri ${reportUri}`)
  }

  return parts.join('; ')
}

// ──────────────────────────────────────────────────────────────
// Generate CSP
// ──────────────────────────────────────────────────────────────

/**
 * Generate Content Security Policy headers for the given environment.
 *
 * @param env - The deployment environment
 * @param config - Optional CSP configuration
 * @returns CSP result with header name, value, and nonce
 *
 * @example
 * ```ts
 * // Production (strict)
 * const csp = generateCSP('production', { reportUri: '/api/csp-report' })
 * // Sets: Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-xxx'; ...
 *
 * // Staging (report-only)
 * const csp = generateCSP('staging', { reportOnly: true, reportUri: '/api/csp-report' })
 * // Sets: Content-Security-Policy-Report-Only: ...
 *
 * // Development (relaxed)
 * const csp = generateCSP('development')
 * ```
 */
export function generateCSP(
  env: Environment,
  config: CSPConfig = {}
): CSPResult {
  const {
    reportOnly = env === 'staging',
    reportUri,
    additionalDomains,
  } = config

  // Generate nonce for inline scripts/styles
  const nonce = config.nonce ?? generateNonce()

  // Build directives
  const directives = getBaseDirectives(env, nonce, additionalDomains)

  // Build CSP string
  const headerValue = buildCSPString(directives, reportUri)

  // Choose header name based on mode
  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'

  return {
    headerValue,
    headerName,
    nonce,
  }
}

// ──────────────────────────────────────────────────────────────
// Convenience: CSP for Next.js API routes
// ──────────────────────────────────────────────────────────────

/**
 * Generate CSP headers as a Next.js Headers object.
 * Useful for setting in middleware or route handlers.
 *
 * @example
 * ```ts
 * // In middleware:
 * const cspHeaders = generateCSPHeaders('production')
 * const response = NextResponse.next()
 * for (const [key, value] of Object.entries(cspHeaders)) {
 *   response.headers.set(key, value)
 * }
 * ```
 */
export function generateCSPHeaders(
  env: Environment,
  config: CSPConfig = {}
): Record<string, string> {
  const { headerName, headerValue, nonce } = generateCSP(env, config)

  return {
    [headerName]: headerValue,
    'X-CSP-Nonce': nonce,
  }
}

// ──────────────────────────────────────────────────────────────
// CSP Report Handler Helper
// ──────────────────────────────────────────────────────────────

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    'blocked-uri': string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
    'status-code'?: number
  }
}

/**
 * Process a CSP violation report.
 * Call this from your /api/csp-report endpoint.
 *
 * @example
 * ```ts
 * // In /api/csp-report/route.ts:
 * export async function POST(request: Request) {
 *   const report = await request.json()
 *   handleCSPReport(report)
 *   return new Response(null, { status: 204 })
 * }
 * ```
 */
export function handleCSPReport(report: CSPViolationReport): void {
  const { 'csp-report': cspReport } = report

  // Log the violation (in production, send to monitoring service)
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn('[CSP Violation]', {
      violatedDirective: cspReport['violated-directive'],
      blockedUri: cspReport['blocked-uri'],
      documentUri: cspReport['document-uri'],
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
    })
  } else {
    // eslint-disable-next-line no-console
    console.debug('[CSP Violation - Dev]', cspReport)
  }
}

// ──────────────────────────────────────────────────────────────
// Security Headers Middleware Helper
// ──────────────────────────────────────────────────────────────

/**
 * Apply security headers (CSP, HSTS, etc.) to a Next.js response.
 * Designed for use in middleware.
 *
 * CSP NOTE: The middleware does NOT set a Content-Security-Policy here.
 * The per-request nonce generated by generateCSP() is never forwarded to
 * the Next.js page render, so a nonce-based CSP would block the framework's
 * inline hydration scripts and blank out every protected page (multiple CSP
 * headers intersect; a nonce disables 'unsafe-inline').
 * The authoritative CSP is the one configured in next.config.ts headers(),
 * which already covers script/style/font/img/connect sources and works with
 * Next.js's rendering model. Only the non-CSP hardening headers are applied
 * here to avoid conflicting with it.
 */
export function applySecurityHeaders(response: { headers: { set: (key: string, value: string) => void } }): void {
  // Additional security headers (non-CSP — see note above)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // Deprecated but added for legacy browsers
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}

export type { CSPConfig, CSPResult, CSPDirective, CSPViolationReport, Environment }
