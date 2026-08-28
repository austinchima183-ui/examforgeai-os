// ============ ExamForge AI — Import Validator ============
// Row-level validation engine for the bulk import module.
// Validates each row against column definitions using built-in
// validators (required, email, phone, date, enum, minLength,
// maxLength, pattern) and detects intra-file duplicates.
// ============================================================================

import type {
  ColumnDefinition,
  ImportEntityType,
  ImportValidationError,
  ImportRow,
} from '../types'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('import:validator')

// ──────────────────────────────────────────────────────────────
// Built-in Validators
// ──────────────────────────────────────────────────────────────

/**
 * Validate a value against a single validation rule.
 *
 * @returns An error message string if validation fails, null if it passes
 */
function applyRule(
  value: unknown,
  rule: string,
  message: string,
  ruleValue: unknown,
): string | null {
  const strVal = value == null ? '' : String(value).trim()

  switch (rule) {
    case 'required':
      if (strVal === '') return message
      return null

    case 'email':
      if (strVal === '') return null // let 'required' handle empty
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) return message
      return null

    case 'phone':
      if (strVal === '') return null
      if (!/^[+]?[\d\s\-()]{7,20}$/.test(strVal)) return message
      return null

    case 'date':
      if (strVal === '') return null
      if (!/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return message
      // Verify it's a real date
      {
        const d = new Date(strVal)
        if (isNaN(d.getTime())) return message
      }
      return null

    case 'enum':
      if (strVal === '') return null
      {
        const allowed = Array.isArray(ruleValue) ? ruleValue.map(String) : []
        if (!allowed.includes(strVal.toLowerCase()) && !allowed.includes(strVal)) return message
      }
      return null

    case 'minLength':
      {
        const min = typeof ruleValue === 'number' ? ruleValue : 0
        if (strVal.length < min) return message
      }
      return null

    case 'maxLength':
      {
        const max = typeof ruleValue === 'number' ? ruleValue : Infinity
        if (strVal.length > max) return message
      }
      return null

    case 'pattern':
      if (strVal === '') return null
      {
        const pattern = ruleValue instanceof RegExp ? ruleValue : null
        if (pattern && !pattern.test(strVal)) return message
      }
      return null

    default:
      // Unknown rule — skip
      return null
  }
}

// ──────────────────────────────────────────────────────────────
// Type Coercion
// ──────────────────────────────────────────────────────────────

/**
 * Coerce a raw value to the expected column type.
 * Returns the coerced value, or the original if coercion fails.
 */
