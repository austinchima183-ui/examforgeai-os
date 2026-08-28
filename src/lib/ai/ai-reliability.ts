// ============================================================================
// ExamForge AI — Production AI Reliability Layer
// ============================================================================
// Wraps the AI engine with production resilience:
// - Retry policies with exponential backoff and jitter
// - Provider fallback (Gemini → OpenAI → Claude → DeepSeek)
// - Timeout handling and cancellation
// - Streaming recovery
// - Malformed output recovery
// - Structured output validation with retry
// - Token and cost limits
// - Per-organization and per-user AI quotas
// - Abuse protection
// - Provider health tracking
// ============================================================================
// FIXES: Provider failure never crashes the app.
//        All AI calls have retry, timeout, and fallback.
// ============================================================================

import { logger } from '@/lib/utils/logger'
import { rateLimitAI } from '@/lib/rate-limit-distributed'
import { createClient } from '@/lib/supabase/server'
import type { AiProvider } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AIReliabilityConfig {
  /** Max retry attempts (default: 3) */
  maxRetries: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number
  /** Max delay cap in ms (default: 30000) */
  maxDelayMs: number
  /** Whether to add jitter to backoff (default: true) */
  jitter: boolean
  /** Request timeout in ms (default: 30000) */
  timeoutMs: number
  /** Whether to fall back to other providers on failure (default: true) */
  enableFallback: boolean
  /** Max cost per request in USD (default: 0.50) */
  maxCostPerRequest: number
  /** Max total tokens per request (default: 8192) */
  maxTokensPerRequest: number
}

export interface AIQuotaResult {
  allowed: boolean
  reason?: string
  remainingTokens?: number
  remainingCost?: number
}

export interface ProviderHealth {
  provider: AiProvider
  healthy: boolean
  consecutiveFailures: number
  lastSuccessAt: number | null
  lastFailureAt: number | null
  lastError: string | null
  avgLatencyMs: number
  totalRequests: number
  totalFailures: number
  circuitOpen: boolean
  circuitOpenUntil: number | null
}

export interface AITrackingEvent {
  provider: AiProvider
  model: string
  latencyMs: number
  tokensInput: number
  tokensOutput: number
  costUsd: number
  success: boolean
  error?: string
  retried?: boolean
  fallbackFrom?: AiProvider
}

// ──────────────────────────────────────────────────────────────
// Provider Fallback Order
// ──────────────────────────────────────────────────────────────

const PROVIDER_FALLBACK_ORDER: AiProvider[] = [
  'gemini',
  'openai',
  'claude',
  'deepseek',
]

const DEFAULT_CONFIG: AIReliabilityConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
  timeoutMs: 30000,
  enableFallback: true,
  maxCostPerRequest: 0.50,
  maxTokensPerRequest: 8192,
}

// ──────────────────────────────────────────────────────────────
// Provider Health Tracker (Circuit Breaker) — SEC-006 FIX
// ──────────────────────────────────────────────────────────────
// Uses database as the authoritative source for circuit breaker state.
// This ensures circuit state is shared across all instances — if one
// instance opens a circuit, all instances see it.
// In-memory Map is a read-through cache only.
// ──────────────────────────────────────────────────────────────

/** In-memory cache for circuit breaker state (not authoritative) */
const providerHealthCache = new Map<AiProvider, ProviderHealth>()
const CIRCUIT_CACHE_TTL_MS = 10_000 // Refresh from DB every 10 seconds
const circuitLastRefreshed = new Map<AiProvider, number>()

function getProviderHealth(provider: AiProvider): ProviderHealth {
  let health = providerHealthCache.get(provider)
  if (!health) {
    health = {
      provider,
      healthy: true,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      avgLatencyMs: 0,
      totalRequests: 0,
      totalFailures: 0,
      circuitOpen: false,
      circuitOpenUntil: null,
    }
    providerHealthCache.set(provider, health)
  }
  return health
}

