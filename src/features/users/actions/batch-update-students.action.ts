'use server'

import { revalidatePath } from 'next/cache'
import { requireAnyRole } from '@/lib/auth/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

// ============================================================================
// ExamForge AI — Batch Student Update (Ω-3: batch edit backend)
// ============================================================================
// Batch-applies status changes to selected students. Authorization:
//   1. Caller must be school_admin or super_admin (session-verified)
//   2. school_admin may only touch students in their OWN school
//   3. Writes go through the service client AFTER both checks — the same
//      pattern as /api/admin/users PUT (users table has no school_admin
//      UPDATE policy, so the service client is required; the explicit
//      school-scope check is the authorizer).
// ============================================================================

export interface BatchUpdateStudentsResult {
  success: boolean
  updated?: number
  error?: string
}

const BATCH_LIMIT = 500

export async function batchUpdateStudents(
  studentIds: string[],
  values: Record<string, string | number>
): Promise<BatchUpdateStudentsResult> {
  const auth = await requireAnyRole(['school_admin', 'super_admin'])
  if (!auth) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { success: false, error: 'No students selected' }
  }
  if (studentIds.length > BATCH_LIMIT) {
    return { success: false, error: `Batch limit is ${BATCH_LIMIT} students` }
  }

  // ── Whitelist the fields batch edit may touch ──
  const patch: Record<string, unknown> = {}
  const rawActive = values.is_active as string | number | boolean | undefined
  if (rawActive !== undefined) {
    patch.is_active = rawActive === 'true' || rawActive === 1 || rawActive === true
  }
  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'No supported fields to update' }
  }
  patch.updated_at = new Date().toISOString()

  const supabase = createServiceClient()
  if (!supabase) {
    return {
      success: false,
      error: 'Batch updates require the admin database connection. Please try again or contact support.',
    }
  }

  // ── School-scope enforcement for school admins ──
  let targetIds = studentIds
  if (auth.user.role === 'school_admin' && auth.user.schoolId) {
    const { data: scoped, error: scopeError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', auth.user.schoolId)
      .eq('role', 'student')
      .in('id', studentIds)
    if (scopeError) {
      return { success: false, error: scopeError.message }
    }
    targetIds = (scoped ?? []).map((r) => r.id)
    if (targetIds.length !== studentIds.length) {
      return {
        success: false,
        error: 'Some selected students are outside your school — nothing was updated.',
      }
    }
  }

  const { error } = await supabase
    .from('users')
    .update(patch)
    .in('id', targetIds)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/students')
  revalidatePath('/dashboard/school-admin')
  return { success: true, updated: targetIds.length }
}
