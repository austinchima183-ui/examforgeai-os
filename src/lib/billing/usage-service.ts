// ============================================================================
// ExamForge AI — Usage / Metered Billing Service
// ============================================================================
// Records usage events, checks plan limits, aggregates usage by period,
// and provides end-of-period forecasts.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  UsageMetric,
  UsageRecord,
  MeteredUsage,
} from './types'
import type { PlanTier } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Plan Limits by Tier
// ──────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<PlanTier, Record<UsageMetric, number>> = {
  free: {
    ai_credits: 100,
    api_calls: 1000,
    storage_gb: 1,
    exam_sessions: 5,
    students: 50,
  },
  starter: {
    ai_credits: 1000,
    api_calls: 5000,
    storage_gb: 10,
    exam_sessions: 50,
    students: 500,
  },
  professional: {
    ai_credits: 10000,
    api_calls: 50000,
    storage_gb: 100,
    exam_sessions: 500,
    students: 5000,
  },
  enterprise: {
    ai_credits: 100000,
    api_calls: 500000,
    storage_gb: 1000,
    exam_sessions: 5000,
    students: 50000,
  },
}

// ──────────────────────────────────────────────────────────────
// Metered Unit Prices (overage pricing)
// ──────────────────────────────────────────────────────────────

const METERED_UNIT_PRICES: Record<UsageMetric, number> = {
  ai_credits: 5,       // ₦5 per AI credit
  api_calls: 2,        // ₦2 per API call
  storage_gb: 500,     // ₦500 per GB
  exam_sessions: 100,  // ₦100 per exam session
  students: 50,        // ₦50 per student
}

// ──────────────────────────────────────────────────────────────
// recordUsage — Record a usage event
// ──────────────────────────────────────────────────────────────

export async function recordUsage(
  orgId: string,
  metric: UsageMetric,
  quantity: number,
  metadata?: Record<string, unknown>
): Promise<UsageRecord> {
  const supabase = await createClient()

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: record, error } = await supabase
    .from('usage_records')
    .insert({
      org_id: orgId,
      metric,
      quantity,
      period,
      timestamp: now.toISOString(),
      metadata: metadata ?? {},
    })
    .select('*')
    .single()

  if (error || !record) {
    throw new Error(`Failed to record usage: ${error?.message ?? 'Unknown error'}`)
  }

  return {
    id: record.id,
    orgId: record.org_id ?? orgId,
    metric: record.metric as UsageMetric,
    quantity: record.quantity ?? quantity,
    period: record.period ?? period,
    timestamp: record.timestamp ?? now.toISOString(),
    metadata: (record.metadata as Record<string, unknown>) ?? {},
  }
}

// ──────────────────────────────────────────────────────────────
// getUsage — Get usage for a period
// ──────────────────────────────────────────────────────────────

export async function getUsage(
  orgId: string,
  metric: UsageMetric,
  period: string
): Promise<UsageRecord[]> {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('usage_records')
    .select('*')
    .eq('org_id', orgId)
    .eq('metric', metric)
    .eq('period', period)
    .order('timestamp', { ascending: true })

  return (records ?? []).map((r) => ({
    id: r.id,
    orgId: r.org_id ?? orgId,
    metric: r.metric as UsageMetric,
    quantity: r.quantity ?? 0,
    period: r.period ?? period,
    timestamp: r.timestamp ?? '',
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }))
}

// ──────────────────────────────────────────────────────────────
// getMeteredBilling — Calculate metered charges
// ──────────────────────────────────────────────────────────────

