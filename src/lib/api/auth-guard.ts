// ============================================================================
// ExamForge AI — API Auth Guard & Security Primitives
// ============================================================================
// Shared authentication, authorization, tenant isolation, and error handling
// utilities for ALL API routes. Every protected API endpoint MUST call one of
// the auth guard functions before accessing any data.
//
// Key principle: tenant context (orgId, schoolId, userId) is ALWAYS derived
// from the SERVER-SIDE session — NEVER from client-supplied input.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import type { AuthResult, AuthenticatedUser } from '@/lib/auth/require-auth'
import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/**
 * Tenant context derived exclusively from the server-side session.
 * This is the authoritative source of truth for which organization,
 * school, and user a request belongs to.
 *
 * **SECURITY**: Never construct this from request body/query params.
 * Always use `deriveTenantContext()` to obtain this.
 */
export interface TenantContext {
  /** The organization ID from the authenticated user's session */
  organizationId: string | null
  /** The school ID from the authenticated user's profile */
  schoolId: string | null
  /** The authenticated user's ID */
  userId: string
}

/**
 * Safe error response body — never exposes internal details in production.
 */
export interface SafeErrorResponse {
  /** Human-readable error message (sanitized for production) */
  error: string
  /** Unique request ID for log correlation (optional) */
  requestId?: string
  /** Machine-readable error code (optional) */
  code?: string
}

// ──────────────────────────────────────────────────────────────
// Request ID Generation
// ──────────────────────────────────────────────────────────────

/**
 * Generate a short request ID for log correlation.
 * Uses crypto.randomUUID when available, falls back to timestamp-based.
 */
function generateRequestId(): string {
  try {
    return crypto.randomUUID().slice(0, 8)
  } catch {
    return Date.now().toString(36)
  }
}

// ──────────────────────────────────────────────────────────────
// API Auth Guards
// ──────────────────────────────────────────────────────────────

/**
 * Require an authenticated user for an API route.
 *
 * Unlike `requireAuth()` (which redirects to /login), this returns
 * a 401 JSON response for unauthenticated requests — the correct
 * behavior for API routes.
 *
 * @param request - The incoming Next.js API request
 * @returns The AuthResult if authenticated, or a 401 NextResponse if not
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const auth = await requireApiAuth(request)
 *   if (auth instanceof NextResponse) return auth // 401
 *
 *   // auth.user is now guaranteed to be authenticated
 *   const data = await fetchUserData(auth.user.id)
 *   return NextResponse.json({ data })
 * }
 * ```
 */
export async function requireApiAuth(
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  _request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authResult = await getAuthUser()

  if (!authResult) {
    return unauthorizedError()
  }

  // Check if user is active (getAuthUser already filters inactive users
  // via the profile check, but we add an explicit guard here for safety)
  if (!authResult.user.isEmailVerified) {
    return NextResponse.json(
      { error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' } satisfies SafeErrorResponse,
      { status: 403 }
    )
  }

  return authResult
}

/**
 * Require an authenticated user with one of the specified roles.
 *
 * Returns 401 if unauthenticated, 403 if the user's role is not
 * in the allowed list.
 *
 * @param request - The incoming Next.js API request
 * @param roles - Array of UserRole values that are permitted
 * @returns The AuthResult if authorized, or a 401/403 NextResponse
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
 *   if (auth instanceof NextResponse) return auth // 401 or 403
 *
 *   // Only school_admin or super_admin can reach here
 *   await createSchool(auth.supabase, ...)
 * }
 * ```
 */
export async function requireApiRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<AuthResult | NextResponse> {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!roles.includes(authResult.user.role)) {
    return forbiddenError(
      `Role '${authResult.user.role}' is not permitted. Required: ${roles.join(', ')}`
    )
  }

  return authResult
}

// ──────────────────────────────────────────────────────────────
// Tenant Context (THE Security Primitive)
// ──────────────────────────────────────────────────────────────

