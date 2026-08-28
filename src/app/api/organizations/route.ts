import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isSuccess } from '@/lib/api/result'
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import {
  searchOrganizations,
  createOrganization,
} from '@/lib/enterprise/organization-service'
import type { OrganizationType, OrganizationSearchFilters, CreateOrganizationInput } from '@/lib/enterprise/types'
import { createOrganizationSchema } from '@/lib/validators/api-schemas'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/organizations — List organizations with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit } = validatePagination(searchParams)
    const type = searchParams.get('type') as OrganizationType | null
    const parentId = searchParams.get('parentId')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const filters: OrganizationSearchFilters = {}
    if (type) filters.type = type
    if (parentId) filters.parentId = parentId
    if (isActive !== null) filters.isActive = isActive === 'true'

    const result = await searchOrganizations(search || '', filters)

    if (!isSuccess(result)) {
      return NextResponse.json({ error: 'Failed to search organizations' }, { status: 400 })
    }

    const organizations = result.value
    const start = (page - 1) * limit
    const paginated = organizations.slice(start, start + limit)

    return NextResponse.json({
      organizations: paginated,
      total: organizations.length,
      page,
      limit,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/organizations — Create organization
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(createOrganizationSchema, rawBody)
    if ('error' in input) return input.error

    const createInput: CreateOrganizationInput = {
      parentId: input.data.parentId ?? null,
      type: input.data.type,
      name: input.data.name,
      code: input.data.code,
      metadata: input.data.metadata ?? null,
      settings: input.data.settings ?? null,
      branding: input.data.branding ?? null,
    }

    const result = await createOrganization(createInput)

    if (!isSuccess(result)) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 400 })
    }

    return NextResponse.json(result.value, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create organization', details: String(error) },
      { status: 500 }
    )
  }
}
