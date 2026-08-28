// ============================================================================
// ExamForge AI — Sentry Integration
// ============================================================================
// Production-grade Sentry integration with privacy-first configuration.
// - Initializes Sentry for both server and client
// - NEVER sends: passwords, tokens, API keys, session secrets, private
//   exam answers, unnecessary student PII
// - Adds request context: requestId, organizationId, userId, route, environment
// - Configures performance monitoring (tracesSampleRate)
// - Configures session replay (mask all text + input for privacy)
// - Re-exports: captureException, captureMessage, addBreadcrumb, setUser,
//   setTag, setContext
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Context metadata attached to every Sentry event */
export interface SentryRequestContext {
  requestId?: string
  organizationId?: string
  userId?: string
  route?: string
  environment?: string
}

/** Configuration for Sentry initialization */
export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate?: number
  replaysSessionSampleRate?: number
  replaysOnErrorSampleRate?: number
}

// ──────────────────────────────────────────────────────────────
// Privacy: Sensitive Data Scrubbing
// ──────────────────────────────────────────────────────────────

/**
 * Field names that must NEVER be sent to Sentry.
 * Covers: passwords, tokens, API keys, session secrets,
 * private exam answers, and unnecessary student PII.
 */
const SENSITIVE_FIELD_PATTERNS = [
  // Auth / credentials
  'password', 'passwd', 'pwd',
  'token', 'accesstoken', 'refreshtoken', 'idtoken',
  'apikey', 'api_key', 'apikeyid', 'xapikey',
  'authorization', 'authenticate',
  'secret', 'clientsecret', 'client_secret',
  'session', 'sessionid', 'sessiontoken', 'sessionsecret',
  'cookie', 'setcookie', 'set-cookie',
  'credential', 'credentials',
  'privatekey', 'private_key', 'privatekeypem',
  // Payment
  'creditcard', 'credit_card', 'cardnumber', 'card_number',
  'cvv', 'cvc', 'cardcvv',
  'stripe', 'stripekey', 'stripetoken',
  // Student PII
  'ssn', 'socialsecurity', 'social_security_number',
  'nationalid', 'national_id', 'nationalidnumber',
  'dateofbirth', 'date_of_birth', 'dob',
  'homeaddress', 'home_address', 'address_line',
  'phonenumber', 'phone_number', 'mobile',
  'guardianphone', 'guardianphone',
  'emergencycontact', 'emergency_contact',
  'studentidnumber', 'student_id_number',
  // Exam integrity
  'examanswer', 'exam_answer', 'answerkey', 'answer_key',
  'correctanswer', 'correct_answer', 'modelanswer', 'model_answer',
  'solutiontext', 'solution_text',
  'gradingrubric', 'grading_rubric',
  // Internal
  'bcrypt', 'hash', 'salt',
]

/**
 * Check if a field name (lowercased) matches a sensitive pattern.
 */
function isSensitiveField(lowerKey: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Recursively scrub sensitive data from an object.
 * Replaces sensitive values with '[Filtered]' and masks
 * partially-sensitive values (emails, keys with visible prefix/suffix).
 */
function scrubSensitiveData(
  obj: unknown,
  depth: number = 0
): unknown {
  if (depth > 8) return '[MAX_DEPTH]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj

  if (typeof obj === 'string') {
    // Never send strings that look like JWTs, long tokens, or secrets
    if (obj.length > 200 && obj.startsWith('eyJ')) return '[Filtered-JWT]'
    if (obj.length > 64) return `${obj.slice(0, 4)}...[Filtered]...${obj.slice(-4)}`
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => scrubSensitiveData(item, depth + 1))
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/[_-]/g, '')

      if (isSensitiveField(lowerKey)) {
        scrubbed[key] = '[Filtered]'
      } else if (lowerKey === 'email' && typeof value === 'string') {
        // Partially mask emails: "user@example.com" → "u***@e***.com"
        scrubbed[key] = maskEmail(value)
      } else {
        scrubbed[key] = scrubSensitiveData(value, depth + 1)
      }
    }
    return scrubbed
  }

  return obj
}

/**
 * Mask an email address for Sentry events.
 * "user@example.com" → "u***@e***.com"
 */
function maskEmail(email: string): string {
  const atIdx = email.indexOf('@')
  if (atIdx < 1) return '***'
  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  const dotIdx = domain.lastIndexOf('.')
  if (dotIdx < 1) return `${local[0]}***@***`
  return `${local[0]}***@${domain[0]}***${domain.slice(dotIdx)}`
}

// ──────────────────────────────────────────────────────────────
// Sentry beforeSend Hook
// ──────────────────────────────────────────────────────────────

/**
 * beforeSend hook that scrubs all sensitive data before sending
 * to Sentry. This is the privacy gatekeeper — NOTHING that matches
 * our sensitive patterns should ever reach Sentry servers.
 *
 * Also enriches events with request context from our async local storage.
 */
