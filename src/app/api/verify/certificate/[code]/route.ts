import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError } from '@/lib/api/auth-guard'

// ============================================================================
// ExamForge AI — Public Certificate Verification (Ω-21)
// ============================================================================
// GET /api/verify/certificate/<code>
//
// Public, rate-limited verification endpoint backing the QR code on every
// issued certificate. Returns ONLY the verifiable facts (title, type, score
// band, exam title, school name, issue date) — no student PII beyond the
// masked name, no ids, no row internals. Uses the service client because
// anonymous visitors have no RLS role on the certificates table.
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // ─── Rate limit (public) ───────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.relaxed)
  if (!allowed) return rateLimitError(retryAfter)

  const { code } = await params
  const normalized = (code ?? '').trim().toUpperCase()

  if (!/^EF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{3}$/.test(normalized)) {
    return NextResponse.json(
      { valid: false, reason: 'invalid_format' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Verification service unavailable' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('title, type, score, grade, student_name, exam_title, verification_code, issued_at, school_id, metadata')
      .eq('verification_code', normalized)
      .maybeSingle()

    if (error) {
      console.warn(
        '[Certificate verify] lookup failed (migration 009 pending?):',
        error.message
      )
      return NextResponse.json(
        { valid: false, reason: 'verification_unavailable' },
        { status: 503 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { valid: false, reason: 'not_found' },
        { status: 404 }
      )
    }

    // Mask the student name to initials (public endpoint privacy)
    const maskedName = (data.student_name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part: string) => `${part[0].toUpperCase()}.`)
      .join(' ')

    const branding = (data.metadata as Record<string, unknown> | null)?.branding as
      | { schoolName?: string }
      | undefined

    return NextResponse.json({
      valid: true,
      certificate: {
        title: data.title,
        type: data.type,
        score: data.score,
        grade: data.grade,
        student: maskedName,
        examTitle: data.exam_title,
        schoolName: branding?.schoolName ?? null,
        issuedAt: data.issued_at,
      },
    })
  } catch (error) {
    console.error('[Certificate verify] error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
