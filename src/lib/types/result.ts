// ============================================================================
// ExamForge AI — Unified Result Type
// ============================================================================
// Discriminated union type for type-safe error handling without exceptions.
// Provides factory functions and type guards for ergonomic usage.
// ============================================================================

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<E = string>(error: E): Result<never, E> {
  return { ok: false, error }
}

// Type guards
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false
}
