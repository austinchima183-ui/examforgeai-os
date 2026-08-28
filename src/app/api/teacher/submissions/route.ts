import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextResponse, type NextRequest } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId, validateInput, parseJsonBody } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Exam Submissions API (for grading)
// ============================================================================
// GET /api/teacher/submissions — Fetch submissions (teacher/school_admin/super_admin)
// PUT /api/teacher/submissions — Update submission/grade (teacher/school_admin/super_admin)
// gradedBy is ALWAYS derived from the authenticated session — never from client input.
// ============================================================================

// Zod schema for PUT — strict validation to prevent mass assignment
const UpdateSubmissionSchema = z.object({
  id: z.string().uuid('Invalid submission ID'),
  score: z.number().min(0).optional(),
  aiScore: z.number().min(0).optional(),
  aiFeedback: z.string().max(2000).optional(),
  rubricId: z.string().uuid().optional(),
}).strict()

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

    // Auth + role check: teacher, school_admin, or super_admin
    const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('examId')
    const ungradedOnly = searchParams.get('ungradedOnly') === 'true'

    const where: Record<string, unknown> = {}
    if (examId) {
      // Validate examId format
      const examIdResult = validateId(examId, 'examId')
      if ('error' in examIdResult) return examIdResult.error
      where.examId = examIdResult.data
    }
    if (ungradedOnly) where.score = null

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    let query = supabase.from('exam_submissions').select('*')
    if (where.examId !== undefined) query = query.eq('exam_id', String(where.examId))
    if (ungradedOnly) query = query.is('score', null)

    const { data: submissions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Submissions GET error:', error)
      return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/submissions GET' }), { status: 500 })
    }

    return NextResponse.json(toCamelRows(submissions))
  } catch (error) {
    console.error('Submissions GET error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/submissions GET' }), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: teacher, school_admin, or super_admin
    const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive gradedBy from session — NEVER from client input
    const tenant = deriveTenantContext(auth)
    const gradedBy = tenant.userId

    // Validate input with strict schema (removes client-provided gradedBy)
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(UpdateSubmissionSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const { id, score, aiScore, aiFeedback, rubricId } = bodyResult.data

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const updateData: Record<string, unknown> = {}
    if (score !== undefined) { updateData.score = score; updateData.graded_by = gradedBy; updateData.graded_at = new Date().toISOString() }
    if (aiScore !== undefined) updateData.ai_score = aiScore
    if (aiFeedback !== undefined) updateData.ai_feedback = aiFeedback
    if (rubricId !== undefined) updateData.rubric_id = rubricId

    const { data: submission, error } = await supabase
      .from('exam_submissions')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Submissions PUT error:', error)
      return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/submissions PUT' }), { status: 500 })
    }

    return NextResponse.json(toCamelRow(submission))
  } catch (error) {
    console.error('Submissions PUT error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/submissions PUT' }), { status: 500 })
  }
}
