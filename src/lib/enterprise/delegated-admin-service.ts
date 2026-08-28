// ============================================================================
// ExamForge AI — Enterprise Delegated Admin Service
// ============================================================================
// Manages delegated administration rights at the organization level.
// Enables granting admin roles to users at specific org nodes without
// changing their primary role in the profiles table.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { success, failure, type Result } from '@/lib/api/result'
import type { UserRole } from '@/lib/types'
import type {
  DelegatedAdmin,
  EffectivePermissions,
  GrantDelegatedAdminInput,
  DelegationScope,
} from './types'

// ──────────────────────────────────────────────────────────────
// Database Row Type
// ──────────────────────────────────────────────────────────────

interface DelegatedAdminRow {
  id: string
  user_id: string
  organization_id: string
  roles: string[]
  scope: DelegationScope
  granted_by: string
  granted_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to domain type
// ──────────────────────────────────────────────────────────────

function mapRowToDelegatedAdmin(row: DelegatedAdminRow): DelegatedAdmin {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    roles: row.roles as UserRole[],
    scope: row.scope,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  }
}

// ──────────────────────────────────────────────────────────────
// Role Hierarchy
// ──────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  parent: 1,
  teacher: 2,
  school_admin: 3,
  super_admin: 4,
}

// ──────────────────────────────────────────────────────────────
// grantDelegatedAdmin
// ──────────────────────────────────────────────────────────────

/**
 * Grants delegated admin rights to a user at a specific organization level.
 * Validates that the granter has sufficient permissions and that the
 * target organization exists and is active.
 */