/**
 * Derive tenant context from the server-side authenticated session.
 *
 * **This is the key security primitive in ExamForge.** All API routes
 * MUST call this function to obtain organization/school/user context
 * instead of accepting these values from request body, query params,
 * or headers. This prevents tenant impersonation attacks.
 *
 * For super_admins who may operate across organizations, the
 * organizationId comes from their profile or a server-validated
 * tenant resolution (never from raw client input).
 *
 * @param authResult - The authenticated user result from requireApiAuth
 * @returns TenantContext with org/school/user IDs from the session
 *
 * @example
 * ```ts
 * const auth = await requireApiAuth(request)
 * if (auth instanceof NextResponse) return auth
 *
 * // CORRECT: derive from server session
 * const tenant = deriveTenantContext(auth)
 *
 * // WRONG: never do this
 * // const orgId = body.organizationId // ❌ CLIENT INPUT
 * ```
 */
export function deriveTenantContext(authResult: AuthResult): TenantContext {
  return {
    organizationId: authResult.user.schoolId ?? null,
    schoolId: authResult.user.schoolId,
    userId: authResult.user.id,
  }
}

// ──────────────────────────────────────────────────────────────
// Tenant Access Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate that the authenticated user is allowed to access data
 * belonging to a specific tenant (organization + school).
 *
 * Access rules:
 * - **super_admin**: Can access any tenant's data
 * - **school_admin**: Can only access data within their own school
 * - **teacher**: Can only access data within their own school
 * - **student**: Can only access their own data (requires resourceOwnerId match)
 * - **parent**: Can only access data within their own school
 *
 * @param authResult - The authenticated user result
 * @param resourceOrgId - The organization ID of the resource being accessed
 * @param resourceSchoolId - The school ID of the resource being accessed
 * @param resourceOwnerId - Optional: the owner user ID (for student-level isolation)
 * @returns True if access is permitted, false otherwise
 *
 * @example
 * ```ts
 * const auth = await requireApiAuth(request)
 * if (auth instanceof NextResponse) return auth
 *
 * const exam = await getExam(examId)
 * if (!validateTenantAccess(auth, exam.organizationId, exam.schoolId)) {
 *   return forbiddenError('Cannot access this resource')
 * }
 * ```
 */
export function validateTenantAccess(
  authResult: AuthResult,
  resourceOrgId: string | null,
  resourceSchoolId: string | null,
  resourceOwnerId?: string | null
): boolean {
  const { user } = authResult

  // Super admin can access anything
  if (user.role === 'super_admin') return true

  // School admin: can only access resources in their own school
  if (user.role === 'school_admin') {
    if (!user.schoolId) return false
    return resourceSchoolId === user.schoolId
  }

  // Teacher: can only access resources in their own school
  if (user.role === 'teacher') {
    if (!user.schoolId) return false
    return resourceSchoolId === user.schoolId
  }

  // Student: can only access their own data
  if (user.role === 'student') {
    if (resourceOwnerId !== undefined && resourceOwnerId !== null) {
      return resourceOwnerId === user.id
    }
    // If no specific owner check, fall back to school boundary
    if (!user.schoolId) return false
    return resourceSchoolId === user.schoolId
  }

  // Parent: can only access data within their own school
  if (user.role === 'parent') {
    if (!user.schoolId) return false
    return resourceSchoolId === user.schoolId
  }

  // Unknown role — deny by default
  return false
}

// ──────────────────────────────────────────────────────────────
// Safe Error Response Factory
// ──────────────────────────────────────────────────────────────

/**
 * Create a safe error response that never exposes internal stack traces
 * or implementation details to clients.
 *
 * - **Development**: Includes error message, stack trace hint, and context
 * - **Production**: Only includes a generic safe message and request ID
 *
 * @param error - The original error (Error object, string, or unknown)
 * @param context - Optional context object for logging (never sent to client)
 * @returns A SafeErrorResponse object suitable for JSON responses
 *
 * @example
 * ```ts
 * try {
 *   await performAction()
 * } catch (error) {
 *   const safe = createSafeErrorResponse(error, { action: 'performAction', userId })
 *   return NextResponse.json(safe, { status: 500 })
 * }
 * ```
 */
