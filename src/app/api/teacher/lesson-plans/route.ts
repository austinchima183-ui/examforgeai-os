import { createServiceClient } from '@/lib/supabase/service'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { lessonPlanCreateSchema, lessonPlanUpdateSchema } from '@/lib/validators/api-schemas'

// ============================================================================
// ExamForge AI — Lesson Plans API
// ============================================================================

export async function GET(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const schoolId = searchParams.get('schoolId')

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    let query = supabase.from('lesson_plans').select('*').eq('teacher_id', teacherId)
    if (schoolId) query = query.eq('school_id', schoolId)

    const { data: plans, error } = await query.order('scheduled_at', { ascending: true })

    if (error) {
      console.error('Lesson plans GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch lesson plans' }, { status: 500 })
    }

    return NextResponse.json(toCamelRows(plans))
  } catch (error) {
    console.error('Lesson plans GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson plans' }, { status: 500 })
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
    const input = validateInput(lessonPlanCreateSchema, rawBody)
    if ('error' in input) return input.error
    const { teacherId, schoolId, subject, topic, className, duration, objectives, materials, activities, assessment, scheduledAt, status, notes } = input.data

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: plan, error } = await supabase
      .from('lesson_plans')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId || null,
        subject,
        topic,
        class_name: className || '',
        duration: duration || 40,
        objectives: JSON.stringify(objectives || []),
        materials: JSON.stringify(materials || []),
        activities: JSON.stringify(activities || []),
        assessment: assessment ? JSON.stringify(assessment) : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: status || 'draft',
        notes: notes || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Lesson plans POST error:', error)
      return NextResponse.json({ error: 'Failed to create lesson plan' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(plan), { status: 201 })
  } catch (error) {
    console.error('Lesson plans POST error:', error)
    return NextResponse.json({ error: 'Failed to create lesson plan' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(lessonPlanUpdateSchema, rawBody)
    if ('error' in input) return input.error
    const { id, ...data } = input.data

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Map camelCase API fields → snake_case columns (Prisma accepted camelCase
    // keys directly; Supabase requires explicit column names)
    const updateData: Record<string, unknown> = {}
    if (data.teacherId !== undefined) updateData.teacher_id = data.teacherId
    if (data.schoolId !== undefined) updateData.school_id = data.schoolId
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.topic !== undefined) updateData.topic = data.topic
    if (data.className !== undefined) updateData.class_name = data.className
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.objectives) updateData.objectives = JSON.stringify(data.objectives)
    if (data.materials) updateData.materials = JSON.stringify(data.materials)
    if (data.activities) updateData.activities = JSON.stringify(data.activities)
    if (data.assessment) updateData.assessment = JSON.stringify(data.assessment)
    if (data.scheduledAt) updateData.scheduled_at = new Date(data.scheduledAt).toISOString()
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: plan, error } = await supabase
      .from('lesson_plans')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Lesson plans PUT error:', error)
      return NextResponse.json({ error: 'Failed to update lesson plan' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(plan))
  } catch (error) {
    console.error('Lesson plans PUT error:', error)
    return NextResponse.json({ error: 'Failed to update lesson plan' }, { status: 500 })
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

    const { error } = await supabase.from('lesson_plans').delete().eq('id', id)

    if (error) {
      console.error('Lesson plans DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete lesson plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lesson plans DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete lesson plan' }, { status: 500 })
  }
}
