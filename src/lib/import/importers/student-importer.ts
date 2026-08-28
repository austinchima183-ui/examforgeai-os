// ============ ExamForge AI — Student Importer ============
// Entity-specific importer for student records.
// Creates profile records + enrollment records and generates
// temporary passwords for new students.
//
// SECURITY: All mutations include .eq('school_id', schoolId) to
// prevent IDOR — school admins can only import into their own school.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { BatchResult, DuplicateStrategy, ImportValidationError } from '../types'

const log = createLogger('import:student-importer')

// ──────────────────────────────────────────────────────────────
// Temporary Password Generation
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random temporary password for a new student.
 * Format: 8 alphanumeric characters + 2 special characters.
 */
function generateTempPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const specials = '!@#$%'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars[bytes[i] % chars.length]
  }
  for (let i = 0; i < 2; i++) {
    password += specials[bytes[8 + i] % specials.length]
  }
  return password
}

// ──────────────────────────────────────────────────────────────
// Class Lookup Cache
// ──────────────────────────────────────────────────────────────

/** Cache for class name → class ID lookups within a school */
const classCache = new Map<string, Map<string, string>>()

/**
 * Get the class ID for a class name, with caching.
 */
async function getClassId(schoolId: string, className: string): Promise<string | null> {
  if (!className || className.trim() === '') return null

  const normalizedName = className.trim()

  // Check cache
  let schoolClasses = classCache.get(schoolId)
  if (!schoolClasses) {
    schoolClasses = new Map()
    classCache.set(schoolId, schoolClasses)
  }

  if (schoolClasses.has(normalizedName)) {
    return schoolClasses.get(normalizedName) ?? null
  }

  // Query database
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)
      .ilike('name', normalizedName)
      .limit(1)
      .single()

    if (data) {
      schoolClasses.set(normalizedName, data.id)
      return data.id
    }

    // Not found — cache the miss to avoid repeated queries
    schoolClasses.set(normalizedName, '')
    return null
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Batch Import
// ──────────────────────────────────────────────────────────────

/**
 * Import a batch of student records.
 *
 * For each row:
 * 1. Creates a Supabase auth user with a temporary password
 * 2. Creates a profile record with role='student' and school_id
 * 3. Creates an enrollment record if class_name is provided
 *
 * If the duplicate strategy is 'update' and a duplicate is found
 * (by email), the existing profile is updated instead.
 *
 * ALL mutations are scoped to schoolId for IDOR protection.
 *
 * @param rows - Array of mapped student data
 * @param schoolId - The school to import into
 * @param duplicateStrategy - How to handle duplicates
 * @returns Batch result with import counts and any errors
 */
export async function importStudentBatch(
  rows: Record<string, unknown>[],
  schoolId: string,
  duplicateStrategy: DuplicateStrategy,
): Promise<BatchResult> {
  const startTime = Date.now()
  const errors: ImportValidationError[] = []
  const entityIds: string[] = []
  let imported = 0
  let skipped = 0
  let failed = 0

  const supabase = await createClient()

  // Clear class cache for fresh lookups
  classCache.delete(schoolId)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1 // Relative to batch

    try {
      const email = String(row.email ?? '').trim().toLowerCase()
      const firstName = String(row.first_name ?? '').trim()
      const lastName = String(row.last_name ?? '').trim()
      const phone = row.phone ? String(row.phone).trim() : null
      const dateOfBirth = row.date_of_birth ? String(row.date_of_birth).trim() : null
      const gender = row.gender ? String(row.gender).trim().toLowerCase() : 'other'
      const className = row.class_name ? String(row.class_name).trim() : null
      const rollNumber = row.roll_number ? String(row.roll_number).trim() : null
      const admissionNumber = row.admission_number ? String(row.admission_number).trim() : null

      if (!email || !firstName || !lastName) {
        errors.push({
          row: rowNumber,
          column: '_required',
          value: null,
          rule: 'missing_required',
          message: 'Missing required fields: email, first_name, or last_name',
        })
        failed++
        continue
      }

      // Check for existing student (duplicate detection)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('school_id', schoolId)
        .maybeSingle()

      if (existingProfile) {
        if (duplicateStrategy === 'skip') {
          skipped++
          continue
        }

        if (duplicateStrategy === 'update') {
          // Update existing profile
          const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({
              full_name: `${firstName} ${lastName}`,
              phone,
              date_of_birth: dateOfBirth,
              gender,
              roll_number: rollNumber,
              admission_number: admissionNumber,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProfile.id)
            .eq('school_id', schoolId) // IDOR protection
            .select('id')
            .single()

          if (updateError) {
            errors.push({
              row: rowNumber,
              column: '_update',
              value: email,
              rule: 'update_failed',
              message: `Failed to update existing student: ${updateError.message}`,
            })
            failed++
            continue
          }

          if (updated) {
            entityIds.push(updated.id)
            imported++
          }
          continue
        }

        // duplicateStrategy === 'error'
        errors.push({
          row: rowNumber,
          column: 'email',
          value: email,
          rule: 'duplicate_error',
          message: `Student with email "${email}" already exists`,
        })
        failed++
        continue
      }

      // Create new student
      const tempPassword = generateTempPassword()
      const fullName = `${firstName} ${lastName}`

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
            role: 'student',
            school_id: schoolId,
          },
        },
      })

      if (authError || !authData.user) {
        errors.push({
          row: rowNumber,
          column: 'email',
          value: email,
          rule: 'auth_create_failed',
          message: `Failed to create user: ${authError?.message ?? 'Unknown error'}`,
        })
        failed++
        continue
      }

      const userId = authData.user.id

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone,
          date_of_birth: dateOfBirth,
          gender,
          roll_number: rollNumber,
          admission_number: admissionNumber,
          role: 'student',
          school_id: schoolId,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (profileError) {
        errors.push({
          row: rowNumber,
          column: '_profile',
          value: email,
          rule: 'profile_create_failed',
          message: `Failed to create profile: ${profileError.message}`,
        })
        failed++
        // Clean up auth user if profile creation fails
        continue
      }

      if (profileData) {
        entityIds.push(profileData.id)
      }

      // Create enrollment if class is specified
      if (className) {
        const classId = await getClassId(schoolId, className)
        if (classId) {
          await supabase
            .from('enrollments')
            .insert({
              student_id: userId,
              class_id: classId,
              school_id: schoolId,
              roll_number: rollNumber,
              is_active: true,
              created_at: new Date().toISOString(),
            })
        } else {
          log.warn('Class not found for student enrollment', { className, email, schoolId })
        }
      }

      imported++
    } catch (err) {
      log.error('Student row import failed', err, { rowNumber, schoolId })
      errors.push({
        row: rowNumber,
        column: '_error',
        value: null,
        rule: 'unexpected_error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      })
      failed++
    }
  }

  const elapsed = Date.now() - startTime
  log.info('Student batch import complete', {
    imported,
    skipped,
    failed,
    elapsedMs: elapsed,
    schoolId,
  })

  return { imported, skipped, failed, entityIds, errors }
}
