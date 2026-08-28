// ============================================================================
// ExamForge AI — Calendar API Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/school/calendar?school_id=xxx&month=1&year=2024
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.user.schoolId) return NextResponse.json({ error: 'No school assigned' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const eventType = searchParams.get('event_type')

  let query = supabase.from('school_calendar_events').select('*').eq('school_id', auth.user.schoolId).eq('is_active', true)

  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
    query = query.gte('start_date', startDate).lte('end_date', endDate)
  }

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  const { data, error } = await query.order('start_date')
  if (error) return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/school/calendar — Create event
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult
  if (!auth.user.schoolId) return NextResponse.json({ error: 'No school assigned' }, { status: 400 })

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

  const { data, error } = await supabase.from('school_calendar_events').insert({
    school_id: auth.user.schoolId,
    title: body.title,
    description: body.description ?? null,
    event_type: body.event_type ?? 'event',
    start_date: body.start_date,
    end_date: body.end_date ?? body.start_date,
    is_all_day: body.is_all_day ?? true,
    location: body.location ?? null,
    color: body.color ?? null,
    is_active: true,
    created_by: auth.user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/school/calendar — Update event
export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Event ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { data, error } = await supabase.from('school_calendar_events').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 400 })
  return NextResponse.json({ data })
}

// DELETE /api/school/calendar?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Event ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { error } = await supabase.from('school_calendar_events').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 400 })
  return NextResponse.json({ success: true })
}
