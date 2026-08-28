import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

// PostgREST many-to-one embeds return objects at runtime; the untyped
// supabase-js client infers them as arrays. This permissive row type
// restores accurate runtime shapes (verified against the live API).
type Row = Record<string, any>


// ============================================================================
// ExamForge AI — Parent Child Progress API Route
// ============================================================================
// GET /api/parent/child-progress — Detailed progress for a child (parent/school_admin/super_admin)
// Child access is validated against the authenticated parent's linked children.
// ============================================================================

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

    // Auth + role check: parent, school_admin, or super_admin
    const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive parentId from session
    const tenant = deriveTenantContext(auth)
    const parentId = tenant.userId

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    if (!childId) return NextResponse.json({ error: 'Child ID required' }, { status: 400 })

    // Validate childId format
    const childIdResult = validateId(childId, 'childId')
    if ('error' in childIdResult) return childIdResult.error

    // Verify this parent has access to this child
    if (auth.user.role === 'parent') {
      const { data: parentChild__d, error: parentChildError } = await supabase
        .from('parent_children')
        .select('id')
        .eq('parent_id', parentId)
        .eq('child_id', childIdResult.data)
        .limit(1)
        .maybeSingle()
      const parentChild = parentChild__d as unknown as Row
      if (parentChildError) throw parentChildError
      if (!parentChild) {
        return NextResponse.json({ error: 'You do not have access to this child' }, { status: 403 })
      }
    }

    // Child lookup
    const { data: child__d, error: childError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', childIdResult.data)
      .maybeSingle()
    const child = child__d as unknown as Row
    if (childError) throw childError

    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

    // First class enrollment (Prisma classEnrollments[0] equivalent)
    const { data: enrollment__d, error: enrollmentError } = await supabase
      .from('class_students')
      .select('class_id, classes(id, name)')
      .eq('student_id', childIdResult.data)
      .limit(1)
      .maybeSingle()
    const enrollment = enrollment__d as unknown as Row
    if (enrollmentError) throw enrollmentError

    // Exam results (newest first). exam_results has no FK to exams, so the
    // exam → subject relation is resolved with a second query.
    const { data: resultRows__d, error: resultsError } = await supabase
      .from('exam_results')
      .select('id, exam_id, total_marks, total_possible, score_percentage, grade, created_at')
      .eq('student_id', childIdResult.data)
      .order('created_at', { ascending: false })
    const resultRows = resultRows__d as unknown as Row[]
    if (resultsError) throw resultsError

    const examById = new Map<string, {
      title: string
      subjectId: string | null
      subject: { id: string; name: string; code: string | null } | null
    }>()
    const examIds = [...new Set((resultRows ?? []).map(r => r.exam_id))]
    if (examIds.length > 0) {
      const { data: examRows__d, error: examsError } = await supabase
        .from('exams')
        .select('id, title, subject_id, subjects(id, name, code)')
        .in('id', examIds)
      const examRows = examRows__d as unknown as Row[]
      if (examsError) throw examsError
      for (const e of examRows ?? []) {
        examById.set(e.id, { title: e.title, subjectId: e.subject_id, subject: e.subjects })
      }
    }

    // Normalize rows to the original (Prisma camelCase) ExamResult shape.
    // Column mapping: score→total_marks, totalMarks→total_possible,
    // percentage→score_percentage, submittedAt→created_at.
    // (numeric columns come back as strings → wrapped in Number())
    const examResults = (resultRows ?? [])
      .map(r => {
        const exam = examById.get(r.exam_id)
        return {
          id: r.id,
          score: Number(r.total_marks),
          totalMarks: Number(r.total_possible),
          percentage: Number(r.score_percentage),
          grade: r.grade ?? null,
          submittedAt: r.created_at,
          subjectId: null as string | null, // exam_results has no per-result subject override
          subject: null as { id: string; name: string; code: string | null } | null,
          exam: {
            title: exam?.title ?? '',
            subjectId: exam?.subjectId ?? null,
            subject: exam?.subject ?? null,
          },
        }
      })
      // Every Prisma ExamResult was guaranteed an exam→subject relation;
      // skip legacy rows that cannot be resolved (impossible in the original model).
      .filter(r => r.exam.subject !== null)

    // Group results by subject
    const subjectMap = new Map<string, {
      subject: { id: string; name: string; code: string | null }
      results: typeof examResults
      average: number
      trend: 'up' | 'down' | 'stable'
    }>()

    for (const result of examResults) {
      const subjectId = result.subjectId || result.exam.subjectId || result.exam.subject!.id
      const subject = (result.subject || result.exam.subject)!
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: { id: subject.id, name: subject.name, code: subject.code },
          results: [],
          average: 0,
          trend: 'stable',
        })
      }
      subjectMap.get(subjectId)!.results.push(result)
    }

    // Calculate averages and trends
    const subjectBreakdown = Array.from(subjectMap.values()).map(s => {
      const avg = s.results.reduce((sum, r) => sum + r.percentage, 0) / s.results.length
      s.average = avg

      // Trend: compare last 2 results
      if (s.results.length >= 2) {
        const last = s.results[0].percentage // most recent first
        const prev = s.results[1].percentage
        s.trend = last > prev + 5 ? 'up' : last < prev - 5 ? 'down' : 'stable'
      }

      return {
        subject: s.subject,
        average: avg,
        trend: s.trend,
        resultCount: s.results.length,
        highestScore: Math.max(...s.results.map(r => r.percentage)),
        lowestScore: Math.min(...s.results.map(r => r.percentage)),
        results: s.results.map(r => ({
          id: r.id,
          examTitle: r.exam.title,
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          grade: r.grade,
          submittedAt: r.submittedAt,
        })),
      }
    })

    // Class averages for comparison (simplified)
    const classId = enrollment?.classes?.id
    let classAverages: Record<string, number> = {}
    if (classId) {
      const { data: classExamRows__d, error: classExamsError } = await supabase
        .from('exams')
        .select('id, subjects(name)')
        .eq('class_id', classId)
      const classExamRows = classExamRows__d as unknown as Row[]
      if (classExamsError) throw classExamsError
      const classExams = classExamRows ?? []
      const classExamIds = classExams.map(e => e.id)

      if (classExamIds.length > 0) {
        const { data: classResultRows__d, error: classResultsError } = await supabase
          .from('exam_results')
          .select('exam_id, score_percentage')
          .in('exam_id', classExamIds)
        const classResultRows = classResultRows__d as unknown as Row[]
        if (classResultsError) throw classResultsError

        const classSubjectMap = new Map<string, number[]>()
        for (const r of classResultRows ?? []) {
          const exam = classExams.find(e => e.id === r.exam_id)
          if (!exam?.subjects) continue // unresolvable under the unified schema
          const key = exam.subjects.name
          if (!classSubjectMap.has(key)) classSubjectMap.set(key, [])
          classSubjectMap.get(key)!.push(Number(r.score_percentage))
        }
        for (const [name, pcts] of classSubjectMap) {
          classAverages[name] = pcts.reduce((s, p) => s + p, 0) / pcts.length
        }
      }
    }

    // Strengths and areas for improvement
    const sorted = [...subjectBreakdown].sort((a, b) => b.average - a.average)
    const strengths = sorted.slice(0, 3).filter(s => s.average >= 60).map(s => s.subject.name)
    const improvements = sorted.reverse().slice(0, 3).filter(s => s.average < 70).map(s => s.subject.name)

    return NextResponse.json({
      child: { id: child.id, fullName: child.full_name, email: child.email },
      className: enrollment?.classes?.name || 'Unassigned',
      overallAverage: subjectBreakdown.length > 0 ? subjectBreakdown.reduce((s, sb) => s + sb.average, 0) / subjectBreakdown.length : 0,
      subjectBreakdown,
      classAverages,
      strengths,
      improvements,
    })
  } catch (error) {
    console.error('Child progress error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'parent/child-progress' }), { status: 500 })
  }
}
