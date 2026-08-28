// ============ ExamForge AI — Field Mapper ============
// Auto-detection and application of column mappings between
// source file headers and target database fields. Uses name
// similarity (Levenshtein distance and keyword matching) to
// suggest mappings, and supports manual overrides.
// ============================================================================

import type { ColumnDefinition, ImportMapping } from '../types'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('import:field-mapper')

// ──────────────────────────────────────────────────────────────
// Name Similarity
// ──────────────────────────────────────────────────────────────

/** Common aliases for standard fields */
const FIELD_ALIASES: Record<string, string[]> = {
  first_name: ['firstname', 'fname', 'first name', 'given name', 'givenname', 'given_name'],
  last_name: ['lastname', 'lname', 'last name', 'surname', 'family name', 'familyname', 'family_name'],
  email: ['email address', 'e-mail', 'email_address', 'mail'],
  phone: ['telephone', 'tel', 'mobile', 'cell', 'phone number', 'phonenumber', 'phone_number', 'contact'],
  date_of_birth: ['dob', 'date of birth', 'birth date', 'birthdate', 'birth_date', 'birthday', 'born'],
  gender: ['sex'],
  class_name: ['class', 'classname', 'class name', 'grade', 'form'],
  roll_number: ['roll no', 'rollno', 'roll number', 'roll_no', 'roll', 'serial'],
  admission_number: ['admission no', 'admissionno', 'admission number', 'admission_no', 'admission', 'admn', 'reg no', 'regno', 'registration'],
  subjects: ['subject', 'subject names', 'subject_names'],
  classes: ['class names', 'class_names', 'assigned classes', 'assigned_classes'],
  qualification: ['qual', 'degree', 'education', 'credentials'],
  employee_id: ['employee id', 'employeeid', 'emp id', 'emp_id', 'staff id', 'staff_id', 'staffid', 'id number'],
  children_names_or_ids: ['children', 'child names', 'child_names', 'wards', 'student names', 'student_names'],
  relationship: ['relation', 'guardian type', 'guardian_type'],
  name: ['title', 'subject name', 'subject_name', 'class name', 'class_name', 'exam name', 'exam_name'],
  code: ['subject code', 'subject_code', 'shortcode'],
  class_level: ['level', 'grade level', 'grade_level', 'year'],
  teacher_email: ['teacher', 'teacher email', 'teacher_email', 'teacher email address'],
  arm: ['section', 'stream', 'division', 'sub-class'],
  level: ['grade', 'year', 'form', 'stage'],
  capacity: ['max students', 'max_students', 'seats', 'limit', 'max capacity', 'max_capacity'],
  class_teacher_email: ['class teacher', 'class_teacher', 'homeroom teacher', 'homeroom_teacher'],
  student_email_or_id: ['student', 'student email', 'student_email', 'student id', 'student_id', 'student email or id'],
  exam_name: ['exam', 'examination', 'test name', 'test_name', 'exam title'],
  subject_name: ['subject', 'subject name'],
  score: ['marks', 'mark', 'score', 'points', 'total', 'obtained', 'obtained marks'],
  grade: ['letter grade', 'letter_grade', 'rating'],
  term: ['semester', 'term name', 'term_name', 'academic term'],
  day: ['weekday', 'day of week', 'day_of_week'],
  period: ['slot', 'time slot', 'time_slot', 'period number', 'period_number', 'lesson'],
  start_time: ['start', 'from', 'begin', 'begin time', 'begin_time', 'time start', 'time_start'],
  end_time: ['end', 'to', 'until', 'finish', 'finish time', 'finish_time', 'time end', 'time_end'],
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used as a fallback when alias matching doesn't find a match.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[])

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[m][n]
}

/**
 * Calculate a similarity score between a source header and a target field.
 * Higher is better. Returns a value between 0 and 1.
 */
function similarity(source: string, target: string): number {
  const srcNorm = source.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
  const tgtNorm = target.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

  // Exact match
  if (srcNorm === tgtNorm) return 1.0

  // Check aliases
  const aliases = FIELD_ALIASES[target] ?? []
  for (const alias of aliases) {
    const aliasNorm = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    if (srcNorm === aliasNorm) return 0.95
  }

  // Source matches a known alias of the target
  const srcAliases = FIELD_ALIASES[source] ?? []
  for (const alias of srcAliases) {
    const aliasNorm = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    if (tgtNorm === aliasNorm) return 0.9
  }

  // Levenshtein-based similarity
  const maxLen = Math.max(srcNorm.length, tgtNorm.length)
  if (maxLen === 0) return 0
  const dist = levenshtein(srcNorm, tgtNorm)
  const score = 1 - dist / maxLen

  // Only return if reasonably similar
  return score >= 0.6 ? score * 0.8 : 0 // Scale down to prefer alias/exact matches
}

// ──────────────────────────────────────────────────────────────
// Auto-Map Columns
// ──────────────────────────────────────────────────────────────

