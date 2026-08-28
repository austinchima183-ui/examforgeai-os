import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Exam Timing Edge Function Proxy
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult
  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const cbtTimingSchema = z.object({ sessionId: z.string().uuid(), action: z.enum(['start', 'pause', 'resume', 'end']) }).strict()
    const input = validateInput(cbtTimingSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(`${SUPABASE_URL}/functions/v1/exam-timing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Exam timing error:', error)
    return NextResponse.json({ error: 'Failed to update exam timing' }, { status: 500 })
  }
}
