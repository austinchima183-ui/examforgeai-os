import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { emailService } from '@/lib/email/service'

// ============================================================================
// ExamForge AI — Student Certificates API (Ω-21 certificate contract)
// ============================================================================
// GET  /api/student/certificates
//   Returns the student's graded sessions (eligible for certificates), their
//   PERSISTED certificates, and the school branding snapshot used by the
//   branded certificate print.
//
// POST /api/student/certificates   [CSRF-protected]
//   Issues a certificate for one graded session:
//     - deterministic, persisted verification code (stable across reloads)
//     - school branding snapshot (name / logo / primary color)
//     - email delivery via Resend (recorded in metadata; failures logged,
//       never silent, never block the issuance)
//   Idempotent per (student, session): re-issuing returns the existing row.
// ============================================================================

const CERTIFICATE_THRESHOLD = 60
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://web-alpha-bay-87.vercel.app'

interface SchoolSnapshot {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}

interface SessionEmbed {
  title: string | null
  subjects: { name: string }[] | { name: string } | null
}

type CertificateType = 'excellence' | 'merit' | 'pass' | 'completion'

function certificateTypeFor(percentage: number): CertificateType {
  if (percentage >= 90) return 'excellence'
  if (percentage >= 75) return 'merit'
  if (percentage >= CERTIFICATE_THRESHOLD) return 'pass'
  return 'completion'
}

function titleFor(type: CertificateType): string {
  switch (type) {
    case 'excellence': return 'Certificate of Excellence'
    case 'merit': return 'Certificate of Merit'
    case 'pass': return 'Certificate of Achievement'
    default: return 'Certificate of Completion'
  }
}

/**
 * Deterministic verification code derived from the session id + issued-at
 * salt — stable across page reloads (unlike the pre-Ω-21 client-side random
 * codes, which regenerated on every render and could never be verified).
 */
