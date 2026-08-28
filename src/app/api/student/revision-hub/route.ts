import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Student Revision Hub API
// ============================================================================

export async function GET(request: NextRequest) {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({
      sessions: [],
      flaggedAnswers: [],
      subjects: [
        { id: 'dev-s1', name: 'Mathematics', code: 'MATH' },
        { id: 'dev-s2', name: 'English', code: 'ENG' },
      ],
    })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get exam sessions (results) for this student
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, percentage, grade, status, submitted_at, exams(id, title, subject_id, subjects(id, name))')
      .eq('student_id', user.id)
      .eq('status', 'graded')
      .order('submitted_at', { ascending: false })

    // Get flagged answers
    const { data: flaggedAnswers } = await supabase
      .from('exam_answers')
      .select('id, question_id, is_correct, flagged, questions(id, content, subject_id, difficulty, subjects(id, name))')
      .eq('student_id', user.id)
      .eq('flagged', true)

    // Get subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)

    return NextResponse.json({
      sessions: sessions ?? [],
      flaggedAnswers: flaggedAnswers ?? [],
      subjects: subjects ?? [],
    })
  } catch (error) {
    console.error('Revision Hub API error:', error)
    return NextResponse.json({ error: 'Failed to fetch revision data' }, { status: 500 })
  }
}
