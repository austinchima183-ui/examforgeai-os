import { createServiceClient } from '@/lib/supabase/service'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { rubricCreateSchema } from '@/lib/validators/api-schemas'

// ============================================================================
// ExamForge AI — Rubrics API
// ============================================================================

export async function GET(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: rubrics, error } = await supabase
      .from('rubrics')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Rubrics GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 })
    }

    return NextResponse.json(toCamelRows(rubrics))
  } catch (error) {
    console.error('Rubrics GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(rubricCreateSchema, rawBody)
    if ('error' in input) return input.error
    const { name: title, criteria, examId, teacherId, schoolId, subject, topic, assessmentType, performanceLevels, cells, totalPoints, isTemplate } = input.data

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: rubric, error } = await supabase
      .from('rubrics')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId || null,
        title,
        subject: subject || null,
        topic: topic || null,
        assessment_type: assessmentType || 'essay',
        criteria: JSON.stringify(criteria || []),
        performance_levels: JSON.stringify(performanceLevels || []),
        cells: JSON.stringify(cells || []),
        total_points: totalPoints || 0,
        is_template: isTemplate || false,
        exam_id: examId || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Rubrics POST error:', error)
      return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(rubric), { status: 201 })
  } catch (error) {
    console.error('Rubrics POST error:', error)
    return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const body = await request.json()
    const { id, ...data } = body as { id?: string; [key: string]: unknown }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Map camelCase API fields → snake_case columns (Prisma accepted camelCase
    // keys directly; Supabase requires explicit column names)
    const FIELD_MAP: Record<string, string> = {
      teacherId: 'teacher_id',
      schoolId: 'school_id',
      title: 'title',
      subject: 'subject',
      topic: 'topic',
      assessmentType: 'assessment_type',
      criteria: 'criteria',
      performanceLevels: 'performance_levels',
      cells: 'cells',
      totalPoints: 'total_points',
      isTemplate: 'is_template',
      examId: 'exam_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      const column = FIELD_MAP[key]
      if (column !== undefined) updateData[column] = value
    }
    if (data.criteria) updateData.criteria = JSON.stringify(data.criteria)
    if (data.performanceLevels) updateData.performance_levels = JSON.stringify(data.performanceLevels)
    if (data.cells) updateData.cells = JSON.stringify(data.cells)

    const { data: rubric, error } = await supabase
      .from('rubrics')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Rubrics PUT error:', error)
      return NextResponse.json({ error: 'Failed to update rubric' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(rubric))
  } catch (error) {
    console.error('Rubrics PUT error:', error)
    return NextResponse.json({ error: 'Failed to update rubric' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { error } = await supabase.from('rubrics').delete().eq('id', id)

    if (error) {
      console.error('Rubrics DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete rubric' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rubrics DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete rubric' }, { status: 500 })
  }
}
