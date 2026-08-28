// ============================================================================
// ExamForge AI — API Input Validation Utilities
// ============================================================================
// Generic Zod-based validation helpers, pagination/sort parsing, UUID
// validation, and string sanitization. Every API route MUST validate its
// inputs through these utilities before processing — never trust raw
// client data.
// ============================================================================

import { NextResponse } from 'next/server'
import { z, type ZodSchema } from 'zod'

// ──────────────────────────────────────────────────────────────
// Common Schemas
// ──────────────────────────────────────────────────────────────

/**
 * UUID v4 validation schema.
 * Used for all entity IDs in the system.
 *
 * @example
 * ```ts
 * const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
 * // result.success === true
 * ```
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Pagination schema with safe defaults and bounds.
 * - page: 1-based, minimum 1, default 1
 * - limit: minimum 1, maximum 100, default 20
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Sort order enum — only 'asc' or 'desc' are valid.
 */
export const sortOrderEnum = z.enum(['asc', 'desc'])

/**
 * Organization ID schema — UUID format.
 *
 * **SECURITY NOTE**: When accepting an organization ID from the client,
 * you MUST still validate server-side that the authenticated user has
 * access to this organization. This schema only validates the FORMAT,
 * not the AUTHORIZATION.
 */
export const organizationIdSchema = z.string().uuid('Invalid organization ID format')

/**
 * School ID schema — UUID format.
 *
 * **SECURITY NOTE**: Same as organizationIdSchema — validates format only.
 * Always verify tenant access after parsing.
 */
export const schoolIdSchema = z.string().uuid('Invalid school ID format')

// ──────────────────────────────────────────────────────────────
// Generic Input Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate arbitrary input against a Zod schema.
 *
 * Returns the parsed (and potentially transformed) data on success,
 * or a 400 NextResponse with structured error details on failure.
 *
 * @typeParam T - The expected output type of the schema
 * @param schema - Any Zod schema to validate against
 * @param data - The raw input data to validate
 * @returns Object with `data` on success, or `error` (NextResponse 400) on failure
 *
 * @example
 * ```ts
 * const CreateExamSchema = z.object({
 *   title: z.string().min(1).max(200),
 *   schoolId: z.string().uuid(),
 *   durationMinutes: z.number().int().min(1).max(600),
 * })
 *
 * const result = validateInput(CreateExamSchema, body)
 * if ('error' in result) return result.error // 400 response
 *
 * // result.data is now fully typed as { title: string; schoolId: string; durationMinutes: number }
 * await createExam(result.data)
 * ```
 */
// ──────────────────────────────────────────────────────────────
// Safe JSON Body Parsing
// ──────────────────────────────────────────────────────────────

/**
 * Safely parse a JSON request body.
 * Returns a 400 NextResponse when the payload is not valid JSON —
 * NEVER a 500. Malformed JSON is a client error, not a server error.
 *
 * @example
 * ```ts
 * const bodyResult = await parseJsonBody(request)
 * if (bodyResult instanceof NextResponse) return bodyResult
 * const rawBody = bodyResult.data
 * ```
 */
export async function parseJsonBody(
  request: Request
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const data = await request.json()
    return { data }
  } catch {
    return {
      error: NextResponse.json(
        {
          error: 'Invalid JSON body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      ),
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Core Validation
// ──────────────────────────────────────────────────────────────

export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown
): { data: T } | { error: NextResponse } {
  const parsed = schema.safeParse(data)

  if (parsed.success) {
    return { data: parsed.data }
  }

  // Format Zod errors into a flat field-errors map
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of parsed.error.issues) {
    const fieldPath = issue.path.join('.') || '_root'
    if (!fieldErrors[fieldPath]) {
      fieldErrors[fieldPath] = []
    }
    fieldErrors[fieldPath].push(issue.message)
  }

  return {
    error: NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        fields: fieldErrors,
      },
      { status: 400 }
    ),
  }
}

// ──────────────────────────────────────────────────────────────
// Pagination Validation
// ──────────────────────────────────────────────────────────────

/** Maximum allowed limit for pagination */
const MAX_LIMIT = 100

/** Default limit when not specified */
const DEFAULT_LIMIT = 20

/** Default page when not specified */
const DEFAULT_PAGE = 1

/**
 * Parse and validate pagination parameters from URL search params.
 *
 * Applies safe defaults and enforces bounds:
 * - `page`: 1-based, coerced to integer, minimum 1, default 1
 * - `limit`: coerced to integer, minimum 1, maximum 100, default 20
 * - `offset`: computed as `(page - 1) * limit`
 *
 * @param searchParams - The URLSearchParams from the request URL
 * @returns Validated pagination with page, limit, and computed offset
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { page, limit, offset } = validatePagination(request.nextUrl.searchParams)
 *   const exams = await db.exam.findMany({ skip: offset, take: limit })
 *   return NextResponse.json({ data: exams, page, limit })
 * }
 * ```
 */
