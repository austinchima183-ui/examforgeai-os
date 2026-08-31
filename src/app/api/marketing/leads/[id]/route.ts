import { NextRequest, NextResponse } from 'next/server'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { requireApiRole, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId, validateInput, parseJsonBody } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Single Lead API Route
// ============================================================================
// GET /api/marketing/leads/[id] — Fetch a single lead (super_admin/school_admin)
// PATCH /api/marketing/leads/[id] — Update lead with validated fields only
// ============================================================================

// Zod schema for PATCH — prevents mass assignment by whitelisting fields
const LeadUpdateSchema = z.object({
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
}).strict()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: super_admin or school_admin
    const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Validate ID format
    const idResult = validateId(id, 'leadId')
    if ('error' in idResult) return idResult.error

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', idResult.data)
      .single()

    if (error || !data) {
      return NextResponse.json({ lead: null, error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead: data })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketing/leads/[id] GET' }), { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: super_admin or school_admin
    const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Validate ID format
    const idResult = validateId(id, 'leadId')
    if ('error' in idResult) return idResult.error

    // Parse and validate body — prevents mass assignment
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(LeadUpdateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    const { data, error } = await supabase
      .from('leads')
      .update(body)
      .eq('id', idResult.data)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ lead: null, error: error.message }, { status: 500 })
    }

    // Log stage change activity
    if (body.stage) {
      await supabase.from('lead_activities').insert({
        lead_id: idResult.data,
        type: 'stage_changed',
        description: `Stage changed to ${body.stage}`,
        metadata: { new_stage: body.stage },
      })
    }

    return NextResponse.json({ lead: data })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketing/leads/[id] PATCH' }), { status: 500 })
  }
}
