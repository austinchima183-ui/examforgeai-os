import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { createSafeErrorResponse } from '@/lib/api/auth-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Marketing Leads API Route
// ============================================================================
// GET /api/marketing/leads — Fetch leads with optional filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const stage = searchParams.get('stage')
    const scoreTier = searchParams.get('scoreTier')
    const source = searchParams.get('source')

    let query = supabase
      .from('leads')
      .select('*')
      .order('last_activity_at', { ascending: false })

    if (stage) query = query.eq('stage', stage)
    if (scoreTier) query = query.eq('score_tier', scoreTier)
    if (source) query = query.eq('source', source)
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ leads: [], error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: data || [] })
  } catch (err) {
    return NextResponse.json(
      { leads: [], ...createSafeErrorResponse(err) },
      { status: 500 }
    )
  }
}