export function validatePagination(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  let page = DEFAULT_PAGE
  let limit = DEFAULT_LIMIT

  const pageParam = searchParams.get('page')
  if (pageParam !== null) {
    const parsed = Number(pageParam)
    if (Number.isFinite(parsed) && parsed >= 1) {
      page = Math.floor(parsed)
    }
  }

  const limitParam = searchParams.get('limit')
  if (limitParam !== null) {
    const parsed = Number(limitParam)
    if (Number.isFinite(parsed) && parsed >= 1) {
      limit = Math.min(Math.floor(parsed), MAX_LIMIT)
    }
  }

  const offset = (page - 1) * limit

  return { page, limit, offset }
}

// ──────────────────────────────────────────────────────────────
// UUID ID Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate that a string is a valid UUID format.
 *
 * Returns the validated UUID string on success, or a 400 NextResponse
 * on failure. Use this for path parameters and any ID that must be UUID.
 *
 * @param id - The raw ID string to validate
 * @param fieldName - Optional field name for error messages (default: 'id')
 * @returns Object with `data` on success, or `error` (NextResponse 400) on failure
 *
 * @example
 * ```ts
 * const idResult = validateId(params.id, 'examId')
 * if ('error' in idResult) return idResult.error // 400
 *
 * const exam = await getExam(idResult.data)
 * ```
 */
export function validateId(
  id: string,
  fieldName: string = 'id'
): { data: string } | { error: NextResponse } {
  const parsed = uuidSchema.safeParse(id)

  if (parsed.success) {
    return { data: parsed.data }
  }

  return {
    error: NextResponse.json(
      {
        error: `Invalid ${fieldName}: must be a valid UUID`,
        code: 'VALIDATION_ERROR',
        fields: { [fieldName]: ['Invalid UUID format'] },
      },
      { status: 400 }
    ),
  }
}

// ──────────────────────────────────────────────────────────────
// Sort Validation
// ──────────────────────────────────────────────────────────────

/**
 * Parse and validate sort parameters from URL search params.
 *
 * Validates that the `sortBy` field is in the allowed list and that
 * `sortOrder` is either 'asc' or 'desc'. Returns safe defaults if
 * parameters are missing or invalid.
 *
 * @param searchParams - The URLSearchParams from the request URL
 * @param allowedFields - Whitelist of field names that can be sorted on
 * @returns Validated sort parameters with sortBy and sortOrder
 *
 * @example
 * ```ts
 * const { sortBy, sortOrder } = validateSort(
 *   request.nextUrl.searchParams,
 *   ['createdAt', 'title', 'durationMinutes']
 * )
 * // sortBy: 'createdAt' | 'title' | 'durationMinutes'
 * // sortOrder: 'asc' | 'desc'
 *
 * const exams = await db.exam.findMany({
 *   orderBy: { [sortBy]: sortOrder },
 * })
 * ```
 */
export function validateSort(
  searchParams: URLSearchParams,
  allowedFields: string[]
): {
  sortBy: string
  sortOrder: 'asc' | 'desc'
} {
  const sortByParam = searchParams.get('sortBy')
  const sortOrderParam = searchParams.get('sortOrder')

  // Validate sortBy against allowed fields
  const sortBy =
    sortByParam !== null && allowedFields.includes(sortByParam)
      ? sortByParam
      : allowedFields[0] ?? 'createdAt'

  // Validate sortOrder
  const sortOrder: 'asc' | 'desc' =
    sortOrderParam === 'asc' || sortOrderParam === 'desc'
      ? sortOrderParam
      : 'desc' // default to newest first

  return { sortBy, sortOrder }
}

// ──────────────────────────────────────────────────────────────
// String Sanitization
// ──────────────────────────────────────────────────────────────

/**
 * Sanitize a string input for safe storage and display.
 *
 * Performs:
 * 1. Trims leading/trailing whitespace
 * 2. Strips control characters (ASCII 0-31 except common whitespace)
 * 3. Limits length to maxLength (if specified)
 *
 * Does NOT perform HTML encoding — use a proper sanitization library
 * if outputting to HTML context.
 *
 * @param input - The raw string input
 * @param maxLength - Optional maximum character length (truncates if exceeded)
 * @returns The sanitized string
 *
 * @example
 * ```ts
 * const clean = sanitizeString(userInput, 200)
 * // '  Hello\x00World  ' → 'HelloWorld'
 * ```
 */
export function sanitizeString(input: string, maxLength?: number): string {
  // Trim whitespace
  let sanitized = input.trim()

  // Strip control characters (0x00-0x1F except 0x09 TAB, 0x0A LF, 0x0D CR)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

  // Also strip Unicode control characters and BOM
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '')

  // Limit length
  if (maxLength !== undefined && maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}
