// ============================================================================
// ExamForge AI — Result Type
// ============================================================================
// Discriminated union type for type-safe error handling without exceptions.
// Inspired by Rust's Result<T, E> pattern. Provides factory functions
// and type guards for ergonomic usage.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Result Type Definition
// ──────────────────────────────────────────────────────────────

/**
 * Represents a successful result with a value.
 */
export interface SuccessResult<T> {
  readonly ok: true
  readonly value: T
  readonly error?: never
}

/**
 * Represents a failed result with an error.
 */
export interface FailureResult<E> {
  readonly ok: false
  readonly value?: never
  readonly error: E
}

/**
 * Discriminated union type for operation results.
 *
 * Use `success()` and `failure()` factory functions to create instances,
 * and `isSuccess()` / `isFailure()` type guards to narrow the type.
 *
 * @typeParam T - The success value type
 * @typeParam E - The error type (defaults to Error)
 */
export type Result<T, E = Error> = SuccessResult<T> | FailureResult<E>

// ──────────────────────────────────────────────────────────────
// Factory Functions
// ──────────────────────────────────────────────────────────────

/**
 * Create a successful result.
 *
 * @param value - The success value
 * @returns A SuccessResult wrapping the value
 *
 * @example
 * ```ts
 * const result = success(42)
 * // result: SuccessResult<number>
 * ```
 */
export function success<T>(value: T): SuccessResult<T> {
  return { ok: true, value }
}

/**
 * Create a failed result.
 *
 * @param error - The error value
 * @returns A FailureResult wrapping the error
 *
 * @example
 * ```ts
 * const result = failure(new Error('Something went wrong'))
 * // result: FailureResult<Error>
 * ```
 */
export function failure<E>(error: E): FailureResult<E> {
  return { ok: false, error }
}

// ──────────────────────────────────────────────────────────────
// Type Guards
// ──────────────────────────────────────────────────────────────

/**
 * Check if a Result is a success.
 *
 * @param result - The Result to check
 * @returns True if the Result is a SuccessResult
 *
 * @example
 * ```ts
 * const res = success(42)
 * if (isSuccess(res)) {
 *   console.log(res.value) // TypeScript knows res.value is number
 * }
 * ```
 */
export function isSuccess<T, E>(result: Result<T, E>): result is SuccessResult<T> {
  return result.ok === true
}

/**
 * Check if a Result is a failure.
 *
 * @param result - The Result to check
 * @returns True if the Result is a FailureResult
 *
 * @example
 * ```ts
 * const res = failure(new Error('oops'))
 * if (isFailure(res)) {
 *   console.log(res.error.message) // TypeScript knows res.error is Error
 * }
 * ```
 */
export function isFailure<T, E>(result: Result<T, E>): result is FailureResult<E> {
  return result.ok === false
}

// ──────────────────────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────────────────────

/**
 * Map the success value of a Result.
 *
 * @param result - The Result to map
 * @param fn - Mapping function
 * @returns A new Result with the mapped value, or the original failure
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return isSuccess(result) ? success(fn(result.value)) : result
}

/**
 * Map the error of a Result.
 *
 * @param result - The Result to map
 * @param fn - Mapping function
 * @returns A new Result with the mapped error, or the original success
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isFailure(result) ? failure(fn(result.error)) : result
}

/**
 * Unwrap a Result, returning the value or throwing the error.
 *
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws The error if the Result is a failure
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isSuccess(result)) return result.value
  throw result.error
}

/**
 * Unwrap a Result, returning the value or a default.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The default value if the Result is a failure
 * @returns The success value or the default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isSuccess(result) ? result.value : defaultValue
}
