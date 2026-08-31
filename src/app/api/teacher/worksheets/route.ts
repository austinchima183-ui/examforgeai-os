import { createServiceClient } from '@/lib/supabase/service'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import { worksheetCreateSchema, worksheetUpdateSchema } from '@/lib/validators/api-schemas'

// ============================================================================
// ExamForge AI — Worksheets API
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

    const { data: worksheets, error } = await supabase
      .from('worksheets')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Worksheets GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch worksheets' }, { status: 500 })
    }

    return NextResponse.json(toCamelRows(worksheets))
  } catch (error) {
    console.error('Worksheets GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch worksheets' }, { status: 500 })
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
    const bodyResult = validateInput(worksheetCreateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { teacherId, schoolId, title, subject, instructions, questions, headerConfig, difficulty, spacing, isTemplate, templateName } = body

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: worksheet, error } = await supabase
      .from('worksheets')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId || null,
        title,
        subject,
        instructions: instructions || null,
        questions: JSON.stringify(questions || []),
        header_config: headerConfig ? JSON.stringify(headerConfig) : null,
        difficulty: difficulty || 'medium',
        spacing: spacing || 'normal',
        is_template: isTemplate || false,
        template_name: templateName || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Worksheets POST error:', error)
      return NextResponse.json({ error: 'Failed to create worksheet' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(worksheet), { status: 201 })
  } catch (error) {
    console.error('Worksheets POST error:', error)
    return NextResponse.json({ error: 'Failed to create worksheet' }, { status: 500 })
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
    const bodyResult = validateInput(worksheetUpdateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { id, ...data } = body

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Map camelCase API fields → snake_case columns (Prisma accepted camelCase
    // keys directly; Supabase requires explicit column names)
    const updateData: Record<string, unknown> = {}
    if (data.teacherId !== undefined) updateData.teacher_id = data.teacherId
    if (data.schoolId !== undefined) updateData.school_id = data.schoolId
    if (data.title !== undefined) updateData.title = data.title
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.instructions !== undefined) updateData.instructions = data.instructions
    if (data.questions) updateData.questions = JSON.stringify(data.questions)
    if (data.headerConfig) updateData.header_config = JSON.stringify(data.headerConfig)
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
    if (data.spacing !== undefined) updateData.spacing = data.spacing
    if (data.isTemplate !== undefined) updateData.is_template = data.isTemplate
    if (data.templateName !== undefined) updateData.template_name = data.templateName

    const { data: worksheet, error } = await supabase
      .from('worksheets')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Worksheets PUT error:', error)
      return NextResponse.json({ error: 'Failed to update worksheet' }, { status: 500 })
    }

    return NextResponse.json(toCamelRow(worksheet))
  } catch (error) {
    console.error('Worksheets PUT error:', error)
    return NextResponse.json({ error: 'Failed to update worksheet' }, { status: 500 })
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

    const { error } = await supabase.from('worksheets').delete().eq('id', id)

    if (error) {
      console.error('Worksheets DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete worksheet' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Worksheets DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete worksheet' }, { status: 500 })
  }
}