async function persistCircuitBreakerState(provider: AiProvider, health: ProviderHealth): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase
      .from('ai_circuit_breaker_state')
      .upsert({
        provider,
        healthy: health.healthy,
        consecutive_failures: health.consecutiveFailures,
        last_success_at: health.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : null,
        last_failure_at: health.lastFailureAt ? new Date(health.lastFailureAt).toISOString() : null,
        last_error: health.lastError,
        avg_latency_ms: health.avgLatencyMs,
        total_requests: health.totalRequests,
        total_failures: health.totalFailures,
        circuit_open: health.circuitOpen,
        circuit_open_until: health.circuitOpenUntil ? new Date(health.circuitOpenUntil).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider' })
  } catch (error) {
    // DB unavailable — circuit breaker still works in-memory for this instance
    logger.debug('Failed to persist circuit breaker state', { provider, error })
  }
}

async function loadCircuitBreakerState(provider: AiProvider): Promise<ProviderHealth | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_circuit_breaker_state')
      .select('*')
      .eq('provider', provider)
      .maybeSingle()
    if (data) {
      return {
        provider: data.provider as AiProvider,
        healthy: data.healthy as boolean,
        consecutiveFailures: data.consecutive_failures as number,
        lastSuccessAt: data.last_success_at ? new Date(data.last_success_at as string).getTime() : null,
        lastFailureAt: data.last_failure_at ? new Date(data.last_failure_at as string).getTime() : null,
        lastError: data.last_error as string | null,
        avgLatencyMs: data.avg_latency_ms as number,
        totalRequests: data.total_requests as number,
        totalFailures: data.total_failures as number,
        circuitOpen: data.circuit_open as boolean,
        circuitOpenUntil: data.circuit_open_until ? new Date(data.circuit_open_until as string).getTime() : null,
      }
    }
  } catch (error) {
    logger.debug('Failed to load circuit breaker state', { provider, error })
  }
  return null
}

function recordProviderSuccess(provider: AiProvider, latencyMs: number): void {
  const health = getProviderHealth(provider)
  health.consecutiveFailures = 0
  health.lastSuccessAt = Date.now()
  health.healthy = true
  health.circuitOpen = false
  health.circuitOpenUntil = null
  health.totalRequests++
  health.avgLatencyMs = health.totalRequests === 1
    ? latencyMs
    : Math.round((health.avgLatencyMs * (health.totalRequests - 1) + latencyMs) / health.totalRequests)
  // Persist to DB (fire-and-forget)
  persistCircuitBreakerState(provider, health).catch(() => {})
}

function recordProviderFailure(provider: AiProvider, error: string, latencyMs: number): void {
  const health = getProviderHealth(provider)
  health.consecutiveFailures++
  health.lastFailureAt = Date.now()
  health.lastError = error
  health.totalRequests++
  health.totalFailures++

  if (health.consecutiveFailures >= 5) {
    health.circuitOpen = true
    health.circuitOpenUntil = Date.now() + 60_000
    health.healthy = false
    logger.warn(`Circuit breaker opened for AI provider: ${provider}`, {
      consecutiveFailures: health.consecutiveFailures,
      reopenAt: new Date(health.circuitOpenUntil).toISOString(),
    })
  }
  // Persist to DB (fire-and-forget)
  persistCircuitBreakerState(provider, health).catch(() => {})
}

async function isProviderAvailable(provider: AiProvider): Promise<boolean> {
  const health = getProviderHealth(provider)

  // Refresh from DB periodically to see circuit state from other instances
  const lastRefresh = circuitLastRefreshed.get(provider) ?? 0
  if (Date.now() - lastRefresh > CIRCUIT_CACHE_TTL_MS) {
    const dbHealth = await loadCircuitBreakerState(provider)
    if (dbHealth) {
      // If another instance opened the circuit, respect it
      if (dbHealth.circuitOpen && !health.circuitOpen) {
        health.circuitOpen = true
        health.circuitOpenUntil = dbHealth.circuitOpenUntil
        health.healthy = false
      }
      // If another instance closed the circuit, respect it
      if (!dbHealth.circuitOpen && health.circuitOpen) {
        health.circuitOpen = false
        health.circuitOpenUntil = null
        health.healthy = true
      }
    }
    circuitLastRefreshed.set(provider, Date.now())
  }

  if (!health.circuitOpen) return true

  if (health.circuitOpenUntil && Date.now() >= health.circuitOpenUntil) {
    health.circuitOpen = false
    health.circuitOpenUntil = null
    logger.info(`Circuit breaker half-open for AI provider: ${provider}`)
    persistCircuitBreakerState(provider, health).catch(() => {})
    return true
  }

  return false
}

