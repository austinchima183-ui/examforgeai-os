import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { aiCompleteSchema } from '@/lib/validators/api-schemas'
import { sanitizeAIOutput, detectHallucination } from '@/lib/ai/ai-quality-guards'
import { sanitizeAIInput, addSafetyGuardrails, validateAIOutput } from '@/lib/ai/prompt-engineering'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { requireFeature } from '@/lib/billing/plan-gate'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — AI Complete Edge Function Proxy
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(request: NextRequest) {
  // ─── Feature gate: AI question generation requires Professional+ ───
  const featureDenial = await requireFeature('ai_question_generation', request)
  if (featureDenial) return featureDenial

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, { user: { id: user.id } })
  if (csrfResult) return csrfResult

  // Rate limit AI endpoints
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(aiCompleteSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data
    const { data: { session } } = await supabase.auth.getSession()

    // P1-AI FIX: Fail fast if no session token
    if (!session?.access_token) {
      return NextResponse.json({ error: 'Authentication session expired' }, { status: 401 })
    }

    // P1-AI FIX: Sanitize any user messages in the body
    if (body.messages && Array.isArray(body.messages)) {
      body.messages = body.messages.map((m: { role: 'user' | 'assistant' | 'system'; content: string }) => {
        if (m.role === 'user') {
          const { sanitized, threats } = sanitizeAIInput(m.content)
          if (threats.length > 0) {
            console.warn('[AI-SECURITY] Prompt injection threats in complete endpoint:', threats)
          }
          return { ...m, content: sanitized }
        }
        return m
      })
    }

    // Add max_tokens to prevent runaway generation (P5-COST-2)
    // (RC1: the edge function reads maxTokens — the previous snake_case key
    //  silently never reached it, so the cost cap was not enforced.)
    const bodyWithLimit = { ...body, max_tokens: 4096, maxTokens: Math.min(body.maxTokens ?? 2048, 4096) }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyWithLimit),
    })

    const data = await response.json()

    // Apply AI safety guards: sanitize and detect hallucination
    // P1-AI FIX: Also validate output for leaked secrets and jailbreaks
    const resultText = typeof data === 'string' ? data : JSON.stringify(data)
    const outputValidation = validateAIOutput(resultText)
    if (!outputValidation.safe) {
      console.error('[AI-SECURITY] Unsafe AI output detected:', outputValidation.issues)
    }
    const sanitized = sanitizeAIOutput(resultText)
    const hallucinationCheck = detectHallucination(sanitized)
    let safeData: unknown
    try { safeData = JSON.parse(sanitized) } catch { safeData = data }

    return NextResponse.json(
      {
        ...(typeof safeData === 'object' && safeData !== null ? safeData as Record<string, unknown> : { data: safeData }),
        ...(hallucinationCheck.isHallucination ? { warning: 'Response may contain inaccuracies — verify with authoritative sources' } : {})
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('AI Complete error:', error)
    return NextResponse.json(createSafeErrorResponse(error), { status: 500 })
  }
}