function buildVerificationCode(sessionId: string, studentId: string): string {
  const raw = `${sessionId}:${studentId}:examforge-verification-v1`
  let hash = 0x811c9dc5 // FNV-1a 32-bit
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const h = (hash >>> 0).toString(36).toUpperCase().padStart(7, '0')
  const c = (Math.imul(hash, 0x9e3779b1) >>> 0).toString(36).toUpperCase().padStart(7, '0')
  return `EF-${h.slice(0, 4)}-${c.slice(0, 4)}-${h.slice(4, 7)}`
}

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
    return NextResponse.json({ sessions: [], certificates: [], school: null })
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

    // Get existing (persisted) certificates — post-migration-009 columns are
    // included; pre-migration the table still returns its base columns.
    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false })
    if (certError) {
      console.warn('[Certificates API] certificate read failed (migration 009 pending?):', certError.message)
    }

    // School branding snapshot for the branded certificate print
    const { data: profile } = await supabase
      .from('users')
      .select('school_id, schools(id, name, logo_url, primary_color)')
      .eq('id', user.id)
      .maybeSingle()
    // PostgREST embeds the many-to-one parent as an object at runtime; the
    // hand-written Database types model it as an array — normalize here.
    const school = (profile?.schools as unknown as SchoolSnapshot[] | SchoolSnapshot | null | undefined) ?? null
    const schoolSnapshot = Array.isArray(school) ? school[0] ?? null : school

    return NextResponse.json({
      userId: user.id,
      sessions: sessions ?? [],
      certificates: certError ? [] : (certificates ?? []),
      school: schoolSnapshot,
    })
  } catch (error) {
    console.error('Certificates API error:', error)
    return NextResponse.json({ error: 'Failed to fetch certificate data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // ─── Rate limit (write) ───────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth + CSRF (mutation contract) ──────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth
  const supabase = await requireSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const bodyResult = validateInput(
      z.object({ sessionId: z.string().uuid() }),
      bodyJson.data
    )
    if ('error' in bodyResult) return bodyResult.error
    const { sessionId } = bodyResult.data

    // ── Verify the session belongs to this student and is graded ──
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, percentage, grade, submitted_at, status, exams(title, subjects(name))')
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (!['graded', 'submitted'].includes(session.status)) {
      return NextResponse.json({ error: 'Session is not graded yet' }, { status: 400 })
    }

    const percentage = session.percentage ?? 0
    if (percentage < CERTIFICATE_THRESHOLD) {
      return NextResponse.json(
        { error: 'Score below certificate threshold (60%)' },
        { status: 400 }
      )
    }

    // ── Idempotency: return the existing certificate if already issued ──
    const { data: existing, error: existingError } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!existingError && existing) {
      return NextResponse.json({ success: true, certificate: existing, reissued: true })
    }

    // ── Student + school context for branding + delivery ──
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email, school_id, schools(name, logo_url, primary_color)')
      .eq('id', user.id)
      .maybeSingle()
    const schoolEmbed = (profile?.schools as unknown as SchoolSnapshot[] | SchoolSnapshot | null | undefined) ?? null
    const schoolInfo = Array.isArray(schoolEmbed) ? schoolEmbed[0] ?? null : schoolEmbed

    const type = certificateTypeFor(percentage)
    const verificationCode = buildVerificationCode(sessionId, user.id)
    const studentName = profile?.full_name ?? 'Student'
    const schoolName = schoolInfo?.name ?? 'ExamForge AI'
    const examEmbed = session.exams as unknown as SessionEmbed[] | SessionEmbed | null | undefined
    const examInfo = Array.isArray(examEmbed) ? examEmbed[0] ?? null : examEmbed
    const examTitle = examInfo?.title ?? 'Examination'

    const certificateRow = {
      student_id: user.id,
      school_id: profile?.school_id ?? null,
      exam_id: session.exam_id,
      session_id: sessionId,
      title: titleFor(type),
      type,
      score: percentage,
      grade: session.grade ?? null,
      student_name: studentName,
      exam_title: examTitle,
      verification_code: verificationCode,
      metadata: {
        branding: {
          schoolName,
          logoUrl: schoolInfo?.logo_url ?? null,
          primaryColor: schoolInfo?.primary_color ?? null,
        },
        delivery: { channel: 'email', status: 'pending' },
      },
    }

    const { data: inserted, error: insertError } = await supabase
      .from('certificates')
      .insert(certificateRow)
      .select('*')
      .single()

    if (insertError) {
      // Migration 009 columns missing → honest, non-silent failure
      console.warn(
        '[Certificates API] issuance insert failed (migration 009 pending?):',
        insertError.message
      )
      return NextResponse.json(
        { error: 'Certificate persistence unavailable', detail: insertError.message },
        { status: 503 }
      )
    }

    // ── Email delivery (never blocks issuance; failures logged + recorded) ──
    let deliveryStatus = 'skipped'
    if (profile?.email) {
      const verifyUrl = `${APP_URL}/verify/certificate/${verificationCode}`
      try {
        const result = await emailService.send({
          to: profile.email,
          subject: `Your ${titleFor(type)} — ${schoolName}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; border: 3px double #c9a84c; padding: 40px; text-align: center;">
              <h1 style="color: #8B6914; margin-bottom: 8px;">${schoolName}</h1>
              <h2 style="font-weight: normal;">${titleFor(type)}</h2>
              <p>This certifies that <strong>${studentName}</strong> achieved</p>
              <p style="font-size: 42px; color: #8B6914;"><strong>${percentage}%</strong></p>
              <p>in <strong>${examTitle}</strong></p>
              <p style="color: #666;">Verification code: <strong>${verificationCode}</strong></p>
              <p><a href="${verifyUrl}" style="color: #8B6914;">Verify this certificate</a></p>
              <p style="font-size: 11px; color: #999;">Issued via ExamForge AI</p>
            </div>
          `,
        })
        deliveryStatus = result.success ? 'sent' : `failed: ${result.error ?? 'unknown'}`
        if (!result.success) {
          console.warn('[Certificates API] email delivery failed:', result.error)
        }
      } catch (emailError) {
        deliveryStatus = `failed: ${String(emailError).slice(0, 120)}`
        console.warn('[Certificates API] email delivery threw:', emailError)
      }
    }

    // Record delivery outcome in metadata (best-effort update)
    if (inserted) {
      await supabase
        .from('certificates')
        .update({
          delivered_at: deliveryStatus === 'sent' ? new Date().toISOString() : null,
          metadata: {
            ...(inserted.metadata ?? {}),
            delivery: { channel: 'email', status: deliveryStatus, at: new Date().toISOString() },
          },
        })
        .eq('id', inserted.id)
    }

    return NextResponse.json({ success: true, certificate: inserted, delivery: deliveryStatus })
  } catch (error) {
    console.error('Certificates API POST error:', error)
    return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 500 })
  }
}
