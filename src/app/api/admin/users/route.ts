import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput, validateId, validatePagination } from '@/lib/api/validate'
import { createUserSchema, updateUserSchema, adminUserQuerySchema } from '@/lib/validators/api-schemas'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { requireApiAuth } from '@/lib/api/auth-guard'

// GET /api/admin/users - List all users with filters (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(adminUserQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const role = queryResult.data.role
    const schoolId = queryResult.data.schoolId
    const status = queryResult.data.status
    const search = queryResult.data.search
    const page = queryResult.data.page
    const limit = queryResult.data.limit
    const skip = (page - 1) * limit

    // Embedded relations (Prisma include → PostgREST embeds).
    // parent_children has two FKs to users (parent_id / child_id) so both
    // directions must be disambiguated with explicit constraint names.
    const userSelect = `*, school:schools(id, name), parent_children!parent_children_parent_id_fkey(*, child:users!parent_children_child_id_fkey(id, full_name)), class_students(*, class:classes(id, name))`

    let usersQuery = supabase.from('users').select(userSelect)
    let countQuery = supabase.from('users').select('id', { count: 'exact', head: true })
    if (role) {
      usersQuery = usersQuery.eq('role', role)
      countQuery = countQuery.eq('role', role)
    }
    if (schoolId) {
      usersQuery = usersQuery.eq('school_id', schoolId)
      countQuery = countQuery.eq('school_id', schoolId)
    }
    if (status === 'active') {
      usersQuery = usersQuery.eq('is_active', true)
      countQuery = countQuery.eq('is_active', true)
    }
    if (status === 'inactive') {
      usersQuery = usersQuery.eq('is_active', false)
      countQuery = countQuery.eq('is_active', false)
    }
    if (search) {
      const pattern = `%${search}%`
      usersQuery = usersQuery.or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      countQuery = countQuery.or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    }

    const [usersResult, countResult] = await Promise.all([
      usersQuery.order('created_at', { ascending: false }).range(skip, skip + limit - 1),
      countQuery,
    ])

    if (usersResult.error) throw new Error(usersResult.error.message)
    if (countResult.error) throw new Error(countResult.error.message)

    const users = usersResult.data ?? []
    const total = countResult.count ?? 0

    return NextResponse.json({ users: toCamelRows(users), total, page, limit })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/admin/users - Create user (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  // CSRF guard
  const csrf1 = enforceCsrf(req, authResult)
  if (csrf1) return csrf1

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rawBody = await req.json()
    const input = validateInput(createUserSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data

    // public.users.id is a FK to auth.users.id — create the auth user first
    // via the admin API, then upsert the profile row (a DB trigger mirrors
    // auth.users into public.users; the upsert fills the profile fields).
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: `Ef-Invite-${crypto.randomUUID()}!`,
      email_confirm: body.isEmailVerified ?? true,
      user_metadata: { full_name: body.fullName, role: body.role },
    })
    if (authError || !authUser.user) {
      const message = authError?.message ?? 'Failed to create auth user'
      const conflict = message.includes('already') || message.includes('registered')
      return NextResponse.json(
        { error: conflict ? 'A user with this email already exists' : message },
        { status: conflict ? 409 : 500 }
      )
    }

    const { data: user, error: createError } = await supabase
      .from('users')
      .upsert(
        {
          id: authUser.user.id,
          email: body.email,
          full_name: body.fullName,
          role: body.role,
          phone: body.phone,
          school_id: body.schoolId,
          is_active: body.isActive,
          is_email_verified: body.isEmailVerified,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single()
    if (createError || !user) {
      // Best-effort cleanup of the orphaned auth user
      await supabase.auth.admin.deleteUser(authUser.user.id).catch(() => undefined)
      throw new Error(createError?.message ?? 'Failed to create user')
    }

    // Audit log — SECURITY: Use authenticated user's ID, not client-provided
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'create',
      entity: 'user',
      entity_id: user.id,
      details: JSON.stringify({ role: user.role, name: user.full_name }),
    })
    if (auditError) throw new Error(auditError.message)

    return NextResponse.json(toCamelRow(user))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// PUT /api/admin/users - Update user (SUPER_ADMIN only)
export async function PUT(req: NextRequest) {
  const { allowed: putAllowed, retryAfter: putRetry } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!putAllowed) return rateLimitError(putRetry)

  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  // CSRF guard
  const csrf2 = enforceCsrf(req, authResult)
  if (csrf2) return csrf2

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rawBody = await req.json()
    const input = validateInput(updateUserSchema, rawBody)
    if ('error' in input) return input.error
    const { id, ...data } = input.data

    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (findError) throw new Error(findError.message)
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // SECURITY: Only allow specific role values (already validated by schema)
    const role = data.role

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        full_name: data.fullName,
        role,
        phone: data.phone,
        school_id: data.schoolId,
        is_active: data.isActive,
        is_email_verified: data.isEmailVerified,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError || !user) {
      throw new Error(updateError?.message ?? 'Failed to update user')
    }

    // Audit log — SECURITY: Use authenticated user's ID
    const changes: Record<string, unknown> = {}
    const columnByField: Record<string, string> = {
      fullName: 'full_name',
      role: 'role',
      phone: 'phone',
      isActive: 'is_active',
      isEmailVerified: 'is_email_verified',
    }
    const existingRow = existing as Record<string, unknown>
    for (const key of ['fullName', 'role', 'phone', 'isActive', 'isEmailVerified'] as const) {
      if (data[key] !== undefined && data[key] !== existingRow[columnByField[key]]) {
        changes[key] = { before: existingRow[columnByField[key]], after: data[key] }
      }
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: Object.keys(changes).includes('role') ? 'role_change' : 'update',
      entity: 'user',
      entity_id: id,
      details: JSON.stringify(changes),
    })
    if (auditError) throw new Error(auditError.message)

    return NextResponse.json(toCamelRow(user))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/admin/users - Deactivate (soft delete) (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  const { allowed: delAllowed, retryAfter: delRetry } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!delAllowed) return rateLimitError(delRetry)

  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  // CSRF guard
  const csrf3 = enforceCsrf(req, authResult)
  if (csrf3) return csrf3

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError || !user) {
      throw new Error(updateError?.message ?? 'Failed to deactivate user')
    }

    // Audit log — SECURITY: Use authenticated user's ID
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: 'delete',
      entity: 'user',
      entity_id: id,
      details: JSON.stringify({ softDelete: true, name: user.full_name }),
    })
    if (auditError) throw new Error(auditError.message)

    return NextResponse.json(toCamelRow(user))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
  }
}
