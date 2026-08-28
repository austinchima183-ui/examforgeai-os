// ============================================================================
// ExamForge AI — Attendance API Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiAuth,
  requireApiRole,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
  forbiddenError,
  badRequestError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/school/attendance?class_id=yyy&date=2024-01-15
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user with a school)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)
    if (!tenant.schoolId) return badRequestError('No school assigned')

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    // Always filter by the authenticated user's school_id
    let query = supabase.from('attendance').select('*, profiles(id, full_name)').eq('school_id', tenant.schoolId).eq('date', date)
    if (classId) query = query.eq('class_id', classId)

    const { data, error } = await query.order('created_at')
    if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:GET' }), { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:GET' }), { status: 500 })
  }
}

// POST /api/school/attendance — Mark attendance (bulk)
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user with a school)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)
    if (!tenant.schoolId) return badRequestError('No school assigned')

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // body.records: [{ student_id, class_id, date, status, remarks }]
    if (!body.records || !Array.isArray(body.records)) {
      return badRequestError('records array required')
    }

    // Always use the server-derived school_id, never trust client input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = body.records.map((r: any) => ({
      school_id: tenant.schoolId,
      class_id: r.class_id,
      student_id: r.student_id,
      date: r.date,
      status: r.status ?? 'present',
      remarks: r.remarks ?? null,
      marked_by: tenant.userId,
    }))

    // Upsert attendance records (unique on school_id + class_id + student_id + date)
    const { data, error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'school_id,class_id,student_id,date' })
      .select()

    if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:POST' }), { status: 400 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:POST' }), { status: 500 })
  }
}

// PATCH /api/school/attendance — Update a single record
export async function PATCH(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only can PATCH attendance)
    const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)
    if (!tenant.schoolId) return badRequestError('No school assigned')

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { id, ...updates } = body
    if (!id) return badRequestError('Record ID required')

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // SECURITY: First verify the record belongs to the user's school
    // before allowing the update. This prevents cross-tenant PATCH.
    const { data: existing, error: fetchError } = await supabase
      .from('attendance')
      .select('school_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.school_id !== tenant.schoolId) {
      return forbiddenError('Cannot update attendance records from another school')
    }

    // Strip any client-provided school_id from updates — always use server-derived
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { school_id: _ignoredSchoolId, ...safeUpdates } = updates

    const { data, error } = await supabase.from('attendance').update({
      ...safeUpdates,
      school_id: tenant.schoolId,
      marked_by: tenant.userId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()

    if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:PATCH' }), { status: 400 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/attendance:PATCH' }), { status: 500 })
  }
}
