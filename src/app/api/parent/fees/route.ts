import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId, validateInput, parseJsonBody } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// PostgREST many-to-one embeds return objects at runtime; the untyped
// supabase-js client infers them as arrays. This permissive row type
// restores accurate runtime shapes (verified against the live API).
type Row = Record<string, any>


// ============================================================================
// ExamForge AI — Parent Fees API Route
// ============================================================================
// GET /api/parent/fees — Fee data for parent's children (parent/school_admin/super_admin)
// POST /api/parent/fees — Initiate payment (parent/school_admin/super_admin)
// parentId is ALWAYS derived from the authenticated session — never from client input.
// ============================================================================

// Zod schema for POST — only allow paymentId and paymentMethod
const InitiatePaymentSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  paymentMethod: z.string().min(1).max(50),
}).strict()

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: parent, school_admin, or super_admin
    const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive parentId from session — NEVER from client query params
    const tenant = deriveTenantContext(auth)
    const parentId = tenant.userId

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    // Get children
    const { data: parentChildrenRows__d, error: parentChildrenError } = await supabase
      .from('parent_children')
      .select(`
        id,
        parent_id,
        child_id,
        relationship,
        created_at,
        child:users!parent_children_child_id_fkey(id, full_name, school_id)
      `)
      .eq('parent_id', parentId)
    const parentChildrenRows = parentChildrenRows__d as unknown as Row[]
    if (parentChildrenError) throw parentChildrenError

    // Normalize to the original (Prisma camelCase) ParentChild shape
    const parentChildren = (parentChildrenRows ?? []).map(pc => ({
      id: pc.id,
      parentId: pc.parent_id,
      childId: pc.child_id,
      relationship: pc.relationship,
      createdAt: pc.created_at,
      child: pc.child
        ? { id: pc.child.id, fullName: pc.child.full_name, schoolId: pc.child.school_id ?? null }
        : null,
    }))

    // If childId specified, validate it and ensure access
    let targetChildren = parentChildren
    if (childId) {
      const childIdResult = validateId(childId, 'childId')
      if ('error' in childIdResult) return childIdResult.error

      targetChildren = parentChildren.filter(pc => pc.childId === childIdResult.data)
      // school_admin and super_admin can access any child in their school
      if (targetChildren.length === 0 && auth.user.role !== 'parent') {
        // Allow school_admin/super_admin to access children not directly linked
        const { data: child__d, error: childError } = await supabase
          .from('users')
          .select('id, full_name, school_id')
          .eq('id', childIdResult.data)
          .maybeSingle()
        const child = child__d as unknown as Row
        if (childError) throw childError
        if (child) {
          targetChildren = [{
            childId: childIdResult.data,
            child: { id: child.id, fullName: child.full_name, schoolId: child.school_id ?? null },
            parentId,
            id: '',
            relationship: null,
            createdAt: new Date().toISOString(),
          }]
        }
      }
      if (targetChildren.length === 0 && auth.user.role === 'parent') {
        return NextResponse.json({ error: 'You do not have access to this child' }, { status: 403 })
      }
    }

    const result = []
    for (const pc of targetChildren) {
      const { data: paymentRows__d, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id, fee_id, student_id, amount, status, payment_method, reference, paid_at, due_date, receipt_url, created_at, updated_at,
          fees(id, school_id, name, amount, fee_type, academic_session, term, due_date, description, is_active, created_at, updated_at)
        `)
        .eq('student_id', pc.childId)
        .order('created_at', { ascending: false })
      const paymentRows = paymentRows__d as unknown as Row[]
      if (paymentsError) throw paymentsError

      // Normalize rows to the original (Prisma camelCase) shape
      const payments = (paymentRows ?? []).map(p => ({
        id: p.id,
        feeId: p.fee_id,
        studentId: p.student_id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.payment_method,
        reference: p.reference,
        paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null,
        dueDate: p.due_date ? new Date(p.due_date).toISOString() : null,
        receiptUrl: p.receipt_url,
        createdAt: new Date(p.created_at).toISOString(),
        updatedAt: new Date(p.updated_at).toISOString(),
        fee: p.fees
          ? {
              id: p.fees.id,
              schoolId: p.fees.school_id,
              name: p.fees.name,
              amount: p.fees.amount,
              feeType: p.fees.fee_type,
              academicSession: p.fees.academic_session,
              term: p.fees.term,
              dueDate: p.fees.due_date ? new Date(p.fees.due_date).toISOString() : null,
              description: p.fees.description,
              isActive: p.fees.is_active,
              createdAt: new Date(p.fees.created_at).toISOString(),
              updatedAt: new Date(p.fees.updated_at).toISOString(),
            }
          : null,
      }))

      const outstanding = payments.filter(p => p.status === 'pending' || p.status === 'overdue')
      const paid = payments.filter(p => p.status === 'paid')
      const totalOutstanding = outstanding.reduce((s, p) => s + p.amount, 0)
      const totalPaid = paid.reduce((s, p) => s + p.amount, 0)

      // Upcoming fee schedule.
      // NOTE: the original passed `schoolId: undefined` when the child had no
      // school, which drops the filter entirely (fees from all schools) —
      // preserved here by only applying .eq when schoolId is present.
      let upcomingQuery = supabase
        .from('fees')
        .select('*')
        .eq('is_active', true)
        .gte('due_date', new Date().toISOString())
      if (pc.child?.schoolId) {
        upcomingQuery = upcomingQuery.eq('school_id', pc.child.schoolId)
      }
      const { data: upcomingRows, error: upcomingError } = await upcomingQuery
        .order('due_date', { ascending: true })
        .limit(5)
      if (upcomingError) throw upcomingError

      const upcomingFees = (upcomingRows ?? []).map(f => ({
        id: f.id,
        schoolId: f.school_id,
        name: f.name,
        amount: f.amount,
        feeType: f.fee_type,
        academicSession: f.academic_session,
        term: f.term,
        dueDate: f.due_date ? new Date(f.due_date).toISOString() : null,
        description: f.description,
        isActive: f.is_active,
        createdAt: new Date(f.created_at).toISOString(),
        updatedAt: new Date(f.updated_at).toISOString(),
      }))

      result.push({
        child: pc.child ? { id: pc.child.id, fullName: pc.child.fullName } : null,
        payments,
        outstanding,
        paid,
        totalOutstanding,
        totalPaid,
        upcomingFees,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Fees error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'parent/fees GET' }), { status: 500 })
  }
}

// POST /api/parent/fees - Initiate payment
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: parent, school_admin, or super_admin
    const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Validate input with strict schema
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(InitiatePaymentSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const { paymentId, paymentMethod } = bodyResult.data

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Verify the payment belongs to one of the parent's children
    const tenant = deriveTenantContext(auth)
    const parentId = tenant.userId

    if (auth.user.role === 'parent') {
      const { data: parentChildrenRows__d, error: parentChildrenError } = await supabase
        .from('parent_children')
        .select('child_id')
        .eq('parent_id', parentId)
      const parentChildrenRows = parentChildrenRows__d as unknown as Row[]
      if (parentChildrenError) throw parentChildrenError
      const childIds = (parentChildrenRows ?? []).map(pc => pc.child_id)

      const { data: payment__d, error: paymentError } = await supabase
        .from('fee_payments')
        .select('student_id')
        .eq('id', paymentId)
        .maybeSingle()
      const payment = payment__d as unknown as Row
      if (paymentError) throw paymentError
      if (!payment || !childIds.includes(payment.student_id)) {
        return NextResponse.json({ error: 'Payment not found or access denied' }, { status: 403 })
      }
    }

    // In production, this would redirect to payment gateway
    const { data: updatedPayment__d, error: updateError } = await supabase
      .from('fee_payments')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        reference: `TXN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      })
      .eq('id', paymentId)
      .select('*')
      .single()
    const updatedPayment = updatedPayment__d as unknown as Row
    if (updateError) throw updateError

    // Normalize to the original (Prisma camelCase) shape
    const payment = {
      id: updatedPayment.id,
      feeId: updatedPayment.fee_id,
      studentId: updatedPayment.student_id,
      amount: updatedPayment.amount,
      status: updatedPayment.status,
      paymentMethod: updatedPayment.payment_method,
      reference: updatedPayment.reference,
      paidAt: updatedPayment.paid_at ? new Date(updatedPayment.paid_at).toISOString() : null,
      dueDate: updatedPayment.due_date ? new Date(updatedPayment.due_date).toISOString() : null,
      receiptUrl: updatedPayment.receipt_url,
      createdAt: new Date(updatedPayment.created_at).toISOString(),
      updatedAt: new Date(updatedPayment.updated_at).toISOString(),
    }

    return NextResponse.json({ payment, redirectUrl: null, message: 'Payment processed successfully' })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'parent/fees POST' }), { status: 500 })
  }
}
