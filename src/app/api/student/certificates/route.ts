import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Student Certificates API
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
    return NextResponse.json({ sessions: [], certificates: [] })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get graded sessions with high scores for certificate generation
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, percentage, grade, total_score, max_score, submitted_at, exams(id, title, subject_id, total_marks, subjects(id, name))')
      .eq('student_id', user.id)
      .in('status', ['graded', 'submitted'])
      .order('submitted_at', { ascending: false })

    // Get existing certificates
    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false })

    return NextResponse.json({
      sessions: sessions ?? [],
      certificates: certError ? [] : (certificates ?? []),
    })
  } catch (error) {
    console.error('Certificates API error:', error)
    return NextResponse.json({ error: 'Failed to fetch certificate data' }, { status: 500 })
  }
}