export async function grantDelegatedAdmin(
  input: GrantDelegatedAdminInput
): Promise<Result<DelegatedAdmin>> {
  try {
    const supabase = await createClient()

    // Verify the target organization exists and is active
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, is_active')
      .eq('id', input.organizationId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${input.organizationId}`))
    }

    if (!org.is_active) {
      return failure(new Error('Cannot grant delegated admin for inactive organization'))
    }

    // Verify the user being granted access exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', input.userId)
      .single()

    if (userError || !targetUser) {
      return failure(new Error(`User not found: ${input.userId}`))
    }

    // Verify the granter has permission to delegate at this level
    const { data: granterProfile } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', input.grantedBy)
      .single()

    if (!granterProfile) {
      return failure(new Error(`Granter not found: ${input.grantedBy}`))
    }

    const granterRole = granterProfile.role as UserRole

    // Only super_admin and school_admin can delegate
    if (granterRole !== 'super_admin' && granterRole !== 'school_admin') {
      return failure(new Error('Only super_admin or school_admin can grant delegated admin rights'))
    }

    // Validate that delegated roles are not higher than granter's role
    for (const role of input.roles) {
      if (ROLE_HIERARCHY[role] > ROLE_HIERARCHY[granterRole]) {
        return failure(
          new Error(`Cannot delegate role '${role}' — it exceeds granter's role level`)
        )
      }
    }

    // Check for existing active delegation (avoid duplicates)
    const { data: existing } = await supabase
      .from('delegated_admins')
      .select('id')
      .eq('user_id', input.userId)
      .eq('organization_id', input.organizationId)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      // Update the existing delegation instead of creating a duplicate
      const { data: updated, error: updateError } = await supabase
        .from('delegated_admins')
        .update({
          roles: input.roles,
          scope: input.scope,
          expires_at: input.expiresAt ?? null,
          granted_by: input.grantedBy,
          granted_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError || !updated) {
        return failure(new Error(`Failed to update existing delegation: ${updateError?.message ?? 'Unknown error'}`))
      }

      return success(mapRowToDelegatedAdmin(updated as DelegatedAdminRow))
    }

    // Create new delegation
    const { data: newDelegation, error: insertError } = await supabase
      .from('delegated_admins')
      .insert({
        user_id: input.userId,
        organization_id: input.organizationId,
        roles: input.roles,
        scope: input.scope,
        granted_by: input.grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: input.expiresAt ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !newDelegation) {
      return failure(new Error(`Failed to create delegation: ${insertError?.message ?? 'Unknown error'}`))
    }

    return success(mapRowToDelegatedAdmin(newDelegation as DelegatedAdminRow))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error granting delegated admin')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// revokeDelegatedAdmin
// ──────────────────────────────────────────────────────────────

/**
 * Revokes a delegated admin record by setting is_active = false.
 */
export async function revokeDelegatedAdmin(
  id: string
): Promise<Result<{ revoked: boolean }>> {
  try {
    const supabase = await createClient()

    // Verify the delegation exists
    const { data: existing, error: fetchError } = await supabase
      .from('delegated_admins')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return failure(new Error(`Delegation not found: ${id}`))
    }

    if (!existing.is_active) {
      return success({ revoked: true }) // Already revoked
    }

    const { error: updateError } = await supabase
      .from('delegated_admins')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      return failure(new Error(`Failed to revoke delegation: ${updateError.message}`))
    }

    return success({ revoked: true })
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error revoking delegated admin')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getDelegatedAdmins
// ──────────────────────────────────────────────────────────────

/**
 * Lists all delegated admins for a given organization.
 * Only returns currently active and non-expired delegations.
 */
export async function getDelegatedAdmins(
  orgId: string
): Promise<Result<DelegatedAdmin[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('delegated_admins')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (error) {
      return failure(new Error(`Failed to fetch delegated admins: ${error.message}`))
    }

    const delegations = (data as DelegatedAdminRow[] ?? []).map(mapRowToDelegatedAdmin)

    // Filter out expired delegations
    const now = new Date()
    const activeDelegations = delegations.filter(d => {
      if (!d.expiresAt) return true
      return new Date(d.expiresAt) > now
    })

    return success(activeDelegations)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching delegated admins')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// validateDelegatedAccess
// ──────────────────────────────────────────────────────────────

/**
 * Validates that a user has delegated access with a specific role
 * at a given organization. Checks direct delegations and inherited
 * delegations from ancestor organizations.
 */
export async function validateDelegatedAccess(
  userId: string,
  orgId: string,
  requiredRole: UserRole
): Promise<Result<boolean>> {
  try {
    const supabase = await createClient()

    const now = new Date()

    // Check for direct delegation at this org
    const { data: directDelegations, error: directError } = await supabase
      .from('delegated_admins')
      .select('roles, scope, expires_at')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_active', true)

    if (directError) {
      return failure(new Error(`Delegation lookup failed: ${directError.message}`))
    }

    const requiredLevel = ROLE_HIERARCHY[requiredRole]

    // Check direct delegations
    if (directDelegations) {
      for (const del of directDelegations) {
        // Check expiry
        if (del.expires_at && new Date(del.expires_at) <= now) continue

        for (const role of del.roles as UserRole[]) {
          if (ROLE_HIERARCHY[role] >= requiredLevel) {
            return success(true)
          }
        }
      }
    }

    // Check inherited delegations from ancestor organizations
    const { data: org } = await supabase
      .from('organizations')
      .select('path')
      .eq('id', orgId)
      .maybeSingle()

    if (org?.path) {
      const pathIds = org.path.split('/').filter(Boolean)

      // Get delegations from ancestor orgs that have descendants scope
      if (pathIds.length > 1) {
        const { data: ancestorDelegations } = await supabase
          .from('delegated_admins')
          .select('organization_id, roles, scope, expires_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .in('scope', ['descendants', 'own_and_descendants'])
          .in('organization_id', pathIds)

        if (ancestorDelegations && ancestorDelegations.length > 0) {
          const { data: ancestorOrgs } = await supabase
            .from('organizations')
            .select('id, path')
            .in('id', ancestorDelegations.map((d: { organization_id: string }) => d.organization_id))

          const ancestorPathMap = new Map<string, string>()
          for (const a of (ancestorOrgs ?? [])) {
            ancestorPathMap.set(a.id, a.path)
          }

          for (const del of ancestorDelegations) {
            // Check expiry
            if (del.expires_at && new Date(del.expires_at) <= now) continue

            const ancestorPath = ancestorPathMap.get(del.organization_id)
            if (!ancestorPath) continue

            // Check if this org is a descendant of the delegation's org
            if (org.path.startsWith(`${ancestorPath}/`)) {
              for (const role of del.roles as UserRole[]) {
                if (ROLE_HIERARCHY[role] >= requiredLevel) {
                  return success(true)
                }
              }
            }
          }
        }
      }
    }

    return success(false)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error validating delegated access')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getEffectivePermissions
// ──────────────────────────────────────────────────────────────

/**
 * Computes effective permissions for a user at a given organization.
 * Combines: direct role + delegated roles + inherited roles from ancestors.
 */
export async function getEffectivePermissions(
  userId: string,
  orgId: string
): Promise<Result<EffectivePermissions>> {
  try {
    const supabase = await createClient()

    const now = new Date()

    // Get the user's primary role
    const { data: profile } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', userId)
      .single()

    const primaryRole = (profile?.role as UserRole) ?? 'student'

    // Collect all effective roles
    const effectiveRoles = new Set<UserRole>([primaryRole])

    // Get direct delegations at this org
    const { data: directDelegations } = await supabase
      .from('delegated_admins')
      .select('roles, scope, expires_at')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_active', true)

    if (directDelegations) {
      for (const del of directDelegations) {
        if (del.expires_at && new Date(del.expires_at) <= now) continue
        for (const role of del.roles as UserRole[]) {
          effectiveRoles.add(role)
        }
      }
    }

    // Get inherited delegations from ancestor orgs
    const { data: org } = await supabase
      .from('organizations')
      .select('path')
      .eq('id', orgId)
      .maybeSingle()

    if (org?.path) {
      const pathIds = org.path.split('/').filter(Boolean)

      if (pathIds.length > 1) {
        const { data: ancestorDelegations } = await supabase
          .from('delegated_admins')
          .select('organization_id, roles, scope, expires_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .in('scope', ['descendants', 'own_and_descendants'])
          .in('organization_id', pathIds)

        if (ancestorDelegations && ancestorDelegations.length > 0) {
          const { data: ancestorOrgs } = await supabase
            .from('organizations')
            .select('id, path')
            .in('id', ancestorDelegations.map((d: { organization_id: string }) => d.organization_id))

          const ancestorPathMap = new Map<string, string>()
          for (const a of (ancestorOrgs ?? [])) {
            ancestorPathMap.set(a.id, a.path)
          }

          for (const del of ancestorDelegations) {
            if (del.expires_at && new Date(del.expires_at) <= now) continue

            const ancestorPath = ancestorPathMap.get(del.organization_id)
            if (!ancestorPath) continue

            if (org.path.startsWith(`${ancestorPath}/`) || org.path === ancestorPath) {
              for (const role of del.roles as UserRole[]) {
                effectiveRoles.add(role)
              }
            }
          }
        }
      }
    }

    const isSuperAdmin = effectiveRoles.has('super_admin')
    const isAdmin = isSuperAdmin || effectiveRoles.has('school_admin')

    // Build permission strings
    const permissions = buildDelegatedPermissionStrings(Array.from(effectiveRoles))

    // Get cross-campus access targets
    const { data: crossCampusPerms } = await supabase
      .from('cross_campus_permissions')
      .select('target_org_id')
      .eq('user_id', userId)
      .eq('is_active', true)

    const crossCampusAccess = [...new Set(
      (crossCampusPerms ?? []).map((p: { target_org_id: string }) => p.target_org_id)
    )]

    const effectivePermissions: EffectivePermissions = {
      roles: Array.from(effectiveRoles),
      permissions,
      isSuperAdmin,
      isAdmin,
      crossCampusAccess,
    }

    return success(effectivePermissions)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error computing effective permissions')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Build permission strings from roles
// ──────────────────────────────────────────────────────────────

function buildDelegatedPermissionStrings(roles: UserRole[]): string[] {
  const permissions = new Set<string>()

  if (roles.includes('student')) {
    const studentPerms = [
      'exams.view', 'exams.take', 'results.own', 'profile.own',
      'notifications.own', 'practice.access', 'ai.tutor',
      'study_planner.own', 'flashcards.own', 'certificates.own',
    ]
    studentPerms.forEach(p => permissions.add(p))
  }

  if (roles.includes('parent')) {
    const parentPerms = [
      'children.view', 'children.progress', 'attendance.view',
      'fees.view', 'messaging.access', 'notifications.own',
      'profile.own', 'ai.advisor',
    ]
    parentPerms.forEach(p => permissions.add(p))
  }

  if (roles.includes('teacher')) {
    const teacherPerms = [
      'exams.create', 'exams.view', 'exams.edit', 'exams.publish',
      'questions.create', 'questions.view', 'questions.edit',
      'students.view', 'students.grade', 'results.view', 'results.export',
      'lesson_plans.create', 'worksheets.create', 'rubrics.create',
      'ai.question_gen', 'ai.lesson_plan', 'ai.grading',
      'attendance.manage', 'notifications.own', 'profile.own',
      'marketplace.access', 'cbt.manage',
    ]
    teacherPerms.forEach(p => permissions.add(p))
  }

  if (roles.includes('school_admin')) {
    const adminPerms = [
      'exams.*', 'questions.*', 'students.*', 'teachers.*', 'parents.*',
      'results.*', 'analytics.*', 'reports.*', 'billing.view',
      'settings.manage', 'attendance.*', 'fees.*', 'calendar.*',
      'timetable.*', 'classes.*', 'marketplace.*', 'cbt.*',
      'ai.*', 'notifications.*', 'branding.manage',
    ]
    adminPerms.forEach(p => permissions.add(p))
  }

  if (roles.includes('super_admin')) {
    permissions.add('*')
  }

  return Array.from(permissions).sort()
}
