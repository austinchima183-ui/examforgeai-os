import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiAuth,
  requireApiRole,
  deriveTenantContext,
  validateTenantAccess,
  createSafeErrorResponse,
  rateLimitError,
  forbiddenError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateId, validateInput, parseJsonBody } from '@/lib/api/validate'
import { isSuccess } from '@/lib/api/result'
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/enterprise/organization-service'
import type { UpdateOrganizationInput } from '@/lib/enterprise/types'
import { updateOrganizationSchema } from '@/lib/validators/api-schemas'
import { enforceCsrf } from '@/lib/api/csrf-guard'


// GET /api/organizations/[id] — Get single organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const idResult = validateId(id, 'organizationId')
    if ('error' in idResult) return idResult.error

    // Tenant access check: user can only view orgs they belong to
    // (super_admin can view any org)
    const tenant = deriveTenantContext(auth)
    if (!validateTenantAccess(auth, idResult.data, tenant.schoolId)) {
      return forbiddenError('You do not have access to this organization')
    }

    const result = await getOrganization(idResult.data)

    if (!isSuccess(result)) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json(result.value)
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'organizations/[id]:GET' }), { status: 500 })
  }
}

// PATCH /api/organizations/[id] — Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (super_admin only)
    const auth = await requireApiRole(request, ['super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const { id } = await params
    const idResult = validateId(id, 'organizationId')
    if ('error' in idResult) return idResult.error

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(updateOrganizationSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    const input: UpdateOrganizationInput = {
      name: body.name,
      code: (rawBody as Record<string, unknown>).code as string | undefined,
      metadata: (rawBody as Record<string, unknown>).metadata as Record<string, unknown> | null,
      settings: body.settings as Record<string, unknown> | null,
      branding: (rawBody as Record<string, unknown>).branding as Record<string, unknown> | null,
      is_active: ((rawBody as Record<string, unknown>).isActive as boolean | undefined) ?? null,
    }

    const result = await updateOrganization(idResult.data, input)

    if (!isSuccess(result)) {
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 400 })
    }

    return NextResponse.json(result.value)
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'organizations/[id]:PATCH' }), { status: 500 })
  }
}

// DELETE /api/organizations/[id] — Delete organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (super_admin only)
    const auth = await requireApiRole(request, ['super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const { id } = await params
    const idResult = validateId(id, 'organizationId')
    if ('error' in idResult) return idResult.error

    const result = await deleteOrganization(idResult.data)

    if (!isSuccess(result)) {
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: idResult.data })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'organizations/[id]:DELETE' }), { status: 500 })
  }
}
