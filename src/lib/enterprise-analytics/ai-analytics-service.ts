// ============================================================================
// ExamForge AI — AI Usage Analytics Service
// ============================================================================
// Provides analytics on AI usage across the platform, including generation
// counts, token consumption, cost breakdown, error rates, credit utilization,
// and top use cases.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type AIAnalytics,
  type AIProviderUsage,
  type AICostAnalysis,
  type AIErrorRate,
  type CreditUtilization,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  type PercentageBreakdown,
  type LabeledValue,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main AI Analytics
// ──────────────────────────────────────────────────────────────

export async function getAIAnalytics(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<AIAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Fetch AI generations for the org
  const { data: generations } = await supabase
    .from('ai_generation_requests')
    .select('id, provider, model, status, tokens_input, tokens_output, cost_usd, duration_ms, created_at, prompt_template_id')
    .eq('school_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const genRows = generations ?? []

  // Core metrics
  const totalGenerations = genRows.length
  const totalTokens = genRows.reduce(
    (sum, g) => sum + (g.tokens_input ?? 0) + (g.tokens_output ?? 0),
    0
  )
  const totalCost = genRows.reduce((sum, g) => sum + (g.cost_usd ?? 0), 0)

  // By provider
  const providerMap: Record<string, { count: number; tokens: number; cost: number }> = {}
  for (const g of genRows) {
    const p = g.provider ?? 'unknown'
    if (!providerMap[p]) providerMap[p] = { count: 0, tokens: 0, cost: 0 }
    providerMap[p].count++
    providerMap[p].tokens += (g.tokens_input ?? 0) + (g.tokens_output ?? 0)
    providerMap[p].cost += g.cost_usd ?? 0
  }
  const byProvider: PercentageBreakdown[] = Object.entries(providerMap)
    .map(([label, data]) => ({
      label,
      value: data.count,
      percentage: totalGenerations > 0 ? (data.count / totalGenerations) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  // By model
  const modelMap: Record<string, number> = {}
  for (const g of genRows) {
    const m = g.model ?? 'unknown'
    modelMap[m] = (modelMap[m] ?? 0) + 1
  }
  const byModel: PercentageBreakdown[] = Object.entries(modelMap)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalGenerations > 0 ? (value / totalGenerations) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  // Average latency
  const completedGens = genRows.filter(g => g.duration_ms !== null)
  const avgLatency = completedGens.length > 0
    ? completedGens.reduce((sum, g) => sum + (g.duration_ms ?? 0), 0) / completedGens.length
    : 0

  // Error rate
  const failedGens = genRows.filter(g => g.status === 'failed').length
  const errorRate = totalGenerations > 0 ? (failedGens / totalGenerations) * 100 : 0

  // Top use cases
  const topUseCases = await getTopAIUseCases(orgId, period, custom)

  // Credit utilization
  const creditUtilization = await getAICreditUtilization(orgId)

  return {
    totalGenerations,
    totalTokens,
    totalCost,
    byProvider,
    byModel,
    avgLatency,
    errorRate,
    topUseCases,
    creditUtilization,
  }
}

// ──────────────────────────────────────────────────────────────
// AI Usage by Provider
// ──────────────────────────────────────────────────────────────

export async function getAIUsageByProvider(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<AIProviderUsage[]> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: generations } = await supabase
    .from('ai_generation_requests')
    .select('provider, status, tokens_input, tokens_output, cost_usd, duration_ms')
    .eq('school_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const genRows = generations ?? []

  const providerMap: Record<string, {
    generations: number
    tokens: number
    cost: number
    latencies: number[]
    errors: number
  }> = {}

  for (const g of genRows) {
    const p = g.provider ?? 'unknown'
    if (!providerMap[p]) {
      providerMap[p] = { generations: 0, tokens: 0, cost: 0, latencies: [], errors: 0 }
    }
    providerMap[p].generations++
    providerMap[p].tokens += (g.tokens_input ?? 0) + (g.tokens_output ?? 0)
    providerMap[p].cost += g.cost_usd ?? 0
    if (g.duration_ms !== null) providerMap[p].latencies.push(g.duration_ms)
    if (g.status === 'failed') providerMap[p].errors++
  }

  return Object.entries(providerMap).map(([provider, data]) => ({
    provider,
    generations: data.generations,
    tokens: data.tokens,
    cost: data.cost,
    avgLatency: data.latencies.length > 0
      ? data.latencies.reduce((s, v) => s + v, 0) / data.latencies.length
      : 0,
    errorRate: data.generations > 0 ? (data.errors / data.generations) * 100 : 0,
  })).sort((a, b) => b.generations - a.generations)
}

// ──────────────────────────────────────────────────────────────
// AI Cost Analysis
// ──────────────────────────────────────────────────────────────

export async function getAICostAnalysis(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<AICostAnalysis> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: generations } = await supabase
    .from('ai_generation_requests')
    .select('provider, model, cost_usd, created_at, prompt_template_id')
    .eq('school_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const genRows = generations ?? []
  const totalCost = genRows.reduce((sum, g) => sum + (g.cost_usd ?? 0), 0)

  // By provider
  const providerCostMap: Record<string, { cost: number; generations: number; tokens: number; latencies: number[]; errors: number }> = {}
  for (const g of genRows) {
    const p = g.provider ?? 'unknown'
    if (!providerCostMap[p]) {
      providerCostMap[p] = { cost: 0, generations: 0, tokens: 0, latencies: [], errors: 0 }
    }
    providerCostMap[p].cost += g.cost_usd ?? 0
    providerCostMap[p].generations++
  }

  const byProvider: AIProviderUsage[] = Object.entries(providerCostMap).map(([provider, data]) => ({
    provider,
    generations: data.generations,
    tokens: data.tokens,
    cost: data.cost,
    avgLatency: 0,
    errorRate: 0,
  }))

  // By model
  const modelCostMap: Record<string, { cost: number; generations: number }> = {}
  for (const g of genRows) {
    const m = g.model ?? 'unknown'
    if (!modelCostMap[m]) modelCostMap[m] = { cost: 0, generations: 0 }
    modelCostMap[m].cost += g.cost_usd ?? 0
    modelCostMap[m].generations++
  }

  const byModel = Object.entries(modelCostMap).map(([model, data]) => ({
    model,
    cost: data.cost,
    generations: data.generations,
  })).sort((a, b) => b.cost - a.cost)

  // By use case (based on prompt template)
  const useCaseCostMap: Record<string, { cost: number; generations: number }> = {}
  for (const g of genRows) {
    const useCase = g.prompt_template_id ?? 'general'
    if (!useCaseCostMap[useCase]) useCaseCostMap[useCase] = { cost: 0, generations: 0 }
    useCaseCostMap[useCase].cost += g.cost_usd ?? 0
    useCaseCostMap[useCase].generations++
  }

  const byUseCase = Object.entries(useCaseCostMap).map(([useCase, data]) => ({
    useCase,
    cost: data.cost,
    generations: data.generations,
  })).sort((a, b) => b.cost - a.cost)

  // Monthly trend
  const monthlyCost: Record<string, number> = {}
  for (const g of genRows) {
    if (!g.created_at) continue
    const monthKey = g.created_at.slice(0, 7)
    monthlyCost[monthKey] = (monthlyCost[monthKey] ?? 0) + (g.cost_usd ?? 0)
  }

  const trend: TimeSeriesPoint[] = Object.entries(monthlyCost)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))

  return {
    totalCost,
    byProvider,
    byModel,
    byUseCase,
    trend,
  }
}

// ──────────────────────────────────────────────────────────────
// AI Error Rate
// ──────────────────────────────────────────────────────────────

export async function getAIErrorRate(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<AIErrorRate> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: generations } = await supabase
    .from('ai_generation_requests')
    .select('provider, status, error_message, created_at')
    .eq('school_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const genRows = generations ?? []
  const totalRequests = genRows.length
  const totalErrors = genRows.filter(g => g.status === 'failed').length
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

  // By provider
  const providerErrorMap: Record<string, { total: number; errors: number }> = {}
  for (const g of genRows) {
    const p = g.provider ?? 'unknown'
    if (!providerErrorMap[p]) providerErrorMap[p] = { total: 0, errors: 0 }
    providerErrorMap[p].total++
    if (g.status === 'failed') providerErrorMap[p].errors++
  }

  const byProvider = Object.entries(providerErrorMap).map(([provider, data]) => ({
    provider,
    errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0,
    errorCount: data.errors,
  }))

  // By error type
  const errorTypeMap: Record<string, number> = {}
  for (const g of genRows) {
    if (g.status !== 'failed') continue
    const errorType = categorizeError(g.error_message)
    errorTypeMap[errorType] = (errorTypeMap[errorType] ?? 0) + 1
  }

  const byErrorType = Object.entries(errorTypeMap).map(([type, count]) => ({
    type,
    count,
    percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
  })).sort((a, b) => b.count - a.count)

  // Monthly trend
  const monthly: Record<string, { total: number; errors: number }> = {}
  for (const g of genRows) {
    if (!g.created_at) continue
    const monthKey = g.created_at.slice(0, 7)
    if (!monthly[monthKey]) monthly[monthKey] = { total: 0, errors: 0 }
    monthly[monthKey].total++
    if (g.status === 'failed') monthly[monthKey].errors++
  }

  const trend: TimeSeriesPoint[] = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: data.total > 0 ? (data.errors / data.total) * 100 : 0,
    }))

  return {
    totalRequests,
    totalErrors,
    errorRate,
    byProvider,
    byErrorType,
    trend,
  }
}

