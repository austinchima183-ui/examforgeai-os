// ============================================================================
// ExamForge AI — Fees API Route
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
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// Hardcoded allowlist of fee tables — NEVER accept from client
const FEE_TABLES = {
  structures: 'fee_structures',
  assignments: 'fee_assignments',
  payments: 'fee_payments',
} as const

type FeeType = keyof typeof FEE_TABLES

// Tables allowed for PATCH/DELETE — restricted subset
const MUTABLE_FEE_TABLES = ['fee_structures', 'fee_assignments'] as const
type MutableFeeTable = typeof MUTABLE_FEE_TABLES[number]

// GET /api/school/fees?type=structures|assignments|payments
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
    const typeParam = searchParams.get('type') ?? 'structures'

    // Validate type against hardcoded allowlist
    if (!(typeParam in FEE_TABLES)) {
      return badRequestError(`Invalid type parameter. Valid: ${Object.keys(FEE_TABLES).join(', ')}`)
    }
    const type = typeParam as FeeType

    if (type === 'structures') {
      const { data, error } = await supabase.from(FEE_TABLES.structures).select('*').eq('school_id', tenant.schoolId).order('created_at', { ascending: false })
      if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:GET' }), { status: 500 })
      return NextResponse.json({ data })
    }

    if (type === 'assignments') {
      const { data, error } = await supabase.from(FEE_TABLES.assignments).select('*, fee_structures(id, name, fee_type), profiles(id, full_name)').eq('school_id', tenant.schoolId).order('created_at', { ascending: false })
      if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:GET' }), { status: 500 })
      return NextResponse.json({ data })
    }

    if (type === 'payments') {
      const { data, error } = await supabase.from(FEE_TABLES.payments).select('*, profiles(id, full_name)').eq('school_id', tenant.schoolId).order('paid_at', { ascending: false })
      if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:GET' }), { status: 500 })
      return NextResponse.json({ data })
    }

    return badRequestError('Invalid type parameter')
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:GET' }), { status: 500 })
  }
}

// POST /api/school/fees — Create fee structure, assignment, or payment
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only)
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
    const bodyResult = validateInput(z.object({}).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    if (body.action === 'create_structure') {
      const { data, error } = await supabase.from(FEE_TABLES.structures).insert({
        school_id: tenant.schoolId,
        name: body.name,
        fee_type: body.fee_type,
        amount: body.amount,
        class_id: body.class_id ?? null,
        due_date: body.due_date ?? null,
        description: body.description ?? null,
        is_mandatory: body.is_mandatory ?? false,
        is_active: true,
      }).select().single()
      if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:POST' }), { status: 400 })
      return NextResponse.json({ data }, { status: 201 })
    }

    if (body.action === 'assign_fee') {
      const { data, error } = await supabase.from(FEE_TABLES.assignments).insert({
        fee_structure_id: body.fee_structure_id,
        student_id: body.student_id,
        amount_due: body.amount_due,
        amount_paid: 0,
        status: 'pending',
        due_date: body.due_date ?? null,
        school_id: tenant.schoolId,
      }).select().single()
      if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:POST' }), { status: 400 })
      return NextResponse.json({ data }, { status: 201 })
    }

    if (body.action === 'record_payment') {
      // Create payment record and update assignment
      const { data: payment, error: paymentError } = await supabase.from(FEE_TABLES.payments).insert({
        fee_assignment_id: body.fee_assignment_id,
        student_id: body.student_id,
        amount: body.amount,
        payment_method: body.payment_method ?? 'cash',
        transaction_ref: body.transaction_ref ?? null,
        receipt_number: body.receipt_number ?? `RCP-${Date.now()}`,
        paid_at: new Date().toISOString(),
        remarks: body.remarks ?? null,
        school_id: tenant.schoolId,
      }).select().single()

      if (paymentError) return NextResponse.json(createSafeErrorResponse(paymentError, { route: 'school/fees:POST' }), { status: 400 })

      // Update the assignment
      const { data: assignment } = await supabase.from(FEE_TABLES.assignments).select('amount_due, amount_paid').eq('id', body.fee_assignment_id).eq('school_id', tenant.schoolId).single()
      if (assignment) {
        const newAmountPaid = (assignment.amount_paid ?? 0) + body.amount
        const newStatus = newAmountPaid >= assignment.amount_due ? 'paid' : 'partial'
        await supabase.from(FEE_TABLES.assignments).update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', body.fee_assignment_id)
      }

      return NextResponse.json({ data: payment }, { status: 201 })
    }

    return badRequestError('Invalid action')
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:POST' }), { status: 500 })
  }
}

// PATCH /api/school/fees — Update fee structure
export async function PATCH(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only)
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
    const bodyResult = validateInput(z.object({}).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { id, table, ...updates } = body
    if (!id || !table) return badRequestError('ID and table required')

    // SECURITY: Validate table against hardcoded allowlist — NEVER trust client input
    if (!MUTABLE_FEE_TABLES.includes(table as MutableFeeTable)) {
      return badRequestError(`Invalid table. Allowed: ${MUTABLE_FEE_TABLES.join(', ')}`)
    }
    const safeTable = table as MutableFeeTable

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // SECURITY: Verify the record belongs to the user's school before updating
    const { data: existing, error: fetchError } = await supabase
      .from(safeTable)
      .select('school_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.school_id !== tenant.schoolId) {
      return forbiddenError('Cannot update records from another school')
    }

    // Strip any client-provided school_id from updates — always use server-derived
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { school_id: _ignoredSchoolId, ...safeUpdates } = updates

    const { data, error } = await supabase.from(safeTable).update({
      ...safeUpdates,
      school_id: tenant.schoolId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()

    if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:PATCH' }), { status: 400 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:PATCH' }), { status: 500 })
  }
}

// DELETE /api/school/fees?id=xxx&table=fee_structures
export async function DELETE(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only)
    const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)
    if (!tenant.schoolId) return badRequestError('No school assigned')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tableParam = searchParams.get('table') ?? 'fee_structures'
    if (!id) return badRequestError('ID required')

    // SECURITY: Validate table against hardcoded allowlist — NEVER trust client input
    if (!MUTABLE_FEE_TABLES.includes(tableParam as MutableFeeTable)) {
      return badRequestError(`Invalid table. Allowed: ${MUTABLE_FEE_TABLES.join(', ')}`)
    }
    const safeTable = tableParam as MutableFeeTable

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // SECURITY: Verify the record belongs to the user's school before soft-deleting
    const { data: existing, error: fetchError } = await supabase
      .from(safeTable)
      .select('school_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.school_id !== tenant.schoolId) {
      return forbiddenError('Cannot delete records from another school')
    }

    const { error } = await supabase.from(safeTable).update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:DELETE' }), { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'school/fees:DELETE' }), { status: 500 })
  }
}