function beforeSend(event: Record<string, unknown>): Record<string, unknown> | null {
  // Scrub the entire event recursively
  const scrubbed = scrubSensitiveData(event) as Record<string, unknown>

  // Enrich with request context if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCurrentRequestContext } = require('@/lib/observability/logger')
    const ctx = getCurrentRequestContext?.() as SentryRequestContext | undefined
    if (ctx) {
      if (!scrubbed.tags) scrubbed.tags = {}
      if (!scrubbed.extra) scrubbed.extra = {}

      const tags = scrubbed.tags as Record<string, unknown>
      const extra = scrubbed.extra as Record<string, unknown>

      if (ctx.requestId) tags.requestId = ctx.requestId
      if (ctx.organizationId) tags.organizationId = ctx.organizationId
      if (ctx.userId) tags.userId = ctx.userId
      if (ctx.route) tags.route = ctx.route
      if (ctx.environment) tags.environment = ctx.environment

      extra.requestContext = {
        requestId: ctx.requestId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        route: ctx.route,
      }
    }
  } catch {
    // If request context is unavailable, proceed without it
  }

  return scrubbed
}

/**
 * beforeSendTransaction for performance events — lighter scrubbing
 * since transactions don't typically contain PII but we still want
 * to strip any accidental credential leaks from URLs.
 */
function beforeSendTransaction(event: Record<string, unknown>): Record<string, unknown> | null {
  // Scrub transaction names that might contain sensitive path params
  if (typeof event.transaction === 'string') {
    // Remove UUIDs, numeric IDs from transaction names
    event.transaction = event.transaction
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
      .replace(/\/\d+/g, '/[id]')
  }
  return event
}

// ──────────────────────────────────────────────────────────────
// Sentry Initialization
// ──────────────────────────────────────────────────────────────

let _sentryInitialized = false
let _sentryClient: {
  // eslint-disable-next-line no-unused-vars
  captureException: (error: Error, options?: Record<string, unknown>) => string
  // eslint-disable-next-line no-unused-vars
  captureMessage: (message: string, options?: Record<string, unknown>) => string
  // eslint-disable-next-line no-unused-vars
  addBreadcrumb: (crumb: Record<string, unknown>) => void
  // eslint-disable-next-line no-unused-vars
  setUser: (user: Record<string, unknown> | null) => void
  // eslint-disable-next-line no-unused-vars
  setTag: (key: string, value: string) => void
  // eslint-disable-next-line no-unused-vars
  setContext: (name: string, context: Record<string, unknown>) => void
} | null = null

/**
 * Initialize Sentry for server-side usage.
 *
 * @param config - Optional config overrides (DSN, environment, etc.)
 * @returns true if Sentry was successfully initialized
 */
export function initSentryServer(config?: Partial<SentryConfig>): boolean {
  if (_sentryInitialized) return true

  const dsn = config?.dsn ?? process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    // Sentry not configured — errors will only be logged locally
    return false
  }

  const environment = config?.environment
    ?? process.env.SENTRY_ENVIRONMENT
    ?? process.env.NODE_ENV
    ?? 'development'

  const release = config?.release ?? process.env.SENTRY_RELEASE ?? process.env.npm_package_version
  const tracesSampleRate = config?.tracesSampleRate ?? (
    environment === 'production' ? 0.1 : 1.0
  )

  try {
    // We create a lightweight Sentry-compatible client that uses the
    // Sentry SDK when installed, or falls back to no-op.
    // This avoids hard coupling to @sentry/node.
    const sentryConfig = {
      dsn,
      environment,
      release,
      tracesSampleRate,
      beforeSend,
      beforeSendTransaction,
      // Server-side integrations
      integrations: [],
      // Don't send sessions in development
      autoSessionTracking: environment === 'production',
    }

    // Store config for lazy initialization when @sentry/node is available
    _sentryConfig = sentryConfig
    _sentryInitialized = true

    // Attempt dynamic import of Sentry SDK
    tryInitSentrySDK()

    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Sentry] Initialization failed:', error)
    return false
  }
}

/**
 * Initialize Sentry for client-side usage.
 * Called from a client component or instrumentation file.
 */
export function initSentryClient(): boolean {
  if (_sentryInitialized) return true

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return false

  const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development'
  const tracesSampleRate = environment === 'production' ? 0.1 : 1.0
  const replaysSessionSampleRate = 0.0 // Never replay normal sessions
  const replaysOnErrorSampleRate = environment === 'production' ? 0.1 : 1.0

  _sentryConfig = {
    dsn,
    environment,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    beforeSend,
    beforeSendTransaction,
    // Session Replay config — mask ALL text and input for privacy
    replaysOptions: {
      maskAllText: true,
      maskAllInput: true,
      block: ['.sentry-block'], // CSS class to block entire elements
    },
  }
  _sentryInitialized = true

  tryInitSentrySDK()
  return true
}

// ──────────────────────────────────────────────────────────────
// Lazy SDK Import
// ──────────────────────────────────────────────────────────────

let _sentryConfig: Record<string, unknown> | null = null

