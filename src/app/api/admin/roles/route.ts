import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'
import { requireFeature } from '@/lib/billing/plan-gate'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Role Permissions API Route
// ============================================================================
// GET /api/admin/roles - Get all role permissions (super_admin only)
// PUT /api/admin/roles - Update role permission (super_admin only)
// ============================================================================

// Zod schema for PUT body
const RolePermissionUpdateSchema = z.object({
  role: z.enum(['student', 'parent', 'teacher', 'school_admin', 'super_admin']),
  resource: z.string().min(1).max(100),
  action: z.string().min(1).max(100),
  isAllowed: z.boolean(),
}).strict()

// GET /api/admin/roles - Get all role permissions
export async function GET(request: NextRequest) {
  // ─── Feature gate: Custom roles requires Enterprise ───
  const featureDenial = await requireFeature('custom_roles', request)
  if (featureDenial) return featureDenial

  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: super_admin only
    const auth = await requireApiRole(request, ['super_admin'])
    if (auth instanceof NextResponse) return auth

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role', { ascending: true })
      .order('resource', { ascending: true })
      .order('action', { ascending: true })
    if (error) throw new Error(error.message)

    const permissionRows = permissions ?? []

    // Group by role
    const roles = ['student', 'parent', 'teacher', 'school_admin', 'super_admin'] as const
    const resources = [...new Set(permissionRows.map(p => p.resource))]
    const actions = [...new Set(permissionRows.map(p => p.action))]

    // Build matrix
    const matrix = roles.map(role => ({
      role,
      permissions: resources.map(resource => ({
        resource,
        actions: actions.map(action => ({
          action,
          isAllowed: permissionRows.some(p => p.role === role && p.resource === resource && p.action === action && p.is_allowed),
        })),
      })),
    }))

    return NextResponse.json({ roles, resources, actions, matrix, permissions: toCamelRows(permissionRows) })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'admin/roles GET' }), { status: 500 })
  }
}

// PUT /api/admin/roles - Update role permission
export async function PUT(request: NextRequest) {
  // ─── Feature gate: Custom roles requires Enterprise ───
  const featureDenial = await requireFeature('custom_roles', request)
  if (featureDenial) return featureDenial

  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: super_admin only
    const auth = await requireApiRole(request, ['super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Derive userId from session for audit log (NEVER accept from client)
    const tenant = deriveTenantContext(auth)
    const userId = tenant.userId

    // Validate input — strict schema removes client-provided userId
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(RolePermissionUpdateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const { role, resource, action, isAllowed } = bodyResult.data

    // Upsert (select-then-update-or-insert — Supabase has no native upsert chain here)
    const { data: existing, error: findError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', role)
      .eq('resource', resource)
      .eq('action', action)
      .maybeSingle()
    if (findError) throw new Error(findError.message)

    let result
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('role_permissions')
        .update({ is_allowed: isAllowed })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (updateError || !updated) {
        throw new Error(updateError?.message ?? 'Failed to update role permission')
      }
      result = updated
    } else {
      const { data: created, error: insertError } = await supabase
        .from('role_permissions')
        .insert({ role, resource, action, is_allowed: isAllowed })
        .select('*')
        .single()
      if (insertError || !created) {
        throw new Error(insertError?.message ?? 'Failed to create role permission')
      }
      result = created
    }

    // Audit log — userId derived from server session, not client input
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'role_change',
      entity: 'role_permission',
      entity_id: result.id,
      details: JSON.stringify({ role, resource, action, isAllowed }),
    })
    if (auditError) throw new Error(auditError.message)

    return NextResponse.json(toCamelRow(result))
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'admin/roles PUT' }), { status: 500 })
  }
}
