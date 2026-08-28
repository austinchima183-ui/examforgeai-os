// ============================================================================
// ExamForge AI — Pino-Style Structured Logger
// ============================================================================
// Production-grade structured logging with automatic redaction.
// - Levels: debug, info, warn, error, fatal
// - Always includes: timestamp, level, requestId, userId, organizationId,
//   route, environment
// - Redaction: automatically redact patterns like password, token, secret,
//   apiKey, authorization, cookie, session
// - Production: JSON output. Development: pretty print.
// - createLogger(component) returns a child logger with component tag
// ============================================================================

// Client-safe: AsyncLocalStorage is Node-only, use conditional import
let AsyncLocalStorageClass: typeof import('async_hooks').AsyncLocalStorage<any> | null = null
try {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AsyncLocalStorageClass = require('async_hooks').AsyncLocalStorage
  }
} catch {
  // Not available in this runtime
}

// Polyfill for client side: a no-op store
class NoOpAsyncLocalStorage<T> {
  getStore(): T | undefined { return undefined }
  run(_store: T, callback: () => void): void { callback() }
}

const AsyncLocalStorage = AsyncLocalStorageClass ?? NoOpAsyncLocalStorage

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  requestId?: string
  userId?: string
  organizationId?: string
  route?: string
  environment?: string
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  component?: string
  requestId?: string
  userId?: string
  organizationId?: string
  route?: string
  environment?: string
  duration?: number
  statusCode?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  [key: string]: unknown
}

/* eslint-disable no-unused-vars */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void
  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>): void
  child(component: string): Logger
  request(message: string, context: {
    route: string
    duration: number
    statusCode: number
    method?: string
    [key: string]: unknown
  }): void
  security(message: string, context?: Record<string, unknown>): void
  auth(message: string, context?: Record<string, unknown>): void
}
/* eslint-enable no-unused-vars */

// ──────────────────────────────────────────────────────────────
// Redaction: Sensitive Field Patterns
// ──────────────────────────────────────────────────────────────

/**
 * Regex patterns for field names that must be fully redacted.
 * Any key matching these patterns will have its value replaced with '[Redacted]'.
 */
const REDACTION_PATTERNS = [
  /password/i,
  /passwd/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /private.?key/i,
  /access.?key/i,
  /salt/i,
  /hash/i,
  /cvv/i,
  /card.?number/i,
  /credit.?card/i,
  /ssn/i,
  /social.?security/i,
  /national.?id/i,
  /exam.?answer/i,
  /answer.?key/i,
  /correct.?answer/i,
  /grading.?rubric/i,
]

/**
 * Check if a field name should be redacted.
 */
function shouldRedact(key: string): boolean {
  return REDACTION_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * Recursively redact sensitive data from a context object.
 * Unlike the basic logger, this uses regex patterns for broader matching
 * and supports nested objects up to depth 6.
 */
function redact(obj: unknown, depth: number = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj

  if (typeof obj === 'string') {
    // Redact long strings that look like tokens/JWTs
    if (obj.length > 200 && obj.startsWith('eyJ')) return '[Redacted-JWT]'
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, depth + 1))
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (shouldRedact(key)) {
        result[key] = '[Redacted]'
      } else if (key.toLowerCase() === 'email' && typeof value === 'string') {
        // Partially mask emails
        result[key] = maskEmail(value)
      } else {
        result[key] = redact(value, depth + 1)
      }
    }
    return result
  }

  return obj
}

/**
 * Mask an email for log output.
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
// Request Context (Async Local Storage)
// ──────────────────────────────────────────────────────────────

interface RequestContext {
  requestId: string
  organizationId?: string
  userId?: string
  route?: string
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Run a callback with request context attached to all log entries.
 */
export function withRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  // AsyncLocalStorage.run() returns void in some typings but actually returns
  // the callback's return value. Cast to T for ergonomics.
  return requestContextStorage.run(context, fn) as unknown as T
}

/**
 * Update the current request context (e.g., after auth resolves).
 */
export function updateRequestContext(updates: Partial<RequestContext>): void {
  const store = requestContextStorage.getStore()
  if (store) {
    Object.assign(store, updates)
  }
}

/**
 * Get the current request context (used by Sentry beforeSend).
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}

/**
 * Get the current request ID for correlation.
 */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId
}

// ──────────────────────────────────────────────────────────────
// Pretty Print (Development)
// ──────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  fatal: '\x1b[35m',  // magenta
}
const RESET = '\x1b[0m'

function prettyFormat(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level]
  const level = entry.level.toUpperCase().padEnd(5)
  const time = entry.timestamp
  const component = entry.component ? ` [${entry.component}]` : ''
  const reqId = entry.requestId ? ` [${entry.requestId.slice(0, 8)}]` : ''
  const orgId = entry.organizationId ? ` org:${entry.organizationId.slice(0, 8)}` : ''
  const userId = entry.userId ? ` user:${entry.userId.slice(0, 8)}` : ''
  const route = entry.route ? ` ${entry.route}` : ''
  const duration = entry.duration != null ? ` ${entry.duration}ms` : ''
  const status = entry.statusCode != null ? ` ${entry.statusCode}` : ''
  const errorPart = entry.error ? ` | ${entry.error.name}: ${entry.error.message}` : ''

  // Build extra context (excluding known fields)
  const knownKeys = new Set([
    'level', 'message', 'timestamp', 'component', 'requestId',
    'userId', 'organizationId', 'route', 'environment', 'duration',
    'statusCode', 'error',
  ])
  const extras: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(entry)) {
    if (!knownKeys.has(k) && v !== undefined) {
      extras[k] = v
    }
  }
  const extraStr = Object.keys(extras).length > 0 ? ` ${JSON.stringify(extras)}` : ''

  return `${color}[${level}]${RESET} ${time}${component}${reqId}${orgId}${userId}${route} ${entry.message}${duration}${status}${errorPart}${extraStr}`
}

