// ============================================================================
// ExamForge AI — Enterprise Organization Service
// ============================================================================
// Production service for organization CRUD operations, hierarchy management,
// and tenant context resolution. Uses materialized path pattern for efficient
// tree queries with Supabase + PostgreSQL.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { success, failure, type Result } from '@/lib/api/result'
import type { UserRole } from '@/lib/types'
import type {
  OrganizationNode,
  OrganizationTreeNode,
  TenantContext,
  EffectivePermissions,
  DelegatedAdmin,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationSearchFilters,
  OrganizationType,
  OrganizationSettings,
  OrganizationBranding,
  OrganizationMetadata,
} from './types'
import {
  VALID_PARENT_TYPES,
} from './types'

// ──────────────────────────────────────────────────────────────
// Database Row Type (maps to Supabase 'organizations' table)
// ──────────────────────────────────────────────────────────────

interface OrganizationRow {
  id: string
  parent_id: string | null
  type: OrganizationType
  name: string
  code: string
  path: string
  level: number
  metadata: Record<string, unknown> | null
  settings: Record<string, unknown> | null
  branding: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to domain type
// ──────────────────────────────────────────────────────────────

function mapRowToNode(row: OrganizationRow): OrganizationNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    type: row.type,
    name: row.name,
    code: row.code,
    path: row.path,
    level: row.level,
    metadata: (row.metadata as unknown as OrganizationMetadata) ?? {},
    settings: (row.settings as unknown as OrganizationSettings) ?? {} as OrganizationSettings,
    branding: (row.branding as unknown as OrganizationBranding) ?? {} as OrganizationBranding,
    is_active: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Compute materialized path
// ──────────────────────────────────────────────────────────────

function computePath(parentPath: string | null, newId: string): string {
  if (!parentPath) {
    return `/${newId}`
  }
  return `${parentPath}/${newId}`
}

// ──────────────────────────────────────────────────────────────
// Helper: Parse materialized path to array of IDs
// ──────────────────────────────────────────────────────────────

function parsePathToIds(path: string): string[] {
  return path.split('/').filter(Boolean)
}

// ──────────────────────────────────────────────────────────────
// createOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Creates a new organization node in the hierarchy.
 * Validates parent-child relationship and computes materialized path.
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<Result<OrganizationNode>> {
  try {
    const supabase = await createClient()

    // Validate parent-child relationship
    if (input.parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('organizations')
        .select('id, type, path, level, is_active')
        .eq('id', input.parentId)
        .single()

      if (parentError || !parent) {
        return failure(new Error(`Parent organization not found: ${input.parentId}`))
      }

      if (!parent.is_active) {
        return failure(new Error('Cannot create child under inactive parent organization'))
      }

      const validParents = VALID_PARENT_TYPES[input.type]
      if (validParents.length > 0 && !validParents.includes(parent.type as OrganizationType)) {
        return failure(
          new Error(
            `Invalid parent type '${parent.type}' for organization type '${input.type}'. ` +
            `Valid parent types: ${validParents.join(', ')}`
          )
        )
      }

      // Check for duplicate code within the same parent
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('parent_id', input.parentId)
        .eq('code', input.code)
        .maybeSingle()

      if (existing) {
        return failure(new Error(`Organization code '${input.code}' already exists under this parent`))
      }
    } else {
      // Root org — validate that the type can be a root
      const validParents = VALID_PARENT_TYPES[input.type]
      if (validParents.length > 0) {
        return failure(
          new Error(`Organization type '${input.type}' cannot be a root organization`)
        )
      }
    }

    // Compute path and level
    let parentPath: string | null = null
    let level = 0

    if (input.parentId) {
      const { data: parent } = await supabase
        .from('organizations')
        .select('path, level')
        .eq('id', input.parentId)
        .single()

      parentPath = parent?.path ?? null
      level = (parent?.level ?? 0) + 1
    }

    // Insert with a temporary ID that we'll use for the path
    const { data: newOrg, error: insertError } = await supabase
      .from('organizations')
      .insert({
        parent_id: input.parentId,
        type: input.type,
        name: input.name,
        code: input.code,
        path: '__pending__', // temporary, will update after we get the ID
        level,
        metadata: input.metadata ?? {},
        settings: input.settings ?? {},
        branding: input.branding ?? {},
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !newOrg) {
      return failure(new Error(`Failed to create organization: ${insertError?.message ?? 'Unknown error'}`))
    }

    // Compute the real materialized path with the actual ID
    const materializedPath = computePath(parentPath, newOrg.id)

    // Update the path
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({ path: materializedPath })
      .eq('id', newOrg.id)
      .select()
      .single()

    if (updateError || !updatedOrg) {
      // Path update failed — attempt to clean up the incomplete record
      await supabase.from('organizations').delete().eq('id', newOrg.id)
      return failure(new Error(`Failed to set organization path: ${updateError?.message ?? 'Unknown error'}`))
    }

    return success(mapRowToNode(updatedOrg as OrganizationRow))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error creating organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Gets a single organization by ID with full hierarchy path information.
 */
export async function getOrganization(
  id: string
): Promise<Result<OrganizationNode>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return failure(new Error(`Organization not found: ${id}`))
    }

    return success(mapRowToNode(data as OrganizationRow))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// updateOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Updates an organization's settings, branding, or metadata.
 * Cannot change type or parent — use moveOrganization for that.
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<Result<OrganizationNode>> {
  try {
    const supabase = await createClient()

    // Verify the organization exists
    const { data: existing, error: fetchError } = await supabase
      .from('organizations')
      .select('id, code')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return failure(new Error(`Organization not found: ${id}`))
    }

    // Build update object (only include fields that are provided)
    const update: Record<string, unknown> = {}

    if (input.name !== undefined && input.name !== null) {
      update.name = input.name
    }

    if (input.code !== undefined && input.code !== null) {
      // Check for code uniqueness if changing
      if (input.code !== existing.code) {
        const { data: parentData } = await supabase
          .from('organizations')
          .select('parent_id')
          .eq('id', id)
          .single()

        if (parentData?.parent_id) {
          const { data: duplicate } = await supabase
            .from('organizations')
            .select('id')
            .eq('parent_id', parentData.parent_id)
            .eq('code', input.code)
            .neq('id', id)
            .maybeSingle()

          if (duplicate) {
            return failure(new Error(`Organization code '${input.code}' already exists under the same parent`))
          }
        }
      }
      update.code = input.code
    }

    if (input.metadata !== undefined && input.metadata !== null) {
      update.metadata = input.metadata
    }

    if (input.settings !== undefined && input.settings !== null) {
      update.settings = input.settings
    }

    if (input.branding !== undefined && input.branding !== null) {
      update.branding = input.branding
    }

    if (input.is_active !== undefined && input.is_active !== null) {
      update.is_active = input.is_active
    }

    if (Object.keys(update).length === 0) {
      // Nothing to update — just return the current state
      return getOrganization(id)
    }

    const { data, error: updateError } = await supabase
      .from('organizations')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !data) {
      return failure(new Error(`Failed to update organization: ${updateError?.message ?? 'Unknown error'}`))
    }

    return success(mapRowToNode(data as OrganizationRow))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error updating organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// deleteOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Soft-deletes an organization by setting is_active = false.
 * Also deactivates all descendant organizations in the subtree.
 */
export async function deleteOrganization(
  id: string
): Promise<Result<{ deactivatedIds: string[] }>> {
  try {
    const supabase = await createClient()

    // Verify the organization exists
    const { data: existing, error: fetchError } = await supabase
      .from('organizations')
      .select('id, path')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return failure(new Error(`Organization not found: ${id}`))
    }

    const deactivatedIds: string[] = [id]

    // Deactivate all descendants (organizations whose path starts with this org's path)
    const descendantPathPrefix = `${existing.path}/`
    const { data: descendants, error: descError } = await supabase
      .from('organizations')
      .update({ is_active: false })
      .like('path', `${descendantPathPrefix}%`)
      .eq('is_active', true)
      .select('id')

    if (descError) {
      return failure(new Error(`Failed to deactivate descendants: ${descError.message}`))
    }

    if (descendants) {
      deactivatedIds.push(...descendants.map((d: { id: string }) => d.id))
    }

    // Deactivate the organization itself
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      return failure(new Error(`Failed to deactivate organization: ${updateError.message}`))
    }

    return success({ deactivatedIds })
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error deleting organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getOrganizationTree
// ──────────────────────────────────────────────────────────────

/**
 * Returns the full tree of organizations below a root organization.
 * Uses the materialized path for efficient subtree queries.
 */
export async function getOrganizationTree(
  rootId: string
): Promise<Result<OrganizationTreeNode>> {
  try {
    const supabase = await createClient()

    // Get the root organization
    const { data: root, error: rootError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', rootId)
      .single()

    if (rootError || !root) {
      return failure(new Error(`Organization not found: ${rootId}`))
    }

    // Get all descendants using path prefix match
    const rootPath = (root as OrganizationRow).path
    const descendantPathPrefix = `${rootPath}/`

    const { data: descendants, error: descError } = await supabase
      .from('organizations')
      .select('*')
      .or(`id.eq.${rootId},path.like.${descendantPathPrefix}%`)
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('name', { ascending: true })

    if (descError) {
      return failure(new Error(`Failed to fetch organization tree: ${descError.message}`))
    }

    // Build the tree structure
    const nodeMap = new Map<string, OrganizationTreeNode>()

    // Initialize all nodes
    for (const row of (descendants as OrganizationRow[]) ?? []) {
      const node = mapRowToNode(row)
      nodeMap.set(node.id, { ...node, children: [] })
    }

    // Build parent-child relationships
    let rootNode: OrganizationTreeNode | null = null

    for (const [, node] of nodeMap) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node)
      } else if (node.id === rootId) {
        rootNode = node
      }
    }

    if (!rootNode) {
      rootNode = { ...mapRowToNode(root as OrganizationRow), children: [] }
    }

    return success(rootNode)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization tree')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// moveOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Moves an organization to a new parent, recalculating all materialized paths
 * in the subtree. Validates the new parent-child relationship.
 */
export async function moveOrganization(
  id: string,
  newParentId: string | null
): Promise<Result<OrganizationNode>> {
  try {
    const supabase = await createClient()

    // Get the organization being moved
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${id}`))
    }

    const orgRow = org as OrganizationRow

    // Prevent moving to self
    if (id === newParentId) {
      return failure(new Error('Cannot move an organization under itself'))
    }

    // Validate new parent
    let newParentPath: string | null = null
    let newLevel = 0

    if (newParentId) {
      const { data: newParent, error: parentError } = await supabase
        .from('organizations')
        .select('id, type, path, level, is_active')
        .eq('id', newParentId)
        .single()

      if (parentError || !newParent) {
        return failure(new Error(`New parent organization not found: ${newParentId}`))
      }

      if (!newParent.is_active) {
        return failure(new Error('Cannot move under an inactive parent organization'))
      }

      // Prevent circular moves (new parent cannot be a descendant of the org being moved)
      if (newParent.path.startsWith(`${orgRow.path}/`)) {
        return failure(new Error('Cannot move an organization under its own descendant'))
      }

      const validParents = VALID_PARENT_TYPES[orgRow.type]
      if (validParents.length > 0 && !validParents.includes(newParent.type as OrganizationType)) {
        return failure(
          new Error(
            `Invalid parent type '${newParent.type}' for organization type '${orgRow.type}'`
          )
        )
      }

      newParentPath = newParent.path
      newLevel = newParent.level + 1
    } else {
      const validParents = VALID_PARENT_TYPES[orgRow.type]
      if (validParents.length > 0) {
        return failure(new Error(`Organization type '${orgRow.type}' cannot be a root organization`))
      }
    }

    // Calculate old path prefix and new path prefix
    const oldPathPrefix = orgRow.path
    const newPathPrefix = computePath(newParentPath, id)
    const levelDelta = newLevel - orgRow.level

    // Get all descendants to update their paths
    const descendantPathPrefix = `${oldPathPrefix}/`
    const { data: descendants, error: descError } = await supabase
      .from('organizations')
      .select('id, path, level')
      .like('path', `${descendantPathPrefix}%`)

    if (descError) {
      return failure(new Error(`Failed to fetch descendants for path update: ${descError.message}`))
    }

    // Update the organization itself
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        parent_id: newParentId,
        path: newPathPrefix,
        level: newLevel,
      })
      .eq('id', id)

    if (updateError) {
      return failure(new Error(`Failed to move organization: ${updateError.message}`))
    }

    // Update all descendants' paths and levels
    if (descendants && descendants.length > 0) {
      for (const desc of descendants as { id: string; path: string; level: number }[]) {
        const newPath = desc.path.replace(oldPathPrefix, newPathPrefix)
        const newDescLevel = desc.level + levelDelta

        await supabase
          .from('organizations')
          .update({ path: newPath, level: newDescLevel })
          .eq('id', desc.id)
      }
    }

    // Return the updated organization
    return getOrganization(id)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error moving organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getOrganizationChildren
// ──────────────────────────────────────────────────────────────

/**
 * Gets the direct children of an organization.
 */
export async function getOrganizationChildren(
  parentId: string
): Promise<Result<OrganizationNode[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return failure(new Error(`Failed to fetch children: ${error.message}`))
    }

    return success((data as OrganizationRow[] ?? []).map(mapRowToNode))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization children')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getOrganizationPath
// ──────────────────────────────────────────────────────────────

/**
 * Returns the materialized path as an array of organization nodes,
 * from root to the specified organization.
 */
export async function getOrganizationPath(
  id: string
): Promise<Result<OrganizationNode[]>> {
  try {
    const supabase = await createClient()

    // Get the organization to find its path
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('path')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${id}`))
    }

    const pathIds = parsePathToIds(org.path)

    if (pathIds.length === 0) {
      return success([])
    }

    // Fetch all organizations in the path
    const { data: pathOrgs, error: pathError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', pathIds)

    if (pathError) {
      return failure(new Error(`Failed to fetch organization path: ${pathError.message}`))
    }

    // Sort by level (which corresponds to the order in pathIds)
    const orgMap = new Map<string, OrganizationNode>()
    for (const row of (pathOrgs as OrganizationRow[]) ?? []) {
      orgMap.set(row.id, mapRowToNode(row))
    }

    const sortedPath = pathIds
      .map(pathId => orgMap.get(pathId))
      .filter((node): node is OrganizationNode => node !== undefined)

    return success(sortedPath)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization path')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// switchOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Validates that a user can switch to a target organization and
 * returns the TenantContext for the new organization.
 */
export async function switchOrganization(
  userId: string,
  targetOrgId: string
): Promise<Result<TenantContext>> {
  try {
    const supabase = await createClient()

    // Verify the target organization exists and is active
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', targetOrgId)
      .eq('is_active', true)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Target organization not found or inactive: ${targetOrgId}`))
    }

    // Validate that the user has access to this organization
    const accessResult = await validateTenantAccess(userId, targetOrgId)
    if (!accessResult.ok) {
      return failure(accessResult.error)
    }

    if (!accessResult.value) {
      return failure(new Error(`User ${userId} does not have access to organization ${targetOrgId}`))
    }

    // Build the tenant context
    const contextResult = await getTenantContext(userId, targetOrgId)
    return contextResult
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error switching organization')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getTenantContext
// ──────────────────────────────────────────────────────────────

/**
 * Builds the full TenantContext for a user within an organization.
 * Includes effective permissions, delegated roles, ancestor, and descendant IDs.
 */
export async function getTenantContext(
  userId: string,
  orgId: string
): Promise<Result<TenantContext>> {
  try {
    const supabase = await createClient()

    // Get the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const orgNode = mapRowToNode(org as OrganizationRow)

    // Parse ancestor IDs from materialized path
    const ancestorIds = parsePathToIds(orgNode.path).filter(id => id !== orgId)

    // Get descendant IDs
    const descendantPathPrefix = `${orgNode.path}/`
    const { data: descendants } = await supabase
      .from('organizations')
      .select('id')
      .like('path', `${descendantPathPrefix}%`)

    const descendantIds = (descendants ?? []).map((d: { id: string }) => d.id)

    // Get the user's role in the profiles table
    const { data: profile } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', userId)
      .single()

    const primaryRole = (profile?.role as UserRole) ?? 'student'

    // Get delegated admin roles for this user at this organization
    const { data: delegations } = await supabase
      .from('delegated_admins')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_active', true)

    const activeDelegations: DelegatedAdmin[] = (delegations ?? [])
      .filter((d: { expires_at: string | null }) => {
        if (!d.expires_at) return true
        return new Date(d.expires_at) > new Date()
      })
      .map((d: Record<string, unknown>) => ({
        id: d.id as string,
        userId: d.user_id as string,
        organizationId: d.organization_id as string,
        roles: d.roles as UserRole[],
        scope: d.scope as DelegatedAdmin['scope'],
        grantedBy: d.granted_by as string,
        grantedAt: d.granted_at as string,
        expiresAt: d.expires_at as string | null,
        isActive: d.is_active as boolean,
      }))

    // Compute effective permissions
    const effectiveRoles = new Set<UserRole>([primaryRole])
    for (const delegation of activeDelegations) {
      for (const role of delegation.roles) {
        effectiveRoles.add(role)
      }
    }

    const isSuperAdmin = effectiveRoles.has('super_admin')
    const isAdmin = isSuperAdmin || effectiveRoles.has('school_admin')

    // Build permission strings based on roles
    const permissions = buildPermissionStrings(Array.from(effectiveRoles))

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

    const tenantContext: TenantContext = {
      organizationId: orgNode.id,
      organizationType: orgNode.type,
      path: orgNode.path,
      permissions: effectivePermissions,
      delegatedRoles: activeDelegations,
      ancestorIds,
      descendantIds,
      resolvedAt: new Date().toISOString(),
    }

    return success(tenantContext)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error building tenant context')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// validateTenantAccess
// ──────────────────────────────────────────────────────────────

/**
 * Validates that a user has access to a target organization.
 * Checks: direct membership, delegated admin, cross-campus permissions,
 * and ancestry relationship to the user's home organization.
 */
export async function validateTenantAccess(
  userId: string,
  targetOrgId: string
): Promise<Result<boolean>> {
  try {
    const supabase = await createClient()

    // Get the user's profile
    const { data: profile } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', userId)
      .single()

    if (!profile) {
      return success(false)
    }

    const userRole = profile.role as UserRole

    // Super admins can access any organization
    if (userRole === 'super_admin') {
      return success(true)
    }

    // Check if the user's school is within the target organization's tree
    if (profile.school_id) {
      const { data: schoolOrg } = await supabase
        .from('organizations')
        .select('path')
        .eq('id', profile.school_id)
        .maybeSingle()

      const { data: targetOrg } = await supabase
        .from('organizations')
        .select('path')
        .eq('id', targetOrgId)
        .maybeSingle()

      if (schoolOrg && targetOrg) {
        // User can access if their school is a descendant of (or is) the target org
        if (
          schoolOrg.path === targetOrg.path ||
          schoolOrg.path.startsWith(`${targetOrg.path}/`)
        ) {
          return success(true)
        }

        // User can access if the target org is a descendant of their school's org
        // (e.g., a school admin accessing a department within their school)
        if (
          userRole === 'school_admin' &&
          targetOrg.path.startsWith(`${schoolOrg.path}/`)
        ) {
          return success(true)
        }
      }
    }

    // Check delegated admin access
    const { data: delegation } = await supabase
      .from('delegated_admins')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('organization_id', targetOrgId)
      .eq('is_active', true)
      .maybeSingle()

    if (delegation) {
      if (!delegation.expires_at || new Date(delegation.expires_at) > new Date()) {
        return success(true)
      }
    }

    // Check delegated admin with descendants scope
    const { data: descendantDelegations } = await supabase
      .from('delegated_admins')
      .select('organization_id, scope, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('scope', ['descendants', 'own_and_descendants'])

    if (descendantDelegations && descendantDelegations.length > 0) {
      const { data: targetOrg } = await supabase
        .from('organizations')
        .select('path')
        .eq('id', targetOrgId)
        .maybeSingle()

      if (targetOrg) {
        for (const del of descendantDelegations) {
          if (del.expires_at && new Date(del.expires_at) <= new Date()) continue

          const { data: delegateOrg } = await supabase
            .from('organizations')
            .select('path')
            .eq('id', del.organization_id)
            .maybeSingle()

          if (delegateOrg && targetOrg.path.startsWith(`${delegateOrg.path}/`)) {
            return success(true)
          }
        }
      }
    }

    // Check cross-campus permissions
    const { data: crossCampus } = await supabase
      .from('cross_campus_permissions')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('target_org_id', targetOrgId)
      .eq('is_active', true)
      .maybeSingle()

    if (crossCampus) {
      if (!crossCampus.expires_at || new Date(crossCampus.expires_at) > new Date()) {
        return success(true)
      }
    }

    return success(false)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error validating tenant access')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// searchOrganizations
// ──────────────────────────────────────────────────────────────

/**
 * Searches organizations by name, code, or type with optional filters.
 */
export async function searchOrganizations(
  query: string,
  filters?: OrganizationSearchFilters
): Promise<Result<OrganizationNode[]>> {
  try {
    const supabase = await createClient()

    let queryBuilder = supabase
      .from('organizations')
      .select('*')

    // Apply text search (name or code ILIKE)
    if (query.trim()) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,code.ilike.%${query}%`
      )
    }

    // Apply type filter
    if (filters?.type) {
      if (Array.isArray(filters.type)) {
        queryBuilder = queryBuilder.in('type', filters.type)
      } else {
        queryBuilder = queryBuilder.eq('type', filters.type)
      }
    }

    // Apply active filter
    if (filters?.isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', filters.isActive)
    }

    // Apply parent filter
    if (filters?.parentId) {
      queryBuilder = queryBuilder.eq('parent_id', filters.parentId)
    }

    // Apply level filter
    if (filters?.level !== undefined) {
      queryBuilder = queryBuilder.eq('level', filters.level)
    }

    // Apply path prefix filter
    if (filters?.pathPrefix) {
      queryBuilder = queryBuilder.like('path', `${filters.pathPrefix}%`)
    }

    const { data, error } = await queryBuilder
      .order('name', { ascending: true })
      .limit(100)

    if (error) {
      return failure(new Error(`Search failed: ${error.message}`))
    }

    return success((data as OrganizationRow[] ?? []).map(mapRowToNode))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error searching organizations')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Build permission strings from roles
// ──────────────────────────────────────────────────────────────

function buildPermissionStrings(roles: UserRole[]): string[] {
  const permissions = new Set<string>()

  // Student permissions
  if (roles.includes('student')) {
    const studentPerms = [
      'exams.view', 'exams.take', 'results.own', 'profile.own',
      'notifications.own', 'practice.access', 'ai.tutor',
      'study_planner.own', 'flashcards.own', 'certificates.own',
    ]
    studentPerms.forEach(p => permissions.add(p))
  }

  // Parent permissions
  if (roles.includes('parent')) {
    const parentPerms = [
      'children.view', 'children.progress', 'attendance.view',
      'fees.view', 'messaging.access', 'notifications.own',
      'profile.own', 'ai.advisor',
    ]
    parentPerms.forEach(p => permissions.add(p))
  }

  // Teacher permissions
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

  // School admin permissions
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

  // Super admin permissions
  if (roles.includes('super_admin')) {
    permissions.add('*')
  }

  return Array.from(permissions).sort()
}
