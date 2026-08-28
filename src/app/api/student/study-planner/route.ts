import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Student Study Planner API
// ============================================================================

const DEV_SUBJECTS = [
  { id: 'dev-s1', name: 'Mathematics', code: 'MATH' },
  { id: 'dev-s2', name: 'English', code: 'ENG' },
]

export async function GET(request: NextRequest) {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ exams: [], studyPlans: [], subjects: DEV_SUBJECTS })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get upcoming exams
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, subject_id, start_time, duration_minutes, total_marks')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(20)

    // Get existing study plans
    const { data: studyPlans, error: spError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    // Get subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)

    return NextResponse.json({
      exams: exams ?? [],
      studyPlans: spError ? [] : (studyPlans ?? []),
      subjects: subjects ?? [],
    })
  } catch (error) {
    console.error('Study Planner API error:', error)
    return NextResponse.json({ error: 'Failed to fetch study planner data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await requireSupabase()

  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Supabase unavailable in dev mode' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { title, subject_id, date, duration_minutes, notes, exam_id } = body

    const { data, error } = await supabase
      .from('study_plans')
      .insert({
        student_id: user.id,
        title,
        subject_id,
        date,
        duration_minutes,
        notes,
        exam_id,
        is_completed: false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ plan: data })
  } catch (error) {
    console.error('Create study plan error:', error)
    return NextResponse.json({ error: 'Failed to create study plan' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await requireSupabase()

  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Supabase unavailable in dev mode' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { id, ...updates } = body

    const { data, error } = await supabase
      .from('study_plans')
      .update(updates)
      .eq('id', id)
      .eq('student_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ plan: data })
  } catch (error) {
    console.error('Update study plan error:', error)
    return NextResponse.json({ error: 'Failed to update study plan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await requireSupabase()

  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Supabase unavailable in dev mode' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete study plan error:', error)
    return NextResponse.json({ error: 'Failed to delete study plan' }, { status: 500 })
  }
}