export async function getMeteredBilling(
  orgId: string,
  period: string
): Promise<MeteredUsage[]> {
  const supabase = await createClient()

  // Get organization's current plan tier
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, plans(tier)')
    .eq('school_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const planTier = (((sub as unknown as { plans?: { tier: string } | null } | null)?.plans)?.tier as PlanTier) ?? 'free'
  const limits = PLAN_LIMITS[planTier]

  // Get aggregated usage for the period
  const { data: records } = await supabase
    .from('usage_records')
    .select('metric, quantity')
    .eq('org_id', orgId)
    .eq('period', period)

  // Aggregate by metric
  const aggregated: Record<string, number> = {}
  for (const record of records ?? []) {
    const metric = record.metric as string
    aggregated[metric] = (aggregated[metric] ?? 0) + (record.quantity ?? 0)
  }

  // Build metered usage for each metric
  const allMetrics: UsageMetric[] = ['ai_credits', 'api_calls', 'storage_gb', 'exam_sessions', 'students']

  return allMetrics.map((metric) => {
    const quantity = aggregated[metric] ?? 0
    const includedQuantity = limits[metric]
    const overageQuantity = Math.max(0, quantity - includedQuantity)
    const unitPrice = METERED_UNIT_PRICES[metric]
    const total = overageQuantity * unitPrice

    return {
      metric,
      quantity,
      unitPrice,
      total,
      includedQuantity,
      overageQuantity,
    }
  })
}

// ──────────────────────────────────────────────────────────────
// checkUsageLimit — Check if within plan limits
// ──────────────────────────────────────────────────────────────

export async function checkUsageLimit(
  orgId: string,
  metric: UsageMetric
): Promise<{ withinLimit: boolean; used: number; limit: number; remaining: number }> {
  const supabase = await createClient()

  // Get organization's plan tier
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_tier, current_period_start')
    .eq('org_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const planTier = (sub?.plan_tier as PlanTier) ?? 'free'
  const limit = PLAN_LIMITS[planTier][metric]

  // Get current period usage
  const periodStart = sub?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { data: usageRecords } = await supabase
    .from('usage_records')
    .select('quantity')
    .eq('org_id', orgId)
    .eq('metric', metric)
    .gte('timestamp', periodStart)

  const used = (usageRecords ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0)
  const remaining = Math.max(0, limit - used)

  return {
    withinLimit: used <= limit,
    used,
    limit,
    remaining,
  }
}

// ──────────────────────────────────────────────────────────────
// getUsageBreakdown — Breakdown by metric
// ──────────────────────────────────────────────────────────────

export async function getUsageBreakdown(
  orgId: string,
  period: string
): Promise<Record<UsageMetric, { used: number; limit: number; percentage: number }>> {
  const supabase = await createClient()

  // Get plan tier
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('org_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const planTier = (sub?.plan_tier as PlanTier) ?? 'free'
  const limits = PLAN_LIMITS[planTier]

  // Get all usage for the period
  const { data: records } = await supabase
    .from('usage_records')
    .select('metric, quantity')
    .eq('org_id', orgId)
    .eq('period', period)

  // Aggregate by metric
  const aggregated: Record<string, number> = {}
  for (const record of records ?? []) {
    const metric = record.metric as string
    aggregated[metric] = (aggregated[metric] ?? 0) + (record.quantity ?? 0)
  }

  const allMetrics: UsageMetric[] = ['ai_credits', 'api_calls', 'storage_gb', 'exam_sessions', 'students']

  const breakdown: Record<string, { used: number; limit: number; percentage: number }> = {}
  for (const metric of allMetrics) {
    const used = aggregated[metric] ?? 0
    const limit = limits[metric]
    breakdown[metric] = {
      used,
      limit,
      percentage: limit > 0 ? Math.round((used / limit) * 10000) / 100 : 0,
    }
  }

  return breakdown as Record<UsageMetric, { used: number; limit: number; percentage: number }>
}

// ──────────────────────────────────────────────────────────────
// aggregateUsage — Aggregate daily → monthly
// ──────────────────────────────────────────────────────────────

export async function aggregateUsage(
  orgId: string,
  period: string
): Promise<Record<UsageMetric, number>> {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('usage_records')
    .select('metric, quantity')
    .eq('org_id', orgId)
    .eq('period', period)

  const aggregated: Record<string, number> = {}
  for (const record of records ?? []) {
    const metric = record.metric as string
    aggregated[metric] = (aggregated[metric] ?? 0) + (record.quantity ?? 0)
  }

  return aggregated as Record<UsageMetric, number>
}

// ──────────────────────────────────────────────────────────────
// getUsageForecast — Forecast end-of-period usage
// ──────────────────────────────────────────────────────────────

export async function getUsageForecast(
  orgId: string,
  metric: UsageMetric
): Promise<{
  currentUsage: number
  projectedUsage: number
  limit: number
  willExceedLimit: boolean
  daysRemaining: number
  dailyAverage: number
}> {
  const supabase = await createClient()

  // Get subscription period
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_tier, current_period_start, current_period_end')
    .eq('org_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const planTier = (sub?.plan_tier as PlanTier) ?? 'free'
  const limit = PLAN_LIMITS[planTier][metric]

  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

  const now = new Date()

  // Get usage records for this period
  const { data: records } = await supabase
    .from('usage_records')
    .select('quantity, timestamp')
    .eq('org_id', orgId)
    .eq('metric', metric)
    .gte('timestamp', periodStart.toISOString())
    .lte('timestamp', now.toISOString())

  const currentUsage = (records ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0)

  // Calculate days
  const totalDaysInPeriod = Math.max(1, Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  ))
  const daysElapsed = Math.max(1, Math.ceil(
    (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  ))
  const daysRemaining = Math.max(0, Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  ))

  // Daily average usage
  const dailyAverage = currentUsage / daysElapsed

  // Projected usage at end of period (linear extrapolation)
  const projectedUsage = Math.round(currentUsage + (dailyAverage * daysRemaining))

  return {
    currentUsage,
    projectedUsage,
    limit,
    willExceedLimit: projectedUsage > limit,
    daysRemaining,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
  }
}