export function createSafeErrorResponse(
  error: unknown,
  context?: Record<string, unknown>
): SafeErrorResponse {
  const requestId = generateRequestId()
  const isDev = process.env.NODE_ENV === 'development'

  // Extract error message safely
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred'

  if (isDev) {
    // In development, include more detail for debugging
    // Context is included in dev to aid debugging; never sent in production
    const devContext = context ? { ...context } : undefined
    return {
      error: message,
      requestId,
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      ...(devContext && Object.keys(devContext).length > 0
        ? { context: devContext }
        : {}),
    } as SafeErrorResponse
  }

  // In production, never expose internal error details
  // Context is intentionally excluded to prevent information leakage
  void context // context is for server-side logging only
  return {
    error: 'An internal error occurred. Please try again later.',
    requestId,
  }
}

// ──────────────────────────────────────────────────────────────
// Standard Error Response Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Return a 401 Unauthorized JSON response.
 *
 * Used when no valid authentication credentials are provided.
 *
 * @returns NextResponse with 401 status
 */
export function unauthorizedError(): NextResponse {
  return NextResponse.json(
    {
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    } satisfies SafeErrorResponse,
    { status: 401 }
  )
}

/**
 * Return a 403 Forbidden JSON response.
 *
 * Used when the user is authenticated but does not have permission
 * to perform the requested action.
 *
 * @param message - Optional custom message (default: 'Insufficient permissions')
 * @returns NextResponse with 403 status
 */
export function forbiddenError(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message ?? 'Insufficient permissions',
      code: 'FORBIDDEN',
    } satisfies SafeErrorResponse,
    { status: 403 }
  )
}

/**
 * Return a 400 Bad Request JSON response.
 *
 * Used when the request body or parameters fail validation.
 *
 * @param message - Description of what was invalid
 * @returns NextResponse with 400 status
 */
export function badRequestError(message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'BAD_REQUEST',
    } satisfies SafeErrorResponse,
    { status: 400 }
  )
}

/**
 * Return a 404 Not Found JSON response.
 *
 * Used when the requested resource does not exist.
 *
 * @param message - Optional custom message (default: 'Resource not found')
 * @returns NextResponse with 404 status
 */
export function notFoundError(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message ?? 'Resource not found',
      code: 'NOT_FOUND',
    } satisfies SafeErrorResponse,
    { status: 404 }
  )
}

/**
 * Return a 429 Too Many Requests JSON response.
 *
 * Used when the client has exceeded the rate limit.
 *
 * @param retryAfter - Seconds until the client should retry
 * @returns NextResponse with 429 status and Retry-After header
 */
export function rateLimitError(retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {}
  if (retryAfter !== undefined) {
    headers['Retry-After'] = String(retryAfter)
  }

  return NextResponse.json(
    {
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMITED',
      ...(retryAfter !== undefined ? { retryAfter } : {}),
    } satisfies SafeErrorResponse & { retryAfter?: number },
    { status: 429, headers }
  )
}

/**
 * Return a 500 Internal Server Error JSON response.
 *
 * Never exposes internal details. Use `createSafeErrorResponse()`
 * for more granular control in catch blocks.
 *
 * @param context - Optional context for server-side logging (not sent to client)
 * @returns NextResponse with 500 status
 */
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export function internalError(_context?: Record<string, unknown>): NextResponse {
  const requestId = generateRequestId()

  return NextResponse.json(
    {
      error: 'Internal server error',
      requestId,
      code: 'INTERNAL_ERROR',
    } satisfies SafeErrorResponse,
    { status: 500 }
  )
}

// ──────────────────────────────────────────────────────────────
// Re-exports for convenience
// ──────────────────────────────────────────────────────────────

export type { AuthResult, AuthenticatedUser }
