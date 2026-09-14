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

// ──────────────────────────────────────────────────────────────
// Ω-UI SECURITY FIX: tenant-scoped exam ids for the caller.
// Previously GET returned ALL platform submissions to any teacher
// (cross-tenant data leak). Scoping: teacher → exams they created,
// school_admin → their school's exams, super_admin → unscoped.
// ──────────────────────────────────────────────────────────────
async function tenantScopedExamIds(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  role: string,
  userId: string,
  schoolId: string | null
): Promise<string[] | 'ALL'> {
  if (role === 'super_admin') return 'ALL'

  let query = supabase.from('exams').select('id').limit(500)
  if (role === 'teacher') {
    query = query.eq('created_by', userId)
  } else {
    // school_admin (and any school-scoped role)
    if (!schoolId) return []
    query = query.eq('school_id', schoolId)
  }

  const { data: exams } = await query
  return (exams ?? []).map((e: { id: string }) => e.id)
}

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

    const tenant = deriveTenantContext(auth)
    const scopedExamIds = await tenantScopedExamIds(
      supabase,
      auth.user.role,
      tenant.userId,
      tenant.schoolId
    )
    // No in-scope exams → empty result (never fall through to unscoped)
    if (scopedExamIds !== 'ALL' && scopedExamIds.length === 0) {
      return NextResponse.json([])
    }

    let query = supabase.from('exam_submissions').select('*')
    if (where.examId !== undefined) query = query.eq('exam_id', String(where.examId))
    if (ungradedOnly) query = query.is('score', null)
    // Ω-UI: hard tenant scoping + bounded result set
    if (scopedExamIds !== 'ALL') query = query.in('exam_id', scopedExamIds)
    query = query.limit(500)

    const { data: submissions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Submissions GET error:', error)
      return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/submissions GET' }), { status: 500 })
    }

    // ─── Ω-UI: enrich rows server-side (student name, question text, exam
    // title) so the grading queue renders in ONE round trip — the client
    // previously ran up to 50 sequential fetches (and called an admin-only
    // users endpoint that 403'd for teachers). ───
    const rows = (submissions ?? []) as Array<{
      id: string
      student_id: string
      question_id: string
      exam_id: string
      [key: string]: unknown
    }>
    const studentIds = [...new Set(rows.map((r) => r.student_id))]
    const questionIds = [...new Set(rows.map((r) => r.question_id))]
    const examIds = [...new Set(rows.map((r) => r.exam_id))]

    const [usersRes, questionsRes, examsRes] = await Promise.all([
      studentIds.length
        ? supabase.from('users').select('id, full_name, email').in('id', studentIds)
        : Promise.resolve({ data: [] }),
      questionIds.length
        ? supabase.from('questions').select('id, question_text').in('id', questionIds)
        : Promise.resolve({ data: [] }),
      examIds.length
        ? supabase.from('exams').select('id, title').in('id', examIds)
        : Promise.resolve({ data: [] }),
    ])

    const nameById = new Map(
      ((usersRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map(
        (u) => [u.id, u.full_name || u.email || null]
      )
    )
    const textById = new Map(
      ((questionsRes.data ?? []) as Array<{ id: string; question_text: string }>).map((q) => [
        q.id,
        q.question_text,
      ])
    )
    const titleById = new Map(
      ((examsRes.data ?? []) as Array<{ id: string; title: string }>).map((e) => [e.id, e.title])
    )

    const enriched = rows.map((r) => ({
      ...r,
      studentName: nameById.get(r.student_id) ?? `Student ${r.student_id.slice(0, 8)}`,
      questionText: textById.get(r.question_id) ?? 'Question unavailable',
      examTitle: titleById.get(r.exam_id) ?? `Exam ${r.exam_id.slice(0, 8)}`,
    }))

    return NextResponse.json(toCamelRows(enriched))
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

    // ─── Ω-UI SECURITY FIX: tenant ownership check before update (IDOR) ───
    // A crafted PUT must not be able to grade another school's submission.
    if (auth.user.role !== 'super_admin') {
      const { data: existing } = await supabase
        .from('exam_submissions')
        .select('id, exam_id')
        .eq('id', id)
        .maybeSingle()
      if (!existing) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
      }
      const scopedIds = await tenantScopedExamIds(
        supabase,
        auth.user.role,
        gradedBy,
        deriveTenantContext(auth).schoolId
      )
      if (scopedIds !== 'ALL' && !scopedIds.includes(existing.exam_id)) {
        return NextResponse.json(
          { error: 'You do not have access to this submission' },
          { status: 403 }
        )
      }
    }

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
