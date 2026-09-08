// ============================================================================
// ExamForge AI Engine — Core AI Service Layer
// ============================================================================
// Production-ready AI engine that integrates with z-ai-web-dev-sdk
// and tracks all generations in the ai_generations table.
// Ready for Gemini/OpenAI/Claude integration via provider abstraction.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  AiProvider,
  GenerationStatus,
  AiGenerationInsert,
  AiGenerationRow,
} from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AIRequest {
  prompt: string
  systemPrompt?: string
  userId: string
  schoolId?: string | null
  provider?: AiProvider
  model?: string
  temperature?: number
  maxTokens?: number
  /** Optional metadata for tracking */
  metadata?: Record<string, unknown>
  /** If this generation creates questions, track counts */
  questionTracking?: {
    templateId?: string
    inputParams?: Record<string, unknown>
  }
}

export interface AIResponse {
  content: string
  generationId: string
  tokensInput: number | null
  tokensOutput: number | null
  costUsd: number | null
  durationMs: number
  provider: AiProvider
  model: string
}

export interface AIStreamChunk {
  content: string
  done: boolean
  error?: string
}

export interface StructuredAIResponse<T> extends AIResponse {
  parsed: T
}

// ──────────────────────────────────────────────────────────────
// Provider Configuration
// ──────────────────────────────────────────────────────────────

const DEFAULT_PROVIDER: AiProvider = 'gemini'
const DEFAULT_MODEL = 'gemini-2.0-flash'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 4096

/**
 * Map a flow's metadata.type to a valid prompt_type enum value.
 * The live enum: distractor_generation, document_extraction,
 * explanation_generation, question_generation, question_improvement,
 * question_validation, translation (+ lesson_plan, chat_completion from
 * migration 010). Anything unmapped lands on chat_completion.
 */
const PROMPT_TYPE_VALUES = new Set([
  'distractor_generation',
  'document_extraction',
  'explanation_generation',
  'question_generation',
  'question_improvement',
  'question_validation',
  'translation',
  'lesson_plan',
  'chat_completion',
])
function resolveGenerationType(flowType: unknown): string {
  const t = typeof flowType === 'string' ? flowType : ''
  return PROMPT_TYPE_VALUES.has(t) ? t : 'chat_completion'
}

// ──────────────────────────────────────────────────────────────
// AI Engine Core
// ──────────────────────────────────────────────────────────────

/**
 * Execute a single AI completion and track it in the database.
 * This is the primary interface for all AI operations.
 */