// ──────────────────────────────────────────────────────────────
// AI Credit Utilization
// ──────────────────────────────────────────────────────────────

export async function getAICreditUtilization(
  orgId: string
): Promise<CreditUtilization> {
  const supabase = await createClient()

  // Get org AI config for credit limits
  const { data: orgSettings } = await supabase
    .from('school_settings')
    .select('ai_config')
    .eq('school_id', orgId)
    .limit(1)

  const aiConfig = (orgSettings?.[0]?.ai_config as {
    monthlyTokenBudget?: number
    tokensConsumed?: number
  } | null) ?? null

  const totalCredits = aiConfig?.monthlyTokenBudget ?? 1000000
  const usedCredits = aiConfig?.tokensConsumed ?? 0

  // Calculate from actual generations this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: monthGens } = await supabase
    .from('ai_generation_requests')
    .select('tokens_input, tokens_output')
    .eq('school_id', orgId)
    .gte('created_at', monthStart)

  const actualUsed = (monthGens ?? []).reduce(
    (sum, g) => sum + (g.tokens_input ?? 0) + (g.tokens_output ?? 0),
    0
  )

  // Use the higher of config-stored or actual computed
  const effectiveUsed = Math.max(usedCredits, actualUsed)
  const remainingCredits = Math.max(0, totalCredits - effectiveUsed)

  // Reset date is first of next month
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  return {
    totalCredits,
    usedCredits: effectiveUsed,
    remainingCredits,
    utilizationPercent: totalCredits > 0 ? (effectiveUsed / totalCredits) * 100 : 0,
    resetDate,
  }
}

