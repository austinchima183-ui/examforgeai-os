// ============================================================================
// ExamForge AI — Timetable API Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/school/timetable?school_id=xxx&class_id=yyy
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
  const classId = searchParams.get('class_id')

  let query = supabase.from('timetable_slots').select('*, subjects(id, name), profiles(id, full_name)').order('day_of_week').order('period_number')

  if (classId) {
    query = query.eq('class_id', classId)
  } else {
    const { data: schoolClasses } = await supabase.from('classes').select('id').eq('school_id', auth.user.schoolId)
    const classIds = (schoolClasses ?? []).map((c: any) => c.id)
    if (classIds.length > 0) query = query.in('class_id', classIds)
    else return NextResponse.json({ data: [] })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 })

  // Check for conflicts (teacher double-booking)
  const conflicts: string[] = []
  const teacherSlots = new Map<string, Map<string, number>>()
  for (const slot of data ?? []) {
    if (!slot.teacher_id || slot.is_break) continue
    const key = `${slot.day_of_week}-${slot.period_number}`
    if (!teacherSlots.has(slot.teacher_id)) teacherSlots.set(slot.teacher_id, new Map())
    const dayPeriods = teacherSlots.get(slot.teacher_id)!
    if (dayPeriods.has(key)) conflicts.push(`Teacher ${slot.profiles?.full_name ?? 'Unknown'} is double-booked on day ${slot.day_of_week} period ${slot.period_number}`)
    dayPeriods.set(key, 1)
  }

  return NextResponse.json({ data, conflicts })
}

// POST /api/school/timetable — Create/update a timetable slot
export async function POST(request: NextRequest) {
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
  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Check for teacher conflict
  if (body.teacher_id && !body.is_break) {
    const { data: existing } = await supabase
      .from('timetable_slots')
      .select('id')
      .eq('teacher_id', body.teacher_id)
      .eq('day_of_week', body.day_of_week)
      .eq('period_number', body.period_number)
      .neq('id', body.id ?? '00000000-0000-0000-0000-000000000000')

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Teacher is already assigned to another class at this time slot.' }, { status: 409 })
    }
  }

  const { data, error } = await supabase.from('timetable_slots').insert({
    class_id: body.class_id,
    subject_id: body.subject_id ?? null,
    teacher_id: body.teacher_id ?? null,
    day_of_week: body.day_of_week,
    period_number: body.period_number,
    start_time: body.start_time,
    end_time: body.end_time,
    room: body.room ?? null,
    is_break: body.is_break ?? false,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to create timetable slot' }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/school/timetable — Update a timetable slot
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
  if (!id) return NextResponse.json({ error: 'Slot ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Check for teacher conflict
  if (updates.teacher_id && !updates.is_break) {
    const { data: existing } = await supabase
      .from('timetable_slots')
      .select('id')
      .eq('teacher_id', updates.teacher_id)
      .eq('day_of_week', updates.day_of_week ?? 0)
      .eq('period_number', updates.period_number ?? 0)
      .neq('id', id)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Teacher is already assigned to another class at this time slot.' }, { status: 409 })
    }
  }

  const { data, error } = await supabase.from('timetable_slots').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: 'Failed to update timetable slot' }, { status: 400 })
  return NextResponse.json({ data })
}

// DELETE /api/school/timetable?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Slot ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { error } = await supabase.from('timetable_slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete timetable slot' }, { status: 400 })
  return NextResponse.json({ success: true })
}