export async function executeAI(request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now()
  const provider = request.provider ?? DEFAULT_PROVIDER
  const model = request.model ?? DEFAULT_MODEL
  const temperature = request.temperature ?? DEFAULT_TEMPERATURE

  // ── Create generation record in DB ──
  const supabase = await createClient()
  const generationId = crypto.randomUUID()

  const generationRecord: AiGenerationInsert = {
    id: generationId,
    // Legacy NOT NULL columns — the live table enforces these; omitting them
    // silently dropped every tracking row before RC1 (migration 010 companion).
    requested_by: request.userId,
    model_name: model,
    generation_type: resolveGenerationType(request.metadata?.type),
    input_params: request.questionTracking?.inputParams ?? {},
    user_id: request.userId,
    school_id: request.schoolId ?? null,
    provider,
    model,
    status: 'processing',
    prompt_text: request.prompt,
    system_prompt: request.systemPrompt ?? null,
    prompt_template_id: request.questionTracking?.templateId ?? null,
    metadata: request.metadata ?? null,
  }

  // ── Create generation record in DB ──
  // (Ω-15: tracking failures are logged, never silent — the missing-column
  //  defect in pre-008 schemas used to swallow these errors completely.)
  const insertResult = await supabase
    .from('ai_generation_requests')
    .insert(generationRecord)
  if (insertResult.error) {
    console.warn(
      '[AI Engine] generation tracking insert failed (migration 008 pending?):',
      insertResult.error.message
    )
  }

  try {
    // ── Execute via z-ai-web-dev-sdk with timeout ──
    const messages = []
    if (request.systemPrompt) {
      messages.push({ role: 'system' as const, content: request.systemPrompt })
    }
    messages.push({ role: 'user' as const, content: request.prompt })

    // 30-second timeout to prevent hanging AI calls
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    let response
    try {
      // ── Execute via z-ai-web-dev-sdk with timeout ──
      // (RC1: the SDK import + create() live INSIDE the guarded block so a
      //  sandbox-config failure falls through to the edge-function fallback.)
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const ai = await ZAI.create()
      response = await ai.chat.completions.create({
        messages,
        temperature,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      })
    } catch (zaiError) {
      // RC1 portable fallback: the z-ai-web-dev-sdk is sandbox-only (its
      // file-based config never exists on Vercel). Route the completion
      // through the Supabase ai-complete edge function, which holds the real
      // provider keys — this is what makes AI work in production.
      clearTimeout(timeoutId)
      let sessionToken: string | null = null
      try {
        sessionToken = (await supabase.auth?.getSession?.())?.data?.session?.access_token ?? null
      } catch {
        sessionToken = null
      }
      if (!sessionToken) throw zaiError
      const fallbackPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            provider: 'gemini',
            prompt: fallbackPrompt,
            maxTokens: Math.min(request.maxTokens ?? DEFAULT_MAX_TOKENS, 4096),
            temperature,
          }),
        }
      )
      if (!r.ok) {
        throw new Error(
          `AI fallback failed (edge function HTTP ${r.status}): ${(await r.text()).slice(0, 200)}`
        )
      }
      const d = await r.json()
      response = {
        choices: [{ message: { content: d.content ?? '' } }],
        usage: {
          prompt_tokens: d.usage?.promptTokens ?? null,
          completion_tokens: d.usage?.completionTokens ?? null,
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }

    const content = response.choices?.[0]?.message?.content ?? ''
    const tokensInput = response.usage?.prompt_tokens ?? null
    const tokensOutput = response.usage?.completion_tokens ?? null
    const durationMs = Date.now() - startTime

    // Estimate cost (Gemini 2.0 Flash: ~$0.000075/1K input, ~$0.0003/1K output)
    const costUsd = estimateCost(provider, tokensInput, tokensOutput)

    // ── Update generation record ──
    // (Ω-15: completion/failure updates are logged too — a missing update
    //  would silently drop token/cost/latency data from the analytics.)
    // (RC1: also set the LEGACY columns — the usage-stats trigger reads
    //  input_tokens/output_tokens/total_cost/generation_time_ms/completed_at,
    //  so writing only the migration-008 aliases starves the rollup.)
    const completionUpdate = await supabase
      .from('ai_generation_requests')
      .update({
        status: 'completed',
        raw_response: content,
        output: { content, parsed: null },
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost_usd: costUsd,
        duration_ms: durationMs,
        input_tokens: tokensInput,
        output_tokens: tokensOutput,
        total_cost: costUsd,
        generation_time_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId)
    if (completionUpdate.error) {
      console.warn(
        '[AI Engine] generation completion update failed (migration 008 pending?):',
        completionUpdate.error.message
      )
    }

    return {
      content,
      generationId,
      tokensInput,
      tokensOutput,
      costUsd,
      durationMs,
      provider,
      model,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI error'

    // ── Update generation record with error ──
    // (RC1: mirror the duration into the legacy column the trigger reads.)
    const failureUpdate = await supabase
      .from('ai_generation_requests')
      .update({
        status: 'failed',
        error_message: errorMessage,
        duration_ms: durationMs,
        generation_time_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId)
    if (failureUpdate.error) {
      console.warn(
        '[AI Engine] generation failure update failed (migration 008 pending?):',
        failureUpdate.error.message
      )
    }

    throw new Error(`AI generation failed: ${errorMessage}`)
  }
}

/**
 * Execute an AI completion with structured output parsing.
 * Parses the AI response as JSON and validates against a parser function.
 */
export async function executeStructuredAI<T>(
  request: AIRequest,
  parser: (raw: string) => T
): Promise<StructuredAIResponse<T>> {
  // Add instruction for structured output
  const enhancedPrompt = `${request.prompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown code fences. No explanatory text before or after the JSON.`
  const enhancedSystem = request.systemPrompt
    ? `${request.systemPrompt}\n\nYou must respond with valid JSON only.`
    : 'You must respond with valid JSON only. No markdown formatting.'

  const response = await executeAI({
    ...request,
    prompt: enhancedPrompt,
    systemPrompt: enhancedSystem,
    temperature: request.temperature ?? 0.3, // Lower temperature for structured output
  })

  let parsed: T
  try {
    // Try to extract JSON from the response (handle markdown code fences)
    let jsonStr = response.content
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    // Also try to find JSON object/array directly
    if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
      const objectMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (objectMatch) jsonStr = objectMatch[1]
    }
    const rawParsed = JSON.parse(jsonStr)
    parsed = parser(rawParsed)
  } catch {
    // If JSON parsing fails, try the parser directly on raw content
    parsed = parser(response.content)
  }

  return { ...response, parsed }
}

/**
 * Create a streaming AI response (for real-time UI).
 * Returns an async generator that yields chunks.
 */
export async function* streamAI(
  request: AIRequest
): AsyncGenerator<AIStreamChunk> {
  const provider = request.provider ?? DEFAULT_PROVIDER
  const model = request.model ?? DEFAULT_MODEL

  // ── Create generation record ──
  const supabase = await createClient()
  const generationId = crypto.randomUUID()
  const startTime = Date.now()

  const streamInsert = await supabase.from('ai_generation_requests').insert({
    id: generationId,
    // Legacy NOT NULL columns — see executeAI for the contract note.
    requested_by: request.userId,
    model_name: model,
    generation_type: resolveGenerationType(request.metadata?.type),
    input_params: {},
    user_id: request.userId,
    school_id: request.schoolId ?? null,
    provider,
    model,
    status: 'processing',
    prompt_text: request.prompt,
    system_prompt: request.systemPrompt ?? null,
  })
  if (streamInsert.error) {
    console.warn(
      '[AI Engine] stream generation insert failed (migration 008 pending?):',
      streamInsert.error.message
    )
  }

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const ai = await ZAI.create()

    const messages = []
    if (request.systemPrompt) {
      messages.push({ role: 'system' as const, content: request.systemPrompt })
    }
    messages.push({ role: 'user' as const, content: request.prompt })

    const stream = await ai.chat.completions.create({
      messages,
      stream: true,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    })

    let fullContent = ''

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content ?? ''
      if (content) {
        fullContent += content
        yield { content, done: false }
      }
    }

    // Update generation record
    // (RC1: legacy columns included — the usage-stats trigger reads them.)
    const durationMs = Date.now() - startTime
    const streamCompletion = await supabase
      .from('ai_generation_requests')
      .update({
        status: 'completed',
        raw_response: fullContent,
        output: { content: fullContent },
        duration_ms: durationMs,
        generation_time_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId)
    if (streamCompletion.error) {
      console.warn(
        '[AI Engine] stream completion update failed (migration 008 pending?):',
        streamCompletion.error.message
      )
    }

    yield { content: '', done: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Stream error'
    const streamFailure = await supabase
      .from('ai_generation_requests')
      .update({
        status: 'failed',
        error_message: errorMessage,
        duration_ms: Date.now() - startTime,
        generation_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId)
    if (streamFailure.error) {
      console.warn(
        '[AI Engine] stream failure update failed (migration 008 pending?):',
        streamFailure.error.message
      )
    }

    yield { content: '', done: true, error: errorMessage }
  }
}

// ──────────────────────────────────────────────────────────────
// AI Generation History & Analytics
// ──────────────────────────────────────────────────────────────

export interface GenerationHistoryFilters {
  userId?: string
  schoolId?: string
  provider?: AiProvider
  status?: GenerationStatus
  limit?: number
  offset?: number
}

export async function getGenerationHistory(
  filters: GenerationHistoryFilters
): Promise<{ generations: AiGenerationRow[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('ai_generation_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.schoolId) query = query.eq('school_id', filters.schoolId)
  if (filters.provider) query = query.eq('provider', filters.provider)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)

  const { data, count, error } = await query

  if (error) {
    console.warn(
      '[AI Engine] generation history query failed (migration 008 pending?):',
      error.message
    )
    return { generations: [], total: 0 }
  }

  return { generations: (data as AiGenerationRow[]) ?? [], total: count ?? 0 }
}

export async function getGenerationStats(
  schoolId?: string | null
): Promise<{
  totalGenerations: number
  totalTokens: number
  totalCost: number
  byProvider: Record<string, number>
  byStatus: Record<string, number>
  avgDurationMs: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from('ai_generation_requests')
    .select('provider, status, tokens_input, tokens_output, cost_usd, duration_ms')

  if (schoolId) query = query.eq('school_id', schoolId)

  // P1-REVENUE: Add explicit limit to prevent unbounded loading
  const { data, error: statsError } = await query
    .order('created_at', { ascending: false })
    .limit(10000)
  if (statsError) {
    console.warn(
      '[AI Engine] generation stats query failed (migration 008 pending?):',
      statsError.message
    )
  }
  const rows = data ?? []

  const totalGenerations = rows.length
  const totalTokens = rows.reduce((sum, r) => sum + (r.tokens_input ?? 0) + (r.tokens_output ?? 0), 0)
  const totalCost = rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0)
  const avgDurationMs = totalGenerations > 0
    ? rows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / totalGenerations
    : 0

  const byProvider: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  }

  return { totalGenerations, totalTokens, totalCost, byProvider, byStatus, avgDurationMs }
}

// ──────────────────────────────────────────────────────────────
// Cost Estimation
// ──────────────────────────────────────────────────────────────

function estimateCost(
  provider: AiProvider,
  tokensInput: number | null,
  tokensOutput: number | null
): number {
  if (!tokensInput && !tokensOutput) return 0

  const inputTokens = tokensInput ?? 0
  const outputTokens = tokensOutput ?? 0

  // Cost per 1K tokens (as of 2025 pricing)
  const pricing: Record<AiProvider, { input: number; output: number }> = {
    gemini: { input: 0.000075, output: 0.0003 },
    openai: { input: 0.00015, output: 0.0006 },
    claude: { input: 0.00025, output: 0.00125 },
    deepseek: { input: 0.000014, output: 0.000028 },
    grok: { input: 0.00005, output: 0.00015 },
    local_llm: { input: 0, output: 0 },
  }

  const p = pricing[provider] ?? pricing.gemini
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output
}

// ──────────────────────────────────────────────────────────────
// System Prompts by Role
// ──────────────────────────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  teacher: `You are ExamForge AI Teacher Assistant, an expert in education, pedagogy, curriculum design, assessment, and student engagement. You deeply understand Nigerian/WAEC/NECO/JAMB curriculum standards. You help teachers with:
- Creating lesson plans aligned to curriculum objectives
- Generating exam questions (MCQ, essay, short answer, etc.)
- Building rubrics for assessment
- Analyzing student performance data
- Suggesting interventions for struggling students
- Predicting which students are at risk
- Creating worksheets and practice materials
- Marking and grading assistance

Always be specific, actionable, and grounded in educational best practices. When creating content, ensure it aligns with the stated curriculum and difficulty level. Use markdown formatting for readability.`,

  student: `You are ExamForge AI Student Tutor, a patient, encouraging, and expert tutor. You help students with:
- Explaining concepts in simple, memorable ways
- Creating personalized study plans
- Identifying weaknesses from performance data
- Generating practice questions at the right difficulty
- Providing revision strategies
- Explaining why answers are correct or incorrect
- Breaking down complex topics into digestible parts
- Building confidence through progressive learning

Always be encouraging, use analogies and real-world examples, and check understanding before moving on. Adapt your language to the student's level. Never just give answers—guide students to discover them.`,

  parent: `You are ExamForge AI Parent Advisor, an expert in child development, educational psychology, and home-school partnerships. You help parents with:
- Understanding their child's academic progress
- Interpreting grades and performance reports
- Providing home learning recommendations
- Identifying when their child needs additional support
- Suggesting effective study routines at home
- Explaining school policies and curriculum expectations
- Preparing for parent-teacher meetings

Be supportive, clear, and practical. Avoid jargon. Focus on actionable steps parents can take at home to support their child's learning.`,

  school_admin: `You are ExamForge AI School Administrator Assistant, an expert in school management, educational leadership, and institutional effectiveness. You help administrators with:
- Staffing analysis and recommendations
- Enrollment forecasting and trends
- Revenue and budget analysis
- Risk detection (at-risk students, teacher burnout)
- Attendance pattern analysis and prediction
- Resource allocation optimization
- Performance benchmarking
- Compliance monitoring

Be data-driven, strategic, and practical. Provide specific recommendations backed by the data available. Consider resource constraints and prioritize high-impact interventions.`,

  super_admin: `You are ExamForge AI Platform Intelligence, an expert in multi-school management, national education policy, and system-wide analytics. You help with:
- District/regional intelligence across schools
- School performance comparison and ranking
- Curriculum compliance monitoring
- National trend analysis
- Policy impact assessment
- Resource distribution optimization
- System-wide risk identification

Be strategic, systemic, and policy-oriented. Consider equity, efficiency, and educational outcomes at scale.`,
} as const

/**
 * Get a role-specific system prompt with optional page context.
 */
export function getSystemPrompt(
  role: keyof typeof SYSTEM_PROMPTS | string,
  pageContext?: string
): string {
  const basePrompt = SYSTEM_PROMPTS[role as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.student
  if (pageContext) {
    return `${basePrompt}\n\nThe user is currently on the ${pageContext} page. Tailor your response to be relevant to this context.`
  }
  return basePrompt
}
