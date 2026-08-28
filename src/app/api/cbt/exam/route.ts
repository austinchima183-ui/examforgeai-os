import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateId } from '@/lib/api/validate'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// ExamForge AI — CBT Exam Data API
// ============================================================================
// GET /api/cbt/exam?id=<examId>
//
// Loads the exam, its questions (WITHOUT correct answers — stripped at the
// source), the caller's session status, and subject/class names for the
// pre-exam screen. Consumed by /exams/[id]/take.
//
// SECURITY:
//   - Requires authentication (student taking the exam)
//   - NEVER selects questions.correct_answer
//   - Strips isCorrect flags from options (defense in depth)
//   - Returns the caller's own session status only
// ============================================================================

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const examId = searchParams.get('id')
  if (!examId) {
    return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 })
  }

  const idResult = validateId(examId, 'id')
  if ('error' in idResult) return idResult.error

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // ── Fetch exam with subject/class names ──
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        id, title, description, status, exam_type,
        total_marks, pass_mark, time_limit_minutes,
        start_time, end_time, allowed_attempts,
        randomize_questions, randomize_options,
        show_results, show_correct_answers, show_explanations,
        auto_submit, allow_resume, browser_lockdown,
        subject_id, class_id, school_id,
        subjects(id, name),
        classes(id, name)
      `)
      .eq('id', examId)
      .maybeSingle()

    if (examError) {
      logger.error('CBT exam fetch failed', new Error(examError.message), { examId })
      return NextResponse.json({ error: 'Failed to load exam' }, { status: 500 })
    }

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // ── Fetch questions — SECURITY: never select correct_answer ──
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, question_type, options, marks, difficulty, is_required, "order"')
      .eq('exam_id', examId)
      .order('"order"', { ascending: true })

    if (questionsError) {
      logger.error('CBT questions fetch failed', new Error(questionsError.message), { examId })
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }

    // Parse + sanitize options: the DB stores a JSON string; the client
    // expects a real array with isCorrect stripped (defense in depth).
    const safeQuestions = (questions ?? []).map(q => {
      let options: unknown[] | null = null
      if (q.options) {
        try {
          const parsed = JSON.parse(q.options as string)
          if (Array.isArray(parsed)) {
            options = parsed.map((opt: Record<string, unknown>) => {
              const { isCorrect, ...rest } = opt
              void isCorrect
              return rest
            })
          }
        } catch {
          options = null
        }
      }
      return {
        id: q.id,
        type: q.question_type,
        content: q.question_text,
        options,
        marks: q.marks,
        order: q.order,
      }
    })

    // ── Fetch the caller's own sessions (latest first) ──
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, status, attempt_number, started_at, ends_at, submitted_at')
      .eq('exam_id', examId)
      .eq('student_id', auth.user.id)
      .order('attempt_number', { ascending: false })

    const latestSession = sessions?.[0] ?? null

    // Map exam row to the API contract the take page expects
    const subjectRow = exam.subjects as { name?: string } | null
    const classRow = exam.classes as { name?: string } | null

    return NextResponse.json({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      subject: subjectRow?.name ?? '',
      className: classRow?.name ?? '',
      status: exam.status,
      exam_type: exam.exam_type,
      duration_minutes: exam.time_limit_minutes,
      total_marks: Number(exam.total_marks ?? 0),
      passing_marks: Number(exam.pass_mark ?? 0),
      start_time: exam.start_time,
      end_time: exam.end_time,
      allowed_attempts: exam.allowed_attempts ?? 1,
      attempts_used: sessions?.length ?? 0,
      settings: {
        shuffleQuestions: exam.randomize_questions ?? false,
        shuffleOptions: exam.randomize_options ?? false,
        showResults: exam.show_results ?? 'after_submission',
        showCorrectAnswers: exam.show_correct_answers ?? false,
        showExplanations: exam.show_explanations ?? false,
        autoSubmit: exam.auto_submit ?? true,
        allowResume: exam.allow_resume ?? true,
        browserLockdown: exam.browser_lockdown ?? false,
      },
      questions: safeQuestions,
      // Caller's own session state
      sessionStatus: latestSession?.status ?? null,
      sessionId: latestSession?.id ?? null,
      attemptNumber: latestSession?.attempt_number ?? 0,
    })
  } catch (error) {
    logger.error('CBT exam route error', error, { examId })
    return NextResponse.json({ error: 'Failed to load exam' }, { status: 500 })
  }
}
