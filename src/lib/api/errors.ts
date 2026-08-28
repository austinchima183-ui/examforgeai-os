// ============================================================================
// ExamForge AI — API Error Classes
// ============================================================================
// Structured error hierarchy for the application. Each error class
// includes an HTTP status code and a human-readable message. Used
// throughout the API layer for consistent error handling.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Base Error
// ──────────────────────────────────────────────────────────────

/**
 * Base application error class. All custom errors extend this class.
 * Includes an HTTP status code and a machine-readable error code.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Convert the error to a JSON-serializable object.
   */
  toJSON(): {
    name: string
    message: string
    code: string
    statusCode: number
    details?: Record<string, unknown>
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Authentication Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when authentication is required but not provided,
 * or when the provided credentials are invalid.
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication required',
    details?: Record<string, unknown>
  ) {
    super(message, 401, 'AUTH_ERROR', details)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when a user's email is not verified.
 */
export class EmailNotVerifiedError extends AppError {
  constructor(
    message: string = 'Email verification required',
    details?: Record<string, unknown>
  ) {
    super(message, 403, 'EMAIL_NOT_VERIFIED', details)
    this.name = 'EmailNotVerifiedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Authorization Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when the user does not have permission to perform
 * the requested action.
 */
export class PermissionError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    details?: Record<string, unknown>
  ) {
    super(message, 403, 'PERMISSION_ERROR', details)
    this.name = 'PermissionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Not Found Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when a requested resource is not found.
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    resource?: string,
    details?: Record<string, unknown>
  ) {
    super(
      resource ? `${resource} not found` : message,
      404,
      'NOT_FOUND',
      { ...details, resource }
    )
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Validation Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends AppError {
  readonly fields: Record<string, string[]>

  constructor(
    message: string = 'Validation failed',
    fields: Record<string, string[]> = {},
    details?: Record<string, unknown>
  ) {
    super(message, 422, 'VALIDATION_ERROR', { ...details, fields })
    this.name = 'ValidationError'
    this.fields = fields
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Network Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when a network request fails.
 */
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network request failed',
    details?: Record<string, unknown>
  ) {
    super(message, 0, 'NETWORK_ERROR', details)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Rate Limiting Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when the user has exceeded the rate limit.
 */
export class RateLimitError extends AppError {
  readonly retryAfter?: number

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', { ...details, retryAfter })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ──────────────────────────────────────────────────────────────
// Conflict Errors
// ──────────────────────────────────────────────────────────────

/**
 * Error thrown when a resource conflict occurs (e.g., duplicate entry).
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: Record<string, unknown>
  ) {
    super(message, 409, 'CONFLICT_ERROR', details)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