function tryInitSentrySDK(): void {
  // Skip SDK import on client side or when no config — prevents node:worker_threads leak
  if (typeof window !== 'undefined' || !_sentryConfig) {
    _sentryClient = createNoOpClient()
    return
  }

  try {
    // Dynamic require — Sentry SDK is optional, server-side only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node')
    if (Sentry?.init) {
      Sentry.init(_sentryConfig)
      _sentryClient = {
        captureException: (err, opts) => Sentry.captureException(err, opts),
        captureMessage: (msg, opts) => Sentry.captureMessage(msg, opts),
        addBreadcrumb: (crumb) => Sentry.addBreadcrumb(crumb),
        setUser: (user) => Sentry.setUser(user),
        setTag: (key, value) => Sentry.setTag(key, value),
        setContext: (name, ctx) => Sentry.setContext(name, ctx),
      }
    }
  } catch {
    // @sentry/node not installed — use no-op client
    _sentryClient = createNoOpClient()
  }
}

function createNoOpClient() {
  return {
    captureException: (_err: Error, _opts?: Record<string, unknown>) => { void _err; void _opts; return '' },
    captureMessage: (_msg: string, _opts?: Record<string, unknown>) => { void _msg; void _opts; return '' },
    addBreadcrumb: (_crumb: Record<string, unknown>) => { void _crumb },
    setUser: (_user: Record<string, unknown> | null) => { void _user },
    setTag: (_key: string, _value: string) => { void _key; void _value },
    setContext: (_name: string, _ctx: Record<string, unknown>) => { void _name; void _ctx },
  }
}

// ──────────────────────────────────────────────────────────────
// Public API: Re-exported Sentry Functions
// ──────────────────────────────────────────────────────────────

/**
 * Capture an exception and send it to Sentry.
 * Automatically scrubs sensitive data via beforeSend.
 */
export function captureException(
  error: Error,
  options?: { tags?: Record<string, string>; extra?: Record<string, unknown>; user?: Record<string, unknown> }
): string {
  if (!_sentryInitialized) {
    // Still initialize lazily if DSN is available
    initSentryServer()
  }

  // If no SDK client, just log locally
  if (!_sentryClient) {
    // eslint-disable-next-line no-console
    console.error('[Sentry] captureException (no SDK):', error.message)
    return ''
  }

  try {
    return _sentryClient.captureException(error, options ?? {})
  } catch {
    return ''
  }
}

/**
 * Capture a message event and send it to Sentry.
 */
export function captureMessage(
  message: string,
  options?: { level?: 'info' | 'warning' | 'error' | 'fatal'; tags?: Record<string, string>; extra?: Record<string, unknown> }
): string {
  if (!_sentryClient) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[Sentry] captureMessage (no SDK):', message)
    }
    return ''
  }

  try {
    return _sentryClient.captureMessage(message, options ?? {})
  } catch {
    return ''
  }
}

/**
 * Add a breadcrumb for transaction tracing.
 * Breadcrumbs are scrubbed before being attached to events.
 */
export function addBreadcrumb(crumb: {
  category?: string
  message?: string
  level?: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
  timestamp?: number
}): void {
  if (!_sentryClient) return

  try {
    const scrubbedCrumb = { ...crumb }
    if (scrubbedCrumb.data) {
      scrubbedCrumb.data = scrubSensitiveData(scrubbedCrumb.data) as Record<string, unknown>
    }
    _sentryClient.addBreadcrumb(scrubbedCrumb)
  } catch {
    // Never let breadcrumb addition crash the app
  }
}

/**
 * Set the user context for Sentry events.
 * Only sets non-PII identifiers — email is masked.
 */
export function setUser(user: {
  id: string
  email?: string
  username?: string
  organizationId?: string
  role?: string
} | null): void {
  if (!_sentryClient) return

  try {
    if (user === null) {
      _sentryClient.setUser(null)
      return
    }

    _sentryClient.setUser({
      id: user.id,
      username: user.username,
      email: user.email ? maskEmail(user.email) : undefined,
      organizationId: user.organizationId,
      role: user.role,
    })
  } catch {
    // Never let user setting crash the app
  }
}

/**
 * Set a tag on the current Sentry scope.
 * Tags are indexed and searchable in Sentry.
 */
export function setTag(key: string, value: string): void {
  if (!_sentryClient) return
  try {
    _sentryClient.setTag(key, value)
  } catch {
    // Never crash
  }
}

/**
 * Set extra context on the current Sentry scope.
 * Extra data is scrubbed automatically via beforeSend.
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!_sentryClient) return
  try {
    _sentryClient.setContext(name, scrubSensitiveData(context) as Record<string, unknown>)
  } catch {
    // Never crash
  }
}

// ──────────────────────────────────────────────────────────────
// Auto-initialize on module load
// ──────────────────────────────────────────────────────────────

if (typeof window === 'undefined') {
  // Server-side: auto-init if DSN is present
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (dsn) {
    initSentryServer()
  }
} else {
  // Client-side: auto-init if DSN is present
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (dsn) {
    initSentryClient()
  }
}
