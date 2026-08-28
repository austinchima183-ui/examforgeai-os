// ============================================================================
// ExamForge AI — API Response Case Normalization
// ============================================================================
// The API contract with the frontend is camelCase (inherited from the
// original Prisma responses). Supabase/PostgREST returns snake_case rows.
// These helpers deep-convert DB rows back to the camelCase contract so
// existing frontend pages keep working without modification.
// ============================================================================

/** Convert a single snake_case key to camelCase. */
function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

/** Recursively convert all object keys from snake_case to camelCase. */
export function snakeToCamel<T>(value: T): unknown {
  if (Array.isArray(value)) {
    return value.map(snakeToCamel)
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[toCamelKey(key)] = snakeToCamel(val)
    }
    return out
  }
  return value
}

/** Type-preserving wrapper: converts a DB row (or list) to the camelCase contract. */
export function toCamelRows<T>(rows: T[] | null | undefined): unknown[] {
  return (rows ?? []).map(row => snakeToCamel(row))
}

export function toCamelRow<T>(row: T | null | undefined): unknown {
  return row == null ? null : snakeToCamel(row)
}
