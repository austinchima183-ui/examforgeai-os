import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId, validatePagination } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Lead Activities API Route
// ============================================================================
// GET /api/marketing/leads/[id]/activities — Fetch activities for a lead (super_admin/school_admin)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) {
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

    // Validate pagination
    const { limit, offset } = validatePagination(request.nextUrl.searchParams)

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', idResult.data)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ activities: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities: data || [] })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketing/leads/[id]/activities' }), { status: 500 })
  }
}
