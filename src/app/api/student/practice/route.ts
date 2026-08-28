import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Student Practice API
// ============================================================================

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({
      questions: [],
      subjects: [
        { id: 'dev-s1', name: 'Mathematics', code: 'MATH' },
        { id: 'dev-s2', name: 'English', code: 'ENG' },
        { id: 'dev-s3', name: 'Physics', code: 'PHY' },
      ],
    })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')
    const difficulty = searchParams.get('difficulty')

    let query = supabase
      .from('question_bank')
      .select('id, content, content_json, question_type, difficulty, explanation, marks, time_allowed_seconds')
      .eq('is_published', true)

    if (subjectId) query = query.eq('subject_id', subjectId)
    if (difficulty) query = query.eq('difficulty', difficulty)

    const { data: rawQuestions, error } = await query.limit(50)

    if (error) throw error

    // Map question_bank rows to the practice UI contract
    // (options/correct_answer live inside content_json jsonb)
    const questions = (rawQuestions ?? []).map((q: {
      id: string
      content: string
      content_json?: { options?: unknown; correct_answer?: unknown } | null
      question_type: string
      difficulty: string
      explanation: string | null
      marks: number | null
      time_allowed_seconds: number | null
    }) => ({
      id: q.id,
      content: q.content,
      question_type: q.question_type,
      difficulty: q.difficulty,
      options: q.content_json?.options ?? null,
      correct_answer: q.content_json?.correct_answer ?? null,
      explanation: q.explanation,
      marks: q.marks,
      time_seconds: q.time_allowed_seconds,
    }))

    // Get subjects for the filter
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)
      .limit(20)

    return NextResponse.json({ questions: questions ?? [], subjects: subjects ?? [] })
  } catch (error) {
    console.error('Practice API error:', error)
    return NextResponse.json({ error: 'Failed to fetch practice data' }, { status: 500 })
  }
}
