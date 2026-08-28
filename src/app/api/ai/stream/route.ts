import { NextResponse, type NextRequest } from 'next/server'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { aiStreamSchema } from '@/lib/validators/api-schemas'
import { addSafetyGuardrails, sanitizeAIInput, sanitizeSystemContext, validateAIOutput } from '@/lib/ai/prompt-engineering'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError, requireApiAuth } from '@/lib/api/auth-guard'
import { requireFeature } from '@/lib/billing/plan-gate'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge Intelligence — AI Stream Endpoint
// ============================================================================
// Streams AI responses using z-ai-web-dev-sdk for contextual,
// role-aware, page-aware education assistance.
// SECURITY: Requires authentication. User-supplied systemPrompt is ignored
// to prevent prompt injection. Role context comes from auth session only.
// ============================================================================

export async function POST(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 11) ───
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    // ─── Feature gate: AI question generation requires Professional+ ───
    const featureDenial = await requireFeature('ai_question_generation', request)
    if (featureDenial) return featureDenial

    // ── AUTH: Require authenticated session ──
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ── Rate limit AI endpoints ──
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
    if (!allowed) return rateLimitError(retryAfter)

    // ── Get role from session (never from user-supplied context) ──
    const sessionRole = (user.app_metadata?.role as string) ?? 'student'
    const sessionSchoolId = (user.app_metadata?.school_id as string) ?? null

    // ── Basic rate limit check (per user, in-memory) ──
    // Production should use Redis; this is a basic safeguard
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(aiStreamSchema, rawBody)
    if ('error' in input) return input.error
    const { messages, systemContext } = input.data as {
      messages: Array<{ role: string; content: string }>
      systemContext?: {
        role?: string
        page?: string
        pageName?: string
        pathname?: string
        userName?: string
        systemPrompt?: string
      }
    }

    // ── Import z-ai-web-dev-sdk dynamically (server only) ──
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const ai = await ZAI.create()

    // ── Build system prompt with education context ──
    // SECURITY: Ignore user-supplied systemPrompt entirely — use server-side prompt only
    // P1-AI FIX: Sanitize systemContext.pageName to prevent prompt injection
    const safePageName = systemContext?.pageName ? sanitizeSystemContext(systemContext.pageName) : ''
    const baseSystemPrompt =
      `You are ExamForge Intelligence, an AI assistant embedded in the ExamForge education platform. You deeply understand education contexts including students, teachers, parents, exams, schools, curriculum, analytics, and performance. You are assisting a ${sessionRole}.${safePageName ? ` The user is currently on the ${safePageName} page.` : ''} Provide helpful, specific, and actionable guidance. Use markdown formatting when it helps readability (lists, bold, code). Keep responses concise but thorough.`

    // Apply safety guardrails to prevent hallucination and prompt injection (P5-INJECT-1)
    const systemPrompt = addSafetyGuardrails(baseSystemPrompt)

    // ── Build the messages array with system prompt ──
    // P1-AI FIX: Sanitize every user message before sending to AI
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => {
        // Sanitize user/assistant messages to prevent injection
        if (m.role === 'user') {
          const { sanitized, threats } = sanitizeAIInput(m.content)
          if (threats.length > 0) {
            console.warn('[AI-SECURITY] Prompt injection threats detected:', threats)
          }
          return { role: 'user' as const, content: sanitized }
        }
        return { role: 'assistant' as const, content: m.content }
      }),
    ]

    // ── Stream the response with 60s timeout (P5-TIMEOUT-2) ──
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60_000)

    try {
      const stream = await ai.chat.completions.create({
        messages: aiMessages,
        stream: true,
        signal: controller.signal,
        max_tokens: 4096,
      })

      // ── Convert the stream to a ReadableStream of SSE events ──
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(streamController) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices?.[0]?.delta?.content || ''
              if (content) {
                const sseEvent = `data: ${JSON.stringify({ content })}\n\n`
                streamController.enqueue(encoder.encode(sseEvent))
              }
            }
            // Send [DONE] signal
            streamController.enqueue(encoder.encode('data: [DONE]\n\n'))
            streamController.close()
          } catch (streamError) {
            console.error('Stream iteration error:', streamError)
            const errorEvent = `data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`
            streamController.enqueue(encoder.encode(errorEvent))
            streamController.close()
          }
        },
      })

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('AI Stream error:', error)
    return NextResponse.json(
      { error: 'Failed to stream AI request' },
      { status: 500 }
    )
  }
}