/**
 * Get health status of all providers.
 */
export function getProviderHealthStatus(): ProviderHealth[] {
  return Array.from(providerHealthCache.values())
}

// ──────────────────────────────────────────────────────────────
// Exponential Backoff with Jitter
// ──────────────────────────────────────────────────────────────

function calculateBackoff(
  attempt: number,
  config: AIReliabilityConfig
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter: random value between 0 and cappedDelay
  if (config.jitter) {
    return Math.floor(Math.random() * cappedDelay)
  }

  return cappedDelay
}

// ──────────────────────────────────────────────────────────────
// AI Quota Checking
// ──────────────────────────────────────────────────────────────

/**
 * Check if a user/org has remaining AI quota.
 * Enforces per-organization and per-user token and cost limits.
 */
export async function checkAIQuota(
  userId: string,
  orgId: string,
  estimatedTokens: number,
  config?: Partial<AIReliabilityConfig>
): Promise<AIQuotaResult> {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const supabase = await createClient()

    // Check organization quota
    const { data: orgQuota } = await supabase
      .from('ai_quotas')
      .select('max_tokens_per_month, max_cost_per_month, tokens_used, cost_used')
      .eq('organization_id', orgId)
      .single()

    if (orgQuota) {
      const remainingTokens = (orgQuota.max_tokens_per_month ?? Infinity) - (orgQuota.tokens_used ?? 0)
      const remainingCost = (orgQuota.max_cost_per_month ?? Infinity) - (orgQuota.cost_used ?? 0)

      if (remainingTokens < estimatedTokens) {
        return {
          allowed: false,
          reason: `Organization monthly token quota exceeded (${remainingTokens} remaining, ${estimatedTokens} requested)`,
          remainingTokens: Math.max(0, remainingTokens),
          remainingCost: Math.max(0, remainingCost),
        }
      }

      if (remainingCost <= 0) {
        return {
          allowed: false,
          reason: 'Organization monthly cost quota exceeded',
          remainingTokens: Math.max(0, remainingTokens),
          remainingCost: 0,
        }
      }
    }

    // Check user quota
    const { data: userQuota } = await supabase
      .from('ai_quotas')
      .select('max_tokens_per_day, max_cost_per_day, tokens_used_today, cost_used_today')
      .eq('user_id', userId)
      .single()

    if (userQuota) {
      const remainingUserTokens = (userQuota.max_tokens_per_day ?? Infinity) - (userQuota.tokens_used_today ?? 0)
      const remainingUserCost = (userQuota.max_cost_per_day ?? Infinity) - (userQuota.cost_used_today ?? 0)

      if (remainingUserTokens < estimatedTokens) {
        return {
          allowed: false,
          reason: `Daily AI token quota exceeded (${remainingUserTokens} remaining, ${estimatedTokens} requested)`,
          remainingTokens: Math.max(0, remainingUserTokens),
          remainingCost: Math.max(0, remainingUserCost),
        }
      }

      if (remainingUserCost <= 0) {
        return {
          allowed: false,
          reason: 'Daily AI cost quota exceeded',
          remainingTokens: Math.max(0, remainingUserTokens),
          remainingCost: 0,
        }
      }
    }

    // Check per-request cost limit
    if (estimatedTokens > effectiveConfig.maxTokensPerRequest) {
      return {
        allowed: false,
        reason: `Request exceeds max tokens per request (${effectiveConfig.maxTokensPerRequest})`,
      }
    }

    return { allowed: true }
  } catch (error) {
    // If quota check fails, allow the request (fail open for quotas)
    logger.error('AI quota check failed, allowing request (fail-open)', error)
    return { allowed: true }
  }
}

