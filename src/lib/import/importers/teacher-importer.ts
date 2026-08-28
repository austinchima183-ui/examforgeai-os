// ============ ExamForge AI — Teacher Importer ============
// Entity-specific importer for teacher records.
// Creates profile records + subject/class assignments.
//
// SECURITY: All mutations include .eq('school_id', schoolId) to
// prevent IDOR — school admins can only import into their own school.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { BatchResult, DuplicateStrategy, ImportValidationError } from '../types'

const log = createLogger('import:teacher-importer')

// ──────────────────────────────────────────────────────────────
// Helper: Parse comma/semicolon-separated values
// ──────────────────────────────────────────────────────────────

function parseList(value: unknown): string[] {
  if (!value || typeof value !== 'string') return []
  return value
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// ──────────────────────────────────────────────────────────────
// Batch Import
// ──────────────────────────────────────────────────────────────

/**
 * Import a batch of teacher records.
 *
 * For each row:
 * 1. Creates a Supabase auth user with a temporary password
 * 2. Creates a profile record with role='teacher' and school_id
 * 3. Assigns subjects and classes if provided
 *
 * ALL mutations are scoped to schoolId for IDOR protection.
 *
 * @param rows - Array of mapped teacher data
 * @param schoolId - The school to import into
 * @param duplicateStrategy - How to handle duplicates
 * @returns Batch result with import counts and any errors
 */
export async function importTeacherBatch(
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1

    try {
      const email = String(row.email ?? '').trim().toLowerCase()
      const firstName = String(row.first_name ?? '').trim()
      const lastName = String(row.last_name ?? '').trim()
      const phone = row.phone ? String(row.phone).trim() : null
      const subjectsList = parseList(row.subjects)
      const classesList = parseList(row.classes)
      const qualification = row.qualification ? String(row.qualification).trim() : null
      const employeeId = row.employee_id ? String(row.employee_id).trim() : null

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

      // Check for existing teacher (duplicate detection)
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
              qualification,
              employee_id: employeeId,
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
              message: `Failed to update existing teacher: ${updateError.message}`,
            })
            failed++
            continue
          }

          if (updated) {
            entityIds.push(updated.id)

            // Re-assign subjects and classes if provided
            if (subjectsList.length > 0) {
              await assignSubjects(supabase, updated.id, schoolId, subjectsList)
            }
            if (classesList.length > 0) {
              await assignClasses(supabase, updated.id, schoolId, classesList)
            }

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
          message: `Teacher with email "${email}" already exists`,
        })
        failed++
        continue
      }

      // Create new teacher
      const tempPassword = generateTempPassword()
      const fullName = `${firstName} ${lastName}`

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
            role: 'teacher',
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
          qualification,
          employee_id: employeeId,
          role: 'teacher',
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
        continue
      }

      if (profileData) {
        entityIds.push(profileData.id)

        // Assign subjects and classes
        if (subjectsList.length > 0) {
          await assignSubjects(supabase, profileData.id, schoolId, subjectsList)
        }
        if (classesList.length > 0) {
          await assignClasses(supabase, profileData.id, schoolId, classesList)
        }
      }

      imported++
    } catch (err) {
      log.error('Teacher row import failed', err, { rowNumber, schoolId })
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
  log.info('Teacher batch import complete', {
    imported,
    skipped,
    failed,
    elapsedMs: elapsed,
    schoolId,
  })

  return { imported, skipped, failed, entityIds, errors }
}

// ──────────────────────────────────────────────────────────────
// Subject & Class Assignment Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Assign subjects to a teacher by looking up subject IDs by name/code.
 */
async function assignSubjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teacherId: string,
  schoolId: string,
  subjectNames: string[],
): Promise<void> {
  for (const name of subjectNames) {
    try {
      // Look up subject by name or code
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_id', schoolId)
        .or(`name.ilike.${name},code.ilike.${name}`)
        .limit(1)
        .maybeSingle()

      if (subject) {
        // Create teacher_subject assignment
        await supabase
          .from('teacher_subjects')
          .insert({
            teacher_id: teacherId,
            subject_id: subject.id,
            school_id: schoolId,
          })
      }
    } catch {
      log.warn('Failed to assign subject to teacher', { teacherId, subjectName: name })
    }
  }
}

/**
 * Assign classes to a teacher by looking up class IDs by name.
 */
async function assignClasses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teacherId: string,
  schoolId: string,
  classNames: string[],
): Promise<void> {
  for (const name of classNames) {
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
        .ilike('name', name)
        .limit(1)
        .maybeSingle()

      if (cls) {
        // Update class with teacher_id or create class_teacher assignment
        await supabase
          .from('classes')
          .update({ teacher_id: teacherId, updated_at: new Date().toISOString() })
          .eq('id', cls.id)
          .eq('school_id', schoolId) // IDOR protection
      }
    } catch {
      log.warn('Failed to assign class to teacher', { teacherId, className: name })
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Password Generation
// ──────────────────────────────────────────────────────────────

/** Generate a cryptographically secure random temporary password */
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
