// ============ ExamForge AI — Parent Importer ============
// Entity-specific importer for parent/guardian records.
// Creates profile records + child relationships.
//
// SECURITY: All mutations include .eq('school_id', schoolId) to
// prevent IDOR — school admins can only import into their own school.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { BatchResult, DuplicateStrategy, ImportValidationError } from '../types'

const log = createLogger('import:parent-importer')

// ──────────────────────────────────────────────────────────────
// Helper: Parse children names/IDs
// ──────────────────────────────────────────────────────────────

function parseChildrenList(value: unknown): string[] {
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
 * Import a batch of parent/guardian records.
 *
 * For each row:
 * 1. Creates a Supabase auth user with a temporary password
 * 2. Creates a profile record with role='parent' and school_id
 * 3. Links to children if children_names_or_ids is provided
 *
 * ALL mutations are scoped to schoolId for IDOR protection.
 *
 * @param rows - Array of mapped parent data
 * @param schoolId - The school to import into
 * @param duplicateStrategy - How to handle duplicates
 * @returns Batch result with import counts and any errors
 */
export async function importParentBatch(
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
      const childrenList = parseChildrenList(row.children_names_or_ids)
      const relationship = row.relationship ? String(row.relationship).trim().toLowerCase() : 'other'

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

      // Validate relationship enum
      const validRelationships = ['father', 'mother', 'guardian', 'other']
      const normalizedRelationship = validRelationships.includes(relationship)
        ? relationship
        : 'other'

      // Check for existing parent (duplicate detection)
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
              relationship: normalizedRelationship,
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
              message: `Failed to update existing parent: ${updateError.message}`,
            })
            failed++
            continue
          }

          if (updated) {
            entityIds.push(updated.id)

            // Re-link children if provided
            if (childrenList.length > 0) {
              await linkChildren(supabase, updated.id, schoolId, childrenList, normalizedRelationship)
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
          message: `Parent with email "${email}" already exists`,
        })
        failed++
        continue
      }

      // Create new parent
      const tempPassword = generateTempPassword()
      const fullName = `${firstName} ${lastName}`

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
            role: 'parent',
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
          relationship: normalizedRelationship,
          role: 'parent',
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

        // Link children if provided
        if (childrenList.length > 0) {
          await linkChildren(supabase, profileData.id, schoolId, childrenList, normalizedRelationship)
        }
      }

      imported++
    } catch (err) {
      log.error('Parent row import failed', err, { rowNumber, schoolId })
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
  log.info('Parent batch import complete', {
    imported,
    skipped,
    failed,
    elapsedMs: elapsed,
    schoolId,
  })

  return { imported, skipped, failed, entityIds, errors }
}

// ──────────────────────────────────────────────────────────────
// Child Linking Helper
// ──────────────────────────────────────────────────────────────

/**
 * Link a parent to their children by name or email/ID.
 *
 * For each entry in the children list:
 * - If it looks like an email, find the student by email
 * - If it looks like a UUID, find the student by ID
 * - Otherwise, try to find the student by full_name
 */
async function linkChildren(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  parentId: string,
  schoolId: string,
  childrenList: string[],
  relationship: string,
): Promise<void> {
  for (const childRef of childrenList) {
    try {
      let studentId: string | null = null

      // Check if it's an email
      if (childRef.includes('@')) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', childRef.toLowerCase())
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .maybeSingle()
        studentId = data?.id ?? null
      }
      // Check if it's a UUID
      else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(childRef)) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('id', childRef)
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .maybeSingle()
        studentId = data?.id ?? null
      }
      // Try by name
      else {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .ilike('full_name', childRef)
          .limit(1)
          .maybeSingle()
        studentId = data?.id ?? null
      }

      if (studentId) {
        // Create parent-student relationship
        await supabase
          .from('parent_students')
          .insert({
            parent_id: parentId,
            student_id: studentId,
            school_id: schoolId,
            relationship,
            created_at: new Date().toISOString(),
          })
      } else {
        log.warn('Child not found for parent linking', {
          parentId,
          childRef,
          schoolId,
        })
      }
    } catch {
      log.warn('Failed to link child to parent', { parentId, childRef })
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
