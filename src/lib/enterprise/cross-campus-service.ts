// ============================================================================
// ExamForge AI — Enterprise Cross-Campus Permission Service
// ============================================================================
// Manages cross-campus permissions that allow users to access resources
// in organizations other than their primary organization.
// Supports permission types like read, write, admin, exam_management, etc.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { success, failure, type Result } from '@/lib/api/result'
import type {
  CrossCampusPermission,
  CrossCampusPermissionType,
  GrantCrossCampusAccessInput,
  OrganizationNode,
} from './types'

// ──────────────────────────────────────────────────────────────
// Database Row Type
// ──────────────────────────────────────────────────────────────

interface CrossCampusPermissionRow {
  id: string
  user_id: string
  source_org_id: string
  target_org_id: string
  permission_type: CrossCampusPermissionType
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

function mapRowToCrossCampusPermission(row: CrossCampusPermissionRow): CrossCampusPermission {
  return {
    id: row.id,
    userId: row.user_id,
    sourceOrgId: row.source_org_id,
    targetOrgId: row.target_org_id,
    permissionType: row.permission_type,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  }
}

// ──────────────────────────────────────────────────────────────
// Permission hierarchy for access level comparison
// ──────────────────────────────────────────────────────────────

const PERMISSION_LEVELS: Record<CrossCampusPermissionType, number> = {
  read: 0,
  reporting: 1,
  student_data: 2,
  exam_management: 3,
  curriculum_management: 4,
  write: 5,
  admin: 6,
  full_access: 7,
}

// ──────────────────────────────────────────────────────────────
// grantCrossCampusAccess
// ──────────────────────────────────────────────────────────────

/**
 * Grants cross-campus access from a source organization to a target organization.
 * Validates that both organizations exist and are active, and that the
 * granter has sufficient permissions.
 */
export async function grantCrossCampusAccess(
  input: GrantCrossCampusAccessInput
): Promise<Result<CrossCampusPermission>> {
  try {
    const supabase = await createClient()

    // Verify source organization exists and is active
    const { data: sourceOrg, error: sourceError } = await supabase
      .from('organizations')
      .select('id, is_active')
      .eq('id', input.sourceOrgId)
      .single()

    if (sourceError || !sourceOrg) {
      return failure(new Error(`Source organization not found: ${input.sourceOrgId}`))
    }

    if (!sourceOrg.is_active) {
      return failure(new Error('Source organization is not active'))
    }

    // Verify target organization exists and is active
    const { data: targetOrg, error: targetError } = await supabase
      .from('organizations')
      .select('id, is_active')
      .eq('id', input.targetOrgId)
      .single()

    if (targetError || !targetOrg) {
      return failure(new Error(`Target organization not found: ${input.targetOrgId}`))
    }

    if (!targetOrg.is_active) {
      return failure(new Error('Target organization is not active'))
    }

    // Prevent self-granting (source and target are the same)
    if (input.sourceOrgId === input.targetOrgId) {
      return failure(new Error('Source and target organizations cannot be the same'))
    }

    // Verify the user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', input.userId)
      .single()

    if (userError || !targetUser) {
      return failure(new Error(`User not found: ${input.userId}`))
    }

    // Verify the granter has permission (must be school_admin or super_admin at source)
    const { data: granterProfile } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', input.grantedBy)
      .single()

    if (!granterProfile) {
      return failure(new Error(`Granter not found: ${input.grantedBy}`))
    }

    const granterRole = granterProfile.role as string
    if (granterRole !== 'super_admin' && granterRole !== 'school_admin') {
      return failure(new Error('Only super_admin or school_admin can grant cross-campus access'))
    }

    // Check for existing active permission between same source and target
    const { data: existing } = await supabase
      .from('cross_campus_permissions')
      .select('id, permission_type')
      .eq('user_id', input.userId)
      .eq('source_org_id', input.sourceOrgId)
      .eq('target_org_id', input.targetOrgId)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      // If existing permission is equal or higher, no need to grant again
      const existingLevel = PERMISSION_LEVELS[existing.permission_type as CrossCampusPermissionType]
      const newLevel = PERMISSION_LEVELS[input.permissionType]

      if (existingLevel >= newLevel) {
        // Return the existing permission as-is
        const { data: fullExisting } = await supabase
          .from('cross_campus_permissions')
          .select('*')
          .eq('id', existing.id)
          .single()

        return success(mapRowToCrossCampusPermission(fullExisting as CrossCampusPermissionRow))
      }

      // Upgrade the existing permission to the higher level
      const { data: updated, error: updateError } = await supabase
        .from('cross_campus_permissions')
        .update({
          permission_type: input.permissionType,
          granted_by: input.grantedBy,
          granted_at: new Date().toISOString(),
          expires_at: input.expiresAt ?? null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError || !updated) {
        return failure(new Error(`Failed to upgrade cross-campus permission: ${updateError?.message ?? 'Unknown error'}`))
      }

      return success(mapRowToCrossCampusPermission(updated as CrossCampusPermissionRow))
    }

    // Create new cross-campus permission
    const { data: newPermission, error: insertError } = await supabase
      .from('cross_campus_permissions')
      .insert({
        user_id: input.userId,
        source_org_id: input.sourceOrgId,
        target_org_id: input.targetOrgId,
        permission_type: input.permissionType,
        granted_by: input.grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: input.expiresAt ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !newPermission) {
      return failure(new Error(`Failed to create cross-campus permission: ${insertError?.message ?? 'Unknown error'}`))
    }

    return success(mapRowToCrossCampusPermission(newPermission as CrossCampusPermissionRow))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error granting cross-campus access')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// revokeCrossCampusAccess
// ──────────────────────────────────────────────────────────────

/**
 * Revokes a cross-campus permission by setting is_active = false.
 */
export async function revokeCrossCampusAccess(
  id: string
): Promise<Result<{ revoked: boolean }>> {
  try {
    const supabase = await createClient()

    // Verify the permission exists
    const { data: existing, error: fetchError } = await supabase
      .from('cross_campus_permissions')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return failure(new Error(`Cross-campus permission not found: ${id}`))
    }

    if (!existing.is_active) {
      return success({ revoked: true }) // Already revoked
    }

    const { error: updateError } = await supabase
      .from('cross_campus_permissions')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      return failure(new Error(`Failed to revoke cross-campus permission: ${updateError.message}`))
    }

    return success({ revoked: true })
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error revoking cross-campus access')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getCrossCampusPermissions
// ──────────────────────────────────────────────────────────────

/**
 * Gets all active cross-campus permissions for a user.
 * Returns permissions where the user is the recipient,
 * filtering out expired entries.
 */
export async function getCrossCampusPermissions(
  userId: string
): Promise<Result<CrossCampusPermission[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cross_campus_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (error) {
      return failure(new Error(`Failed to fetch cross-campus permissions: ${error.message}`))
    }

    const permissions = (data as CrossCampusPermissionRow[] ?? []).map(mapRowToCrossCampusPermission)

    // Filter out expired permissions
    const now = new Date()
    const activePermissions = permissions.filter(p => {
      if (!p.expiresAt) return true
      return new Date(p.expiresAt) > now
    })

    return success(activePermissions)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching cross-campus permissions')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// validateCrossCampusAccess
// ──────────────────────────────────────────────────────────────

/**
 * Validates that a user has cross-campus access from a source organization
 * to a target organization with at least the specified permission type.
 */
export async function validateCrossCampusAccess(
  userId: string,
  sourceOrgId: string,
  targetOrgId: string,
  permissionType: CrossCampusPermissionType
): Promise<Result<boolean>> {
  try {
    const supabase = await createClient()

    const now = new Date()
    const requiredLevel = PERMISSION_LEVELS[permissionType]

    // Look for active permissions from the source to the target
    const { data: permissions, error: permError } = await supabase
      .from('cross_campus_permissions')
      .select('permission_type, expires_at')
      .eq('user_id', userId)
      .eq('source_org_id', sourceOrgId)
      .eq('target_org_id', targetOrgId)
      .eq('is_active', true)

    if (permError) {
      return failure(new Error(`Cross-campus permission lookup failed: ${permError.message}`))
    }

    if (permissions) {
      for (const perm of permissions) {
        // Check expiry
        if (perm.expires_at && new Date(perm.expires_at) <= now) continue

        const permLevel = PERMISSION_LEVELS[perm.permission_type as CrossCampusPermissionType]
        if (permLevel >= requiredLevel) {
          return success(true)
        }
      }
    }

    // Also check for broader permissions from any source org
    // (e.g., if user has full_access from a parent org to the target)
    const { data: broaderPerms } = await supabase
      .from('cross_campus_permissions')
      .select('source_org_id, permission_type, expires_at')
      .eq('user_id', userId)
      .eq('target_org_id', targetOrgId)
      .eq('is_active', true)
      .neq('source_org_id', sourceOrgId)

    if (broaderPerms) {
      // Check if any of these source orgs are ancestors of the given source
      const { data: sourceOrg } = await supabase
        .from('organizations')
        .select('path')
        .eq('id', sourceOrgId)
        .maybeSingle()

      if (sourceOrg?.path) {
        const pathIds = sourceOrg.path.split('/').filter(Boolean)

        for (const perm of broaderPerms) {
          if (perm.expires_at && new Date(perm.expires_at) <= now) continue

          // If the broader permission's source org is an ancestor of the current source
          if (pathIds.includes(perm.source_org_id)) {
            const permLevel = PERMISSION_LEVELS[perm.permission_type as CrossCampusPermissionType]
            if (permLevel >= requiredLevel) {
              return success(true)
            }
          }
        }
      }
    }

    return success(false)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error validating cross-campus access')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getAccessibleOrganizations
// ──────────────────────────────────────────────────────────────

/**
 * Returns all organizations a user can access, including:
 * - Their primary organization (from profile.school_id)
 * - Organizations they have delegated admin access to
 * - Organizations they have cross-campus permissions to
 * - All descendant organizations of the above
 */
export async function getAccessibleOrganizations(
  userId: string
): Promise<Result<OrganizationNode[]>> {
  try {
    const supabase = await createClient()

    const accessibleOrgIds = new Set<string>()

    // 1. Get user's primary organization (school_id from profile)
    const { data: profile } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', userId)
      .single()

    if (profile?.school_id) {
      accessibleOrgIds.add(profile.school_id)

      // Get the org's path to find all ancestors
      const { data: schoolOrg } = await supabase
        .from('organizations')
        .select('path')
        .eq('id', profile.school_id)
        .maybeSingle()

      if (schoolOrg?.path) {
        // Add all ancestor org IDs from the path
        const pathIds = schoolOrg.path.split('/').filter(Boolean)
        pathIds.forEach((id: string) => accessibleOrgIds.add(id))

        // Add all descendant org IDs
        const { data: descendants } = await supabase
          .from('organizations')
          .select('id')
          .like('path', `${schoolOrg.path}/%`)
          .eq('is_active', true)

        descendants?.forEach((d: { id: string }) => accessibleOrgIds.add(d.id))
      }
    }

    // 2. Get organizations from delegated admin roles
    const { data: delegations } = await supabase
      .from('delegated_admins')
      .select('organization_id, scope, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    const now = new Date()

    if (delegations) {
      const activeDelegations = delegations.filter((d: { expires_at: string | null }) => {
        if (!d.expires_at) return true
        return new Date(d.expires_at) > now
      })

      for (const del of activeDelegations) {
        accessibleOrgIds.add(del.organization_id)

        // If scope includes descendants, add all descendant org IDs
        if (del.scope === 'descendants' || del.scope === 'own_and_descendants') {
          const { data: delOrg } = await supabase
            .from('organizations')
            .select('path')
            .eq('id', del.organization_id)
            .maybeSingle()

          if (delOrg?.path) {
            const { data: descendants } = await supabase
              .from('organizations')
              .select('id')
              .like('path', `${delOrg.path}/%`)
              .eq('is_active', true)

            descendants?.forEach((d: { id: string }) => accessibleOrgIds.add(d.id))
          }
        }
      }
    }

    // 3. Get organizations from cross-campus permissions
    const { data: crossCampusPerms } = await supabase
      .from('cross_campus_permissions')
      .select('target_org_id, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (crossCampusPerms) {
      const activePerms = crossCampusPerms.filter((p: { expires_at: string | null }) => {
        if (!p.expires_at) return true
        return new Date(p.expires_at) > now
      })

      activePerms.forEach((p: { target_org_id: string }) => {
        accessibleOrgIds.add(p.target_org_id)
      })
    }

    // 4. Super admins can access all active organizations
    if (profile?.role === 'super_admin') {
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('is_active', true)

      allOrgs?.forEach((o: { id: string }) => accessibleOrgIds.add(o.id))
    }

    // 5. Fetch all accessible organization details
    if (accessibleOrgIds.size === 0) {
      return success([])
    }

    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', Array.from(accessibleOrgIds))
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (orgError) {
      return failure(new Error(`Failed to fetch accessible organizations: ${orgError.message}`))
    }

    const organizationNodes: OrganizationNode[] = (orgs ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      parentId: row.parent_id as string | null,
      type: row.type as OrganizationNode['type'],
      name: row.name as string,
      code: row.code as string,
      path: row.path as string,
      level: row.level as number,
      metadata: (row.metadata ?? {}) as OrganizationNode['metadata'],
      settings: (row.settings ?? {}) as OrganizationNode['settings'],
      branding: (row.branding ?? {}) as OrganizationNode['branding'],
      is_active: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))

    return success(organizationNodes)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching accessible organizations')
    )
  }
}
