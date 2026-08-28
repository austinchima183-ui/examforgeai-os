import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Contact Submissions API Route
// ============================================================================
// GET /api/marketing/contacts — Fetch all contact submissions (super_admin only)
// ============================================================================

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

    // Auth + role check: super_admin only
    const auth = await requireApiRole(request, ['super_admin'])
    if (auth instanceof NextResponse) return auth

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ contacts: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contacts: data || [] })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketing/contacts' }), { status: 500 })
  }
}
