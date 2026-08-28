// ============================================================================
// ExamForge AI — Classes API Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/school/classes?school_id=xxx
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

  if (classId) {
    // Get single class with enrollments and subjects
    const { data, error } = await supabase.from('classes').select('*').eq('id', classId).eq('school_id', auth.user.schoolId).single()
    if (error) return NextResponse.json({ error: 'Failed to fetch class' }, { status: 404 })
    return NextResponse.json({ data })
  }

  // Get all classes for the school
  const { data, error } = await supabase.from('classes').select('*').eq('school_id', auth.user.schoolId).order('name')
  if (error) return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/school/classes — Create a class
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

  const { data, error } = await supabase.from('classes').insert({
    school_id: auth.user.schoolId,
    name: body.name,
    section: body.section ?? null,
    teacher_id: body.teacher_id ?? null,
    room_number: body.room_number ?? null,
    capacity: body.capacity ?? null,
    is_active: true,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to create class' }, { status: 400 })

  // If subjects provided, insert class_subjects
  if (body.subject_ids && Array.isArray(body.subject_ids) && body.subject_ids.length > 0) {
    const classSubjects = body.subject_ids.map((subject_id: string) => ({
      class_id: data.id,
      subject_id,
      teacher_id: body.teacher_id ?? null,
    }))
    await supabase.from('class_subjects').insert(classSubjects)
  }

  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/school/classes — Update a class
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
  if (!id) return NextResponse.json({ error: 'Class ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { data, error } = await supabase.from('classes').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: 'Failed to update class' }, { status: 400 })
  return NextResponse.json({ data })
}

// DELETE /api/school/classes?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Class ID required' }, { status: 400 })

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  // Soft delete
  const { data, error } = await supabase.from('classes').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: 'Failed to delete class' }, { status: 400 })
  return NextResponse.json({ data })
}
