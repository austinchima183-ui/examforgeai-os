import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Student Progress API
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
      sessions: [],
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
    // Get all graded exam sessions for this student
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, percentage, grade, total_score, max_score, submitted_at, answers_completed, answers_total, exams(id, title, subject_id, total_marks, pass_mark, subjects(id, name))')
      .eq('student_id', user.id)
      .in('status', ['graded', 'submitted'])
      .order('submitted_at', { ascending: true })

    // Get subjects for grouping
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)

    return NextResponse.json({
      sessions: sessions ?? [],
      subjects: subjects ?? [],
    })
  } catch (error) {
    console.error('Progress API error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 })
  }
}
