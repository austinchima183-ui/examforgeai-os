import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Student Flashcards API
// ============================================================================

export async function GET(request: NextRequest) {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({
      flashcards: [],
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
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')

    // Get subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('is_active', true)
      .limit(20)

    // Get existing flashcards for this student
    let flashcardQuery = supabase
      .from('flashcards')
      .select('id, subject_id, front, back, difficulty, last_reviewed, review_count, correct_count')
      .eq('student_id', user.id)

    if (subjectId) flashcardQuery = flashcardQuery.eq('subject_id', subjectId)

    const { data: flashcards, error: fcError } = await flashcardQuery.limit(100)

    if (fcError) {
      // Table might not exist yet — return empty
      return NextResponse.json({
        flashcards: [],
        subjects: subjects ?? [],
      })
    }

    return NextResponse.json({
      flashcards: flashcards ?? [],
      subjects: subjects ?? [],
    })
  } catch (error) {
    console.error('Flashcards API error:', error)
    return NextResponse.json({ error: 'Failed to fetch flashcard data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await requireSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { flashcardId, isCorrect } = body

    // Update flashcard review stats
    const { data: existing } = await supabase
      .from('flashcards')
      .select('review_count, correct_count')
      .eq('id', flashcardId)
      .single()

    if (existing) {
      await supabase
        .from('flashcards')
        .update({
          review_count: (existing.review_count ?? 0) + 1,
          correct_count: (existing.correct_count ?? 0) + (isCorrect ? 1 : 0),
          last_reviewed: new Date().toISOString(),
        })
        .eq('id', flashcardId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Flashcard update error:', error)
    return NextResponse.json({ error: 'Failed to update flashcard' }, { status: 500 })
  }
}