function coerceValue(value: unknown, type: ColumnDefinition['type']): unknown {
  if (value == null || value === '') return null

  switch (type) {
    case 'number': {
      if (typeof value === 'number') return value
      const num = Number(value)
      return Number.isFinite(num) ? num : value
    }
    case 'date': {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value
      }
      if (value instanceof Date) {
        const y = value.getFullYear()
        const m = String(value.getMonth() + 1).padStart(2, '0')
        const d = String(value.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      return value
    }
    case 'email':
      return typeof value === 'string' ? value.trim().toLowerCase() : value
    case 'string':
    case 'enum':
      return typeof value === 'string' ? value.trim() : value
    default:
      return value
  }
}

// ──────────────────────────────────────────────────────────────
// Row-Level Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate a single import row against column definitions.
 *
 * Applies type coercion first, then runs all validation rules
 * for each column. Returns an array of errors (empty if valid).
 *
 * @param row - The row data as a key-value map
 * @param columnDefs - Column definitions with validation rules
 * @param entityType - The entity type (for contextual validation)
 * @returns Array of validation errors for this row
 */
export function validateRow(
  row: Record<string, unknown>,
  columnDefs: ColumnDefinition[],
  _entityType: ImportEntityType,
): ImportValidationError[] {
  const errors: ImportValidationError[] = []

  for (const colDef of columnDefs) {
    const rawValue = row[colDef.name]
    const value = coerceValue(rawValue, colDef.type)

    // Apply each validation rule
    for (const validation of colDef.validations) {
      const error = applyRule(value, validation.rule, validation.message, validation.value)
      if (error) {
        errors.push({
          row: 0, // Will be set by caller
          column: colDef.name,
          value: rawValue,
          rule: validation.rule,
          message: error,
        })
      }
    }
  }

  return errors
}

/**
 * Validate all rows in a batch.
 *
 * Runs validateRow for each ImportRow and sets the isValid flag.
 * Also performs cross-row duplicate detection within the file
 * based on unique key columns for the entity type.
 *
 * @param rows - Array of ImportRow objects to validate
 * @param columnDefs - Column definitions
 * @param entityType - The entity type being imported
 * @returns Map of row number → validation errors
 */
export function validateAllRows(
  rows: ImportRow[],
  columnDefs: ColumnDefinition[],
  entityType: ImportEntityType,
): Map<number, ImportValidationError[]> {
  const startTime = Date.now()
  const errorMap = new Map<number, ImportValidationError[]>()

  // 1. Per-row validation
  for (const row of rows) {
    const errors = validateRow(row.data, columnDefs, entityType)

    // Set row number on each error
    for (const err of errors) {
      err.row = row.rowNumber
    }

    row.validationErrors = errors
    row.isValid = errors.length === 0

    if (errors.length > 0) {
      errorMap.set(row.rowNumber, errors)
    }
  }

  // 2. Cross-row duplicate detection (within the file itself)
  const duplicateErrors = detectIntraFileDuplicates(rows, entityType)
  for (const [rowNum, errors] of duplicateErrors) {
    const existing = errorMap.get(rowNum) ?? []
    errorMap.set(rowNum, [...existing, ...errors])

    // Mark affected rows as invalid
    const row = rows.find(r => r.rowNumber === rowNum)
    if (row) {
      row.validationErrors = [...row.validationErrors, ...errors]
      row.isValid = false
    }
  }

  const elapsed = Date.now() - startTime
  log.info('Row validation complete', {
    totalRows: rows.length,
    invalidRows: errorMap.size,
    elapsedMs: elapsed,
  })

  return errorMap
}

// ──────────────────────────────────────────────────────────────
// Intra-File Duplicate Detection
// ──────────────────────────────────────────────────────────────

/**
 * Get the dedup key columns for a given entity type.
 * These are the fields whose values must be unique within a single file.
 */
function getDedupKeyColumns(entityType: ImportEntityType): string[] {
  switch (entityType) {
    case 'student':
      return ['email', 'admission_number']
    case 'teacher':
      return ['email', 'employee_id']
    case 'parent':
      return ['email', 'phone']
    case 'subject':
      return ['code', 'name']
    case 'class':
      return ['name']
    case 'result':
      return ['student_email_or_id', 'exam_name', 'subject_name']
    case 'timetable':
      return ['class_name', 'day', 'period']
    default:
      return []
  }
}

/**
 * Detect duplicates within a single import file.
 * For each dedup key, tracks seen values and reports rows that
 * produce duplicate keys.
 */
function detectIntraFileDuplicates(
  rows: ImportRow[],
  entityType: ImportEntityType,
): Map<number, ImportValidationError[]> {
  const keyColumns = getDedupKeyColumns(entityType)
  const result = new Map<number, ImportValidationError[]>()

  if (keyColumns.length === 0) return result

  // Track seen key values: keyColumn → value → first row number
  const seen = new Map<string, Map<string, number>>()

  for (const col of keyColumns) {
    seen.set(col, new Map())
  }

  for (const row of rows) {
    if (!row.isValid) continue // Skip already-invalid rows

    for (const keyCol of keyColumns) {
      const value = row.data[keyCol]
      if (value == null || value === '') continue

      const strValue = String(value).trim().toLowerCase()
      const seenMap = seen.get(keyCol)!
      const firstRow = seenMap.get(strValue)

      if (firstRow !== undefined) {
        // Duplicate found
        const errors = result.get(row.rowNumber) ?? []
        errors.push({
          row: row.rowNumber,
          column: keyCol,
          value,
          rule: 'duplicate_in_file',
          message: `Duplicate ${keyCol} "${value}" — first seen on row ${firstRow}`,
        })
        result.set(row.rowNumber, errors)
      } else {
        seenMap.set(strValue, row.rowNumber)
      }
    }
  }

  return result
}