// ──────────────────────────────────────────────────────────────
// Level Priority
// ──────────────────────────────────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

/**
 * Minimum log level. Configurable via LOG_LEVEL env var.
 * Defaults to 'debug' in development, 'info' in production.
 */
const minLevel: LogLevel = (() => {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (envLevel && envLevel in LEVEL_PRIORITY) return envLevel
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
})()

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel]
}

// ──────────────────────────────────────────────────────────────
// Console Method Mapping
// ──────────────────────────────────────────────────────────────

function consoleWrite(level: LogLevel, formatted: string, entry: LogEntry): void {
  void entry // entry is used for JSON output in production mode
  switch (level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(formatted)
      break
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formatted)
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(formatted)
      break
    case 'error':
    case 'fatal':
      // eslint-disable-next-line no-console
      console.error(formatted)
      break
  }

  // In production, also output the raw JSON for log aggregation
  if (process.env.NODE_ENV === 'production' && level !== 'debug') {
    // JSON is already output via formatLogEntry below
    void entry // entry is used for JSON output in formatLogEntry
  }
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry)
  }
  return prettyFormat(entry)
}

// ──────────────────────────────────────────────────────────────
// Logger Implementation
// ──────────────────────────────────────────────────────────────

const environment = process.env.NODE_ENV ?? 'development'

function createLogEntry(
  level: LogLevel,
  message: string,
  component: string | undefined,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  // Get request context from async local storage
  const reqCtx = getCurrentRequestContext()

  // Build the base entry
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment,
    component,
    requestId: reqCtx?.requestId,
    organizationId: reqCtx?.organizationId,
    userId: reqCtx?.userId,
    route: reqCtx?.route,
  }

  // Add error details
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  // Add and redact context
  if (context) {
    const redacted = redact(context) as Record<string, unknown>
    for (const [key, value] of Object.entries(redacted)) {
      if (value !== undefined) {
        entry[key] = value
      }
    }
  }

  return entry
}

function writeLog(level: LogLevel, entry: LogEntry): void {
  if (!shouldLog(level)) return
  const formatted = formatLogEntry(entry)
  consoleWrite(level, formatted, entry)
}

/**
 * Create a structured logger instance for a specific component.
 *
 * @param component - Component name (e.g., 'api', 'auth', 'db', 'ai')
 * @returns Logger instance with component tag
 *
 * @example
 * ```ts
 * const log = createLogger('api:exams')
 * log.info('Exam created', { examId, questionCount: 25 })
 * log.error('Failed to generate exam', err, { examId })
 * ```
 */
export function createLogger(component: string): Logger {
  return {
    debug(message: string, context?: Record<string, unknown>) {
      const entry = createLogEntry('debug', message, component, context)
      writeLog('debug', entry)
    },

    info(message: string, context?: Record<string, unknown>) {
      const entry = createLogEntry('info', message, component, context)
      writeLog('info', entry)
    },

    warn(message: string, context?: Record<string, unknown>) {
      const entry = createLogEntry('warn', message, component, context)
      writeLog('warn', entry)
    },

    error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
      const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined
      const entry = createLogEntry('error', message, component, context, err)
      writeLog('error', entry)

      // Also report to Sentry
      if (err) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { captureException } = require('./sentry')
          captureException(err, { extra: { component, ...context } })
        } catch {
          // Sentry not available
        }
      }
    },

    fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
      const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined
      const entry = createLogEntry('fatal', message, component, context, err)
      writeLog('fatal', entry)

      // Fatal errors ALWAYS go to Sentry
      if (err) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { captureException } = require('./sentry')
          captureException(err, { extra: { component, fatal: true, ...context } })
        } catch {
          // Sentry not available
        }
      }

      // In production, fatal errors may warrant process exit
      // (handled by the caller, not the logger)
    },

    child(subComponent: string): Logger {
      return createLogger(`${component}:${subComponent}`)
    },

    request(message: string, context: {
      route: string
      duration: number
      statusCode: number
      method?: string
      [key: string]: unknown
    }) {
      const level: LogLevel = context.statusCode >= 500
        ? 'error'
        : context.statusCode >= 400
          ? 'warn'
          : 'info'

      const entry = createLogEntry(level, message, component, {
        ...context,
        duration: context.duration,
        statusCode: context.statusCode,
      })
      entry.route = context.route
      entry.duration = context.duration
      entry.statusCode = context.statusCode
      writeLog(level, entry)
    },

    security(message: string, context?: Record<string, unknown>) {
      const entry = createLogEntry('warn', `[SECURITY] ${message}`, component, context)
      writeLog('warn', entry)
    },

    auth(message: string, context?: Record<string, unknown>) {
      const entry = createLogEntry('info', `[AUTH] ${message}`, component, context)
      writeLog('info', entry)
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Default Root Logger
// ──────────────────────────────────────────────────────────────

/**
 * Root logger for the application. Use `createLogger('component')`
 * for component-specific loggers.
 */
export const logger: Logger = createLogger('app')