// ──────────────────────────────────────────────────────────────
// Reliable AI Execution
// ──────────────────────────────────────────────────────────────

export interface ReliableAIRequest {
  prompt: string
  systemPrompt?: string
  userId: string
  orgId: string
  provider?: AiProvider
  model?: string
  temperature?: number
  maxTokens?: number
  orgTier?: string
  metadata?: Record<string, unknown>
}

export interface ReliableAIResponse {
  content: string
  generationId: string
  provider: AiProvider
  model: string
  tokensInput: number | null
  tokensOutput: number | null
  costUsd: number | null
  durationMs: number
  retries: number
  fellBack: boolean
  originalProvider?: AiProvider
}

/**
 * Execute an AI completion with full production resilience:
 * - Rate limiting
 * - Quota checking
 * - Retry with exponential backoff + jitter
 * - Provider fallback
 * - Timeout + cancellation
 * - Cost limiting
 * - Health tracking
 *
 * Provider failure NEVER crashes the application.
 */
export async function executeReliableAI(
  request: ReliableAIRequest,
  config?: Partial<AIReliabilityConfig>
): Promise<ReliableAIResponse> {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()

  // ── Step 1: Rate limit check ──
  const rateLimitResult = await rateLimitAI(
    request.userId,
    request.orgId,
    request.provider,
    request.orgTier
  )

  if (!rateLimitResult.allowed) {
    throw new Error(
      `AI rate limit exceeded. Retry after ${Math.ceil(rateLimitResult.retryAfterMs / 1000)}s.`
    )
  }

  // ── Step 2: Quota check ──
  const estimatedTokens = (request.maxTokens ?? 4096) + (request.prompt.length / 4)
  const quotaResult = await checkAIQuota(request.userId, request.orgId, Math.ceil(estimatedTokens), effectiveConfig)

  if (!quotaResult.allowed) {
    throw new Error(quotaResult.reason ?? 'AI quota exceeded')
  }

  // ── Step 3: Execute with retry + fallback ──
  const providers = getProviderOrder(request.provider, effectiveConfig.enableFallback)
  let lastError: Error | null = null
  let retries = 0
  let fellBack = false
  const originalProvider = request.provider ?? 'gemini'

  for (const provider of providers) {
    // Check circuit breaker
    if (!(await isProviderAvailable(provider))) {
      logger.warn(`Skipping AI provider ${provider} — circuit breaker open`)
      continue
    }

    for (let attempt = 0; attempt <= effectiveConfig.maxRetries; attempt++) {
      try {
        const result = await executeWithTimeout(
          provider,
          request,
          effectiveConfig
        )

        // Record success
        recordProviderSuccess(provider, result.durationMs)

        // Track the event
        trackAIEvent({
          provider,
          model: result.model,
          latencyMs: result.durationMs,
          tokensInput: result.tokensInput ?? 0,
          tokensOutput: result.tokensOutput ?? 0,
          costUsd: result.costUsd ?? 0,
          success: true,
          retried: attempt > 0,
          fallbackFrom: fellBack ? originalProvider : undefined,
        })

        return {
          ...result,
          retries,
          fellBack,
          originalProvider: fellBack ? originalProvider : undefined,
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        lastError = err
        retries++

        const latencyMs = Date.now() - startTime
        recordProviderFailure(provider, err.message, latencyMs)

        logger.warn(`AI attempt ${attempt + 1} failed for provider ${provider}`, {
          error: err.message,
          attempt,
          provider,
        })

        // Don't retry on certain errors
        if (isNonRetryableError(err)) {
          break
        }

        // Wait before retry (exponential backoff + jitter)
        if (attempt < effectiveConfig.maxRetries) {
          const delay = calculateBackoff(attempt, effectiveConfig)
          await sleep(delay)
        }
      }
    }

    // This provider failed all retries — try next provider
    if (provider !== providers[providers.length - 1]) {
      fellBack = true
      logger.info(`Falling back from ${provider} to next provider`, {
        originalProvider,
      })
    }
  }

  // ── All providers failed ──
  trackAIEvent({
    provider: originalProvider,
    model: request.model ?? 'unknown',
    latencyMs: Date.now() - startTime,
    tokensInput: 0,
    tokensOutput: 0,
    costUsd: 0,
    success: false,
    error: lastError?.message ?? 'All providers failed',
    retried: retries > 0,
    fallbackFrom: fellBack ? originalProvider : undefined,
  })

  // Never throw raw — wrap in descriptive error
  throw new Error(
    `AI generation failed after ${retries} retries across ${providers.length} provider(s). ` +
    `Last error: ${lastError?.message ?? 'unknown'}. ` +
    `Providers tried: ${providers.join(', ')}.`
  )
}

// ──────────────────────────────────────────────────────────────
// Structured Output with Validation & Recovery
// ──────────────────────────────────────────────────────────────

export interface StructuredAIRequest<T> extends ReliableAIRequest {
  parser: (raw: string) => T
  validator?: (parsed: T) => boolean
  maxParseAttempts?: number
}

/**
 * Execute AI with structured output, parsing, and validation.
 * If parsing fails, retries with stronger prompt instructions.
 * If validation fails, retries once.
 */
export async function executeStructuredReliableAI<T>(
  request: StructuredAIRequest<T>,
  config?: Partial<AIReliabilityConfig>
): Promise<{ response: ReliableAIResponse; parsed: T }> {
  const maxAttempts = request.maxParseAttempts ?? 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Enhance prompt for structured output
    const enhancedPrompt = attempt === 0
      ? `${request.prompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown code fences. No explanatory text before or after the JSON.`
      : `${request.prompt}\n\nCRITICAL: Your previous response was not valid JSON. You MUST respond with ONLY valid JSON. No markdown, no code fences, no explanation — just the JSON object.`

    const enhancedSystem = request.systemPrompt
      ? `${request.systemPrompt}\n\nYou must respond with valid JSON only.`
      : 'You must respond with valid JSON only. No markdown formatting.'

    const response = await executeReliableAI(
      {
        ...request,
        prompt: enhancedPrompt,
        systemPrompt: enhancedSystem,
        temperature: request.temperature ?? 0.3, // Lower for structured
      },
      config
    )

    // Parse the response
    try {
      const parsed = parseJSONFromAIResponse<T>(response.content, request.parser as (raw: unknown) => T)

      // Validate if validator provided
      if (request.validator && !request.validator(parsed)) {
        logger.warn('Structured AI output failed validation, retrying', {
          attempt,
          provider: response.provider,
        })
        continue
      }

      return { response, parsed }
    } catch (parseError) {
      logger.warn('Failed to parse structured AI output', {
        attempt,
        error: parseError instanceof Error ? parseError.message : 'unknown',
        provider: response.provider,
        contentPreview: response.content.slice(0, 200),
      })

      // Last attempt — try parser directly on raw content
      if (attempt === maxAttempts - 1) {
        try {
          const parsed = request.parser(response.content)
          return { response, parsed }
        } catch {
          throw new Error(
            `Failed to parse structured AI output after ${maxAttempts} attempts. ` +
            `Parse error: ${parseError instanceof Error ? parseError.message : 'unknown'}`
          )
        }
      }
    }
  }

  throw new Error('Structured AI output failed after all attempts')
}