// ──────────────────────────────────────────────────────────────
// Top AI Use Cases
// ──────────────────────────────────────────────────────────────

export async function getTopAIUseCases(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<LabeledValue[]> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: generations } = await supabase
    .from('ai_generation_requests')
    .select('prompt_template_id, metadata')
    .eq('school_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const genRows = generations ?? []

  // Count by use case (prompt template or metadata category)
  const useCaseMap: Record<string, number> = {}
  for (const g of genRows) {
    const metadata = g.metadata as { useCase?: string } | null
    const useCase = metadata?.useCase ?? g.prompt_template_id ?? 'general'
    useCaseMap[useCase] = (useCaseMap[useCase] ?? 0) + 1
  }

  return Object.entries(useCaseMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function categorizeError(errorMessage: string | null): string {
  if (!errorMessage) return 'unknown'
  const msg = errorMessage.toLowerCase()
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'rate_limit'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout'
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('api key')) return 'authentication'
  if (msg.includes('quota') || msg.includes('billing') || msg.includes('credit')) return 'quota_exceeded'
  if (msg.includes('model') || msg.includes('not found')) return 'model_error'
  if (msg.includes('content') || msg.includes('safety') || msg.includes('filter')) return 'content_filter'
  if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) return 'network'
  return 'other'
}
