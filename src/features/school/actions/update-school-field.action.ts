'use server'

import { revalidatePath } from 'next/cache'
import { requireAnyRole } from '@/lib/auth/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

// ============================================================================
// ExamForge AI — School Settings Server Action (Ω-3: autosave writes)
// ============================================================================
// Follows the app's established admin-write pattern (same as
// /api/admin/users PUT): session-verified role check + explicit school-scope
// verification authorize the write; the service client performs it. The
// users/schools RLS policies are read-only for school admins on this
// instance, so user-scoped writes silently update 0 rows (verified by probe)
// — the service client with explicit authz is the correct production path.
// ============================================================================

/** Editable field whitelist — prevents arbitrary column writes. */
const EDITABLE_FIELDS = [
  'name',
  'motto',
  'address',
  'city',
  'state',
  'country',
  'email',
  'phone',
  'website',
  'principal_name',
  'registration_number',
]

const MAX_LENGTHS: Record<string, number> = {
  name: 160,
  motto: 240,
  address: 240,
  city: 80,
  state: 80,
  country: 80,
  email: 160,
  phone: 40,
  website: 200,
  principal_name: 120,
  registration_number: 80,
}

export interface UpdateSchoolFieldResult {
  success: boolean
  error?: string
}

export async function updateSchoolField(
  schoolId: string,
  field: string,
  value: string
): Promise<UpdateSchoolFieldResult> {
  // ── Auth: school admins (own school) or super admins ──
  const auth = await requireAnyRole(['school_admin', 'super_admin'])
  if (!auth) {
    return { success: false, error: 'Unauthorized' }
  }
  if (auth.user.role === 'school_admin' && auth.user.schoolId !== schoolId) {
    return { success: false, error: 'Forbidden — you can only edit your own school' }
  }

  // ── Field whitelist ──
  if (!EDITABLE_FIELDS.includes(field)) {
    return { success: false, error: `Field "${field}" is not editable` }
  }

  // ── Value validation ──
  const trimmed = value.trim()
  const maxLen = MAX_LENGTHS[field] ?? 160
  if (trimmed.length > maxLen) {
    return { success: false, error: `Too long (max ${maxLen} characters)` }
  }
  if (field === 'email' && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: 'Invalid email address' }
  }
  if (field === 'website' && trimmed && !/^https?:\/\/|^www\./.test(trimmed)) {
    return { success: false, error: 'Website must start with http://, https:// or www.' }
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return {
      success: false,
      error: 'School profile edits require the admin database connection. Your change is kept in the editor — use Save to retry.',
    }
  }

  const { error } = await supabase
    .from('schools')
    .update({ [field]: trimmed, updated_at: new Date().toISOString() })
    .eq('id', schoolId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/school/settings')
  revalidatePath('/dashboard/school-admin')
  return { success: true }
}