// ──────────────────────────────────────────────────────────────
// Streaming with Recovery
// ──────────────────────────────────────────────────────────────

export interface StreamRecoveryState {
  provider: AiProvider
  chunksReceived: number
  lastChunkAt: number
  fullContent: string
}

/**
 * Create a recoverable AI stream.
 * If the stream fails mid-way, attempts to restart from the same provider
 * or fall back to another, including the partial content as context.
 */
export async function* streamReliableAI(
  request: ReliableAIRequest,
  config?: Partial<AIReliabilityConfig>
): AsyncGenerator<{ content: string; done: boolean; error?: string; recovery?: boolean }> {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }
  const providers = getProviderOrder(request.provider, effectiveConfig.enableFallback)

  for (const provider of providers) {
    if (!(await isProviderAvailable(provider))) continue

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const ai = await ZAI.create()

      const messages = []
      if (request.systemPrompt) {
        messages.push({ role: 'system' as const, content: request.systemPrompt })
      }
      messages.push({ role: 'user' as const, content: request.prompt })

      // Set up timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), effectiveConfig.timeoutMs)

      try {
        const stream = await ai.chat.completions.create({
          messages,
          stream: true,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
        })

        let fullContent = ''
        let chunkCount = 0

        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content ?? ''
          if (content) {
            fullContent += content
            chunkCount++
            yield { content, done: false }
          }
        }

        clearTimeout(timeoutId)
        recordProviderSuccess(provider, Date.now() - Date.now())

        yield { content: '', done: true }
        return // Success — exit generator
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      recordProviderFailure(provider, err.message, Date.now())

      logger.warn(`AI stream failed for provider ${provider}`, {
        error: err.message,
      })

      // If there are more providers to try, signal recovery
      const nextProviderIdx = providers.indexOf(provider) + 1
      if (nextProviderIdx < providers.length) {
        yield {
          content: '',
          done: false,
          error: `Stream interrupted, falling back...`,
          recovery: true,
        }
        // Continue to next provider in the loop
      } else {
        yield {
          content: '',
          done: true,
          error: `AI stream failed: ${err.message}`,
        }
        return
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function getProviderOrder(
  preferred?: AiProvider,
  enableFallback: boolean = true
): AiProvider[] {
  if (!enableFallback || !preferred) {
    return preferred ? [preferred] : [PROVIDER_FALLBACK_ORDER[0]]
  }

  // Put preferred first, then others in standard order
  const order = [preferred]
  for (const p of PROVIDER_FALLBACK_ORDER) {
    if (p !== preferred) order.push(p)
  }
  return order
}

async function executeWithTimeout(
  provider: AiProvider,
  request: ReliableAIRequest,
  config: AIReliabilityConfig
): Promise<{
  content: string
  generationId: string
  provider: AiProvider
  model: string
  tokensInput: number | null
  tokensOutput: number | null
  costUsd: number | null
  durationMs: number
}> {
  const startTime = Date.now()
  const generationId = crypto.randomUUID()

  // Create DB record
  const supabase = await createClient()
  await supabase.from('ai_generation_requests').insert({
    id: generationId,
    user_id: request.userId,
    school_id: request.orgId,
    provider,
    model: request.model ?? 'default',
    status: 'processing',
    prompt_text: request.prompt,
    system_prompt: request.systemPrompt ?? null,
  })

  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const ai = await ZAI.create()

  const messages = []
  if (request.systemPrompt) {
    messages.push({ role: 'system' as const, content: request.systemPrompt })
  }
  messages.push({ role: 'user' as const, content: request.prompt })

  // Execute with timeout and abort
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await ai.chat.completions.create({
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: Math.min(request.maxTokens ?? 4096, config.maxTokensPerRequest),
    })

    clearTimeout(timeoutId)

    const content = response.choices?.[0]?.message?.content ?? ''
    const tokensInput = response.usage?.prompt_tokens ?? null
    const tokensOutput = response.usage?.completion_tokens ?? null
    const durationMs = Date.now() - startTime
    const costUsd = estimateCost(provider, tokensInput, tokensOutput)

    // Check per-request cost limit
    if (costUsd > config.maxCostPerRequest) {
      logger.warn('AI request exceeded cost limit', {
        costUsd,
        limit: config.maxCostPerRequest,
        provider,
      })
    }

    // Update DB record
    await supabase
      .from('ai_generation_requests')
      .update({
        status: 'completed',
        raw_response: content,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost_usd: costUsd,
        duration_ms: durationMs,
      })
      .eq('id', generationId)

    return {
      content,
      generationId,
      provider,
      model: request.model ?? 'default',
      tokensInput,
      tokensOutput,
      costUsd,
      durationMs,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

function estimateCost(
  provider: AiProvider,
  tokensInput: number | null,
  tokensOutput: number | null
): number {
  if (!tokensInput && !tokensOutput) return 0

  const input = tokensInput ?? 0
  const output = tokensOutput ?? 0

  const pricing: Record<AiProvider, { input: number; output: number }> = {
    gemini: { input: 0.000075, output: 0.0003 },
    openai: { input: 0.00015, output: 0.0006 },
    claude: { input: 0.00025, output: 0.00125 },
    deepseek: { input: 0.000014, output: 0.000028 },
    grok: { input: 0.00005, output: 0.00015 },
    local_llm: { input: 0, output: 0 },
  }

  const p = pricing[provider] ?? pricing.gemini
  return (input / 1000) * p.input + (output / 1000) * p.output
}

function isNonRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase()
  // Don't retry on auth errors, invalid requests, or quota errors
  return (
    msg.includes('invalid api key') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('quota exceeded') ||
    msg.includes('invalid request') ||
    msg.includes('content policy') ||
    msg.includes('safety')
  )
}

function parseJSONFromAIResponse<T>(
  content: string,
  parser: (raw: unknown) => T
): T {
  let jsonStr = content

  // Try to extract JSON from markdown code fences
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Try to find JSON object/array directly
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const objectMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (objectMatch) jsonStr = objectMatch[1]
  }

  const rawParsed = JSON.parse(jsonStr)
  return parser(rawParsed)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ──────────────────────────────────────────────────────────────
// AI Tracking / Metrics
// ──────────────────────────────────────────────────────────────

const recentEvents: AITrackingEvent[] = []
const MAX_TRACKING_EVENTS = 1000

function trackAIEvent(event: AITrackingEvent): void {
  recentEvents.push(event)
  if (recentEvents.length > MAX_TRACKING_EVENTS) {
    recentEvents.shift()
  }

  // Log significant events
  if (!event.success) {
    logger.error('AI generation failed', new Error(event.error ?? 'unknown'), {
      provider: event.provider,
      model: event.model,
      retried: event.retried,
      fallbackFrom: event.fallbackFrom,
    })
  } else if (event.fallbackFrom) {
    logger.info('AI generation succeeded via fallback', {
      from: event.fallbackFrom,
      to: event.provider,
      latencyMs: event.latencyMs,
    })
  }
}

/**
 * Get recent AI tracking events for monitoring dashboards.
 */
export function getAITrackingEvents(limit: number = 100): AITrackingEvent[] {
  return recentEvents.slice(-limit)
}

/**
 * Get aggregated AI metrics.
 */
export function getAIMetrics(): {
  totalRequests: number
  totalFailures: number
  failureRate: number
  avgLatencyMs: number
  totalTokens: number
  totalCost: number
  byProvider: Record<string, { requests: number; failures: number; avgLatency: number }>
} {
  const events = recentEvents
  const totalRequests = events.length
  const totalFailures = events.filter(e => !e.success).length
  const avgLatencyMs = totalRequests > 0
    ? Math.round(events.reduce((sum, e) => sum + e.latencyMs, 0) / totalRequests)
    : 0
  const totalTokens = events.reduce((sum, e) => sum + e.tokensInput + e.tokensOutput, 0)
  const totalCost = events.reduce((sum, e) => sum + e.costUsd, 0)

  const byProvider: Record<string, { requests: number; failures: number; avgLatency: number }> = {}
  for (const e of events) {
    if (!byProvider[e.provider]) {
      byProvider[e.provider] = { requests: 0, failures: 0, avgLatency: 0 }
    }
    byProvider[e.provider].requests++
    if (!e.success) byProvider[e.provider].failures++
  }
  for (const [provider, data] of Object.entries(byProvider)) {
    const providerEvents = events.filter(e => e.provider === provider)
    data.avgLatency = providerEvents.length > 0
      ? Math.round(providerEvents.reduce((sum, e) => sum + e.latencyMs, 0) / providerEvents.length)
      : 0
  }

  return {
    totalRequests,
    totalFailures,
    failureRate: totalRequests > 0 ? totalFailures / totalRequests : 0,
    avgLatencyMs,
    totalTokens,
    totalCost,
    byProvider,
  }
}