/**
 * Automatically detect the best mapping between source file headers
 * and target column definitions using name similarity.
 *
 * For each source header, finds the best-matching target field
 * (if similarity exceeds a threshold). Unmapped headers are
 * included in the result with targetField set to the source name.
 *
 * @param sourceHeaders - Column headers from the parsed file
 * @param targetDefinitions - Column definitions for the target entity
 * @returns Array of ImportMapping suggestions
 *
 * @example
 * ```ts
 * const mappings = autoMapColumns(
 *   ['First Name', 'Last Name', 'Email Address', 'Phone'],
 *   getColumnDefinitions('student'),
 * )
 * // mappings[0] → { sourceColumn: 'First Name', targetField: 'first_name' }
 * ```
 */
export function autoMapColumns(
  sourceHeaders: string[],
  targetDefinitions: ColumnDefinition[],
): ImportMapping[] {
  const SIMILARITY_THRESHOLD = 0.6
  const mappings: ImportMapping[] = []
  const usedTargets = new Set<string>()

  for (const header of sourceHeaders) {
    let bestTarget: ColumnDefinition | null = null
    let bestScore = 0

    for (const def of targetDefinitions) {
      if (usedTargets.has(def.name)) continue

      const score = similarity(header, def.name)
      if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
        bestScore = score
        bestTarget = def
      }
    }

    if (bestTarget) {
      mappings.push({
        sourceColumn: header,
        targetField: bestTarget.name,
        transform: getDefaultTransform(bestTarget.type),
      })
      usedTargets.add(bestTarget.name)
      log.debug('Auto-mapped column', { header, target: bestTarget.name, score: bestScore.toFixed(2) })
    } else {
      // No good match found — include as unmapped
      mappings.push({
        sourceColumn: header,
        targetField: header,
      })
      log.debug('Unmapped column', { header })
    }
  }

  return mappings
}

/**
 * Get a default transform function for a column type.
 */
function getDefaultTransform(type: ColumnDefinition['type']): ((_value: unknown) => unknown) | undefined {
  switch (type) {
    case 'email':
      return (_value: unknown) => typeof _value === 'string' ? _value.trim().toLowerCase() : _value
    case 'string':
    case 'enum':
      return (value: unknown) => typeof value === 'string' ? value.trim() : value
    case 'number':
      return (value: unknown) => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const num = Number(value.trim())
          return Number.isFinite(num) ? num : value
        }
        return value
      }
    case 'date':
      return (value: unknown) => {
        if (typeof value === 'string') return value.trim()
        if (value instanceof Date) {
          const y = value.getFullYear()
          const m = String(value.getMonth() + 1).padStart(2, '0')
          const d = String(value.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
        return value
      }
    default:
      return undefined
  }
}

// ──────────────────────────────────────────────────────────────
// Apply Mapping
// ──────────────────────────────────────────────────────────────

/**
 * Apply a column mapping to transform a source row into the
 * target schema format.
 *
 * For each mapping entry, reads the value from the source column,
 * applies the transform (if defined), and writes it to the
 * target field. Unmapped fields get their default values from
 * the column definitions.
 *
 * @param row - Source row data (keyed by source column names)
 * @param mapping - Column mappings to apply
 * @returns Transformed row data keyed by target field names
 */
export function applyMapping(
  row: Record<string, unknown>,
  mapping: ImportMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const map of mapping) {
    let value = row[map.sourceColumn]

    // Apply transform if defined
    if (map.transform) {
      try {
        value = map.transform(value)
      } catch {
        // Transform failed — use raw value
      }
    }

    result[map.targetField] = value
  }

  return result
}

// ──────────────────────────────────────────────────────────────
// Validate Mapping
// ──────────────────────────────────────────────────────────────

/**
 * Validate that a column mapping covers all required target fields.
 *
 * @param mapping - The column mapping to validate
 * @param targetDefinitions - Column definitions for the target entity
 * @returns True if all required fields are mapped, false otherwise
 */
export function validateMapping(
  mapping: ImportMapping[],
  targetDefinitions: ColumnDefinition[],
): boolean {
  const mappedTargets = new Set(mapping.map(m => m.targetField))
  const requiredFields = targetDefinitions.filter(d => d.required)

  for (const field of requiredFields) {
    if (!mappedTargets.has(field.name)) {
      log.warn('Required field not mapped', { field: field.name })
      return false
    }
  }

  return true
}

/**
 * Get a list of unmapped required fields.
 * Useful for showing specific errors to the user.
 */
export function getUnmappedRequiredFields(
  mapping: ImportMapping[],
  targetDefinitions: ColumnDefinition[],
): ColumnDefinition[] {
  const mappedTargets = new Set(mapping.map(m => m.targetField))
  return targetDefinitions.filter(d => d.required && !mappedTargets.has(d.name))
}
