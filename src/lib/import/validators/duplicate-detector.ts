// ============ ExamForge AI — Duplicate Detector ============
// Checks import rows against existing database records to detect
// duplicates before import. Uses entity-type-specific dedup keys
// (email, phone, employee_id, etc.) and provides resolution
// strategies (skip, update, error).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type {
  DuplicateRecord,
  DuplicateResult,
  DuplicateStrategy,
  ImportEntityType,
  ImportRow,
  ResolutionAction,
} from '../types'

const log = createLogger('import:duplicate-detector')

// ──────────────────────────────────────────────────────────────
// Dedup Key Definitions
// ──────────────────────────────────────────────────────────────

/** Defines how to look up existing records for a given entity type */
interface DedupConfig {
  /** Supabase table name */
  table: string
  /** Column(s) to check for duplicates and the corresponding import field */
  keys: Array<{ dbColumn: string; importField: string }>
}

/** Get the dedup configuration for an entity type */
function getDedupConfig(entityType: ImportEntityType): DedupConfig {
  switch (entityType) {
    case 'student':
      return {
        table: 'profiles',
        keys: [
          { dbColumn: 'email', importField: 'email' },
        ],
      }
    case 'teacher':
      return {
        table: 'profiles',
        keys: [
          { dbColumn: 'email', importField: 'email' },
        ],
      }
    case 'parent':
      return {
        table: 'profiles',
        keys: [
          { dbColumn: 'email', importField: 'email' },
        ],
      }
    case 'subject':
      return {
        table: 'subjects',
        keys: [
          { dbColumn: 'code', importField: 'code' },
          { dbColumn: 'name', importField: 'name' },
        ],
      }
    case 'class':
      return {
        table: 'classes',
        keys: [
          { dbColumn: 'name', importField: 'name' },
        ],
      }
    case 'result':
      return {
        table: 'results',
        keys: [
          { dbColumn: 'student_email_or_id', importField: 'student_email_or_id' },
        ],
      }
    case 'timetable':
      return {
        table: 'timetable_entries',
        keys: [
          { dbColumn: 'class_name', importField: 'class_name' },
        ],
      }
    default:
      return { table: 'profiles', keys: [] }
  }
}

// ──────────────────────────────────────────────────────────────
// Duplicate Detection
// ──────────────────────────────────────────────────────────────

/**
 * Detect duplicates by comparing import rows against existing
 * database records for the given school.
 *
 * For each dedup key, queries the database for matching values
 * within the school scope. Returns a list of DuplicateRecord
 * entries and the set of unique row indices.
 *
 * @param rows - Parsed import rows
 * @param entityType - The entity type being imported
 * @param schoolId - The school scope for the lookup
 * @returns Duplicate result with duplicates list and unique row indices
 */
export async function detectDuplicates(
  rows: ImportRow[],
  entityType: ImportEntityType,
  schoolId: string,
): Promise<DuplicateResult> {
  const startTime = Date.now()
  const config = getDedupConfig(entityType)
  const duplicates: DuplicateRecord[] = []
  const uniqueRows: number[] = []

  if (config.keys.length === 0 || rows.length === 0) {
    // No dedup keys defined — treat all rows as unique
    return { duplicates: [], uniqueRows: rows.map(r => r.rowNumber) }
  }

  try {
    const supabase = await createClient()

    // Collect all unique values to query for each key
    for (const keyDef of config.keys) {
      // Gather values from import rows for this key
      const valueToRowMap = new Map<string, ImportRow[]>()

      for (const row of rows) {
        if (!row.isValid) continue
        const value = row.data[keyDef.importField]
        if (value == null || value === '') continue

        const strValue = String(value).trim().toLowerCase()
        const existing = valueToRowMap.get(strValue) ?? []
        existing.push(row)
        valueToRowMap.set(strValue, existing)
      }

      if (valueToRowMap.size === 0) continue

      // Batch query: check which values already exist in DB
      const valuesToCheck = Array.from(valueToRowMap.keys())

      // Query in batches of 100 to avoid URL length limits
      const BATCH_QUERY_SIZE = 100
      const existingValues = new Set<string>()
      const existingIdMap = new Map<string, string>()

      for (let i = 0; i < valuesToCheck.length; i += BATCH_QUERY_SIZE) {
        const batch = valuesToCheck.slice(i, i + BATCH_QUERY_SIZE)

        const { data, error } = await supabase
          .from(config.table)
          .select(`id, ${keyDef.dbColumn}`)
          .eq('school_id', schoolId)
          .in(keyDef.dbColumn, batch)

        if (error) {
          log.warn('Duplicate check query failed', { table: config.table, column: keyDef.dbColumn, error: error.message })
          continue
        }

        if (data) {
          for (const record of (data as unknown as Record<string, unknown>[])) {
            const val = String(record[keyDef.dbColumn] ?? '').trim().toLowerCase()
            existingValues.add(val)
            existingIdMap.set(val, String(record.id ?? ''))
          }
        }
      }

      // Mark duplicate rows
      for (const [value, matchingRows] of valueToRowMap) {
        if (existingValues.has(value)) {
          for (const row of matchingRows) {
            duplicates.push({
              rowNumber: row.rowNumber,
              data: row.data,
              existingId: existingIdMap.get(value) ?? '',
              matchKey: keyDef.importField,
              matchValue: value,
            })
          }
        } else {
          // First occurrence in file — unique (unless already marked as duplicate by another key)
          for (const row of matchingRows) {
            if (!duplicates.some(d => d.rowNumber === row.rowNumber)) {
              uniqueRows.push(row.rowNumber)
            }
          }
        }
      }
    }
  } catch (err) {
    log.error('Duplicate detection failed', err, { entityType, schoolId })
    // On error, treat all rows as unique to avoid blocking the import
    return { duplicates: [], uniqueRows: rows.map(r => r.rowNumber) }
  }

  // Deduplicate uniqueRows (a row might have been added by multiple keys)
  const uniqueSet = new Set(uniqueRows)
  // Remove rows that are in the duplicates list from the unique set
  for (const dup of duplicates) {
    uniqueSet.delete(dup.rowNumber)
  }
  // Add rows not involved in any key check
  for (const row of rows) {
    if (!duplicates.some(d => d.rowNumber === row.rowNumber)) {
      uniqueSet.add(row.rowNumber)
    }
  }

  const elapsed = Date.now() - startTime
  log.info('Duplicate detection complete', {
    totalRows: rows.length,
    duplicates: duplicates.length,
    unique: uniqueSet.size,
    elapsedMs: elapsed,
  })

  return {
    duplicates,
    uniqueRows: Array.from(uniqueSet).sort((a, b) => a - b),
  }
}

// ──────────────────────────────────────────────────────────────
// Duplicate Resolution
// ──────────────────────────────────────────────────────────────

/**
 * Determine the resolution action for a duplicate record
 * based on the chosen strategy.
 *
 * @param duplicate - The detected duplicate
 * @param strategy - The user's chosen duplicate strategy
 * @returns Resolution action indicating what to do
 */
export function resolveDuplicate(
  duplicate: DuplicateRecord,
  strategy: DuplicateStrategy,
): ResolutionAction {
  switch (strategy) {
    case 'skip':
      return { action: 'skip', duplicate }
    case 'update':
      return { action: 'update', duplicate }
    case 'error':
      return { action: 'error', duplicate }
    default:
      return { action: 'error', duplicate }
  }
}
