// ============================================================================
// ExamForge AI — Revenue Dashboard Service
// ============================================================================
// Revenue analytics: MRR/ARR, churn, expansion/contraction, collection rates,
// revenue forecasting, and complete billing dashboard assembly.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  RevenueMetrics,
  RevenueByPlan,
  RevenueForecast,
  ChurnAnalysis,
  ChurnReason,
  BillingDashboard,
  MeteredUsage,
  UsageOverage,
  UsageMetric,
} from './types'
import type { PlanTier } from '@/lib/supabase/types'
import { getActiveContracts, getContractRevenueForecast } from './enterprise-contract-service'

// ──────────────────────────────────────────────────────────────
// getRevenueMetrics — MRR, ARR, churn, expansion
// ──────────────────────────────────────────────────────────────

export async function getRevenueMetrics(orgId: string): Promise<RevenueMetrics> {
  const supabase = await createClient()

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  // Get active subscriptions for this org (P1-REVENUE: limited + cursor-ready)
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('price_at_subscription, billing_cycle, plan_id, created_at')
    .eq('school_id', orgId)
    .in('status', ['active', 'trial'])
    .limit(1000)

  // Calculate MRR (normalize all cycles to monthly)
  let mrr = 0
  for (const sub of activeSubs ?? []) {
    const amount = sub.price_at_subscription ?? 0
    const cycle = sub.billing_cycle as string
    switch (cycle) {
      case 'monthly': mrr += amount; break
      case 'quarterly': mrr += amount / 3; break
      case 'annual': mrr += amount / 12; break
      case 'biennial': mrr += amount / 24; break
      case 'lifetime': mrr += amount / 36; break // Amortize over 3 years
    }
  }

  const arr = mrr * 12

  // Calculate churn (cancellations this month / active at start)
  const { count: cancellationsThisMonth } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', periodStart)
    .lt('cancelled_at', periodEnd)

  const { count: activeAtStart } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .in('status', ['active', 'trial', 'cancelled'])

  const churn = activeAtStart && activeAtStart > 0
    ? (cancellationsThisMonth ?? 0) / activeAtStart
    : 0

  // Expansion revenue (upgrades this month)
  const { data: upgrades } = await supabase
    .from('subscription_changes')
    .select('new_amount, old_amount')
    .eq('org_id', orgId)
    .eq('change_type', 'upgrade')
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)

  const expansion = (upgrades ?? []).reduce(
    (sum, u) => sum + ((u.new_amount ?? 0) - (u.old_amount ?? 0)),
    0
  )

  // Contraction revenue (downgrades this month)
  const { data: downgrades } = await supabase
    .from('subscription_changes')
    .select('new_amount, old_amount')
    .eq('org_id', orgId)
    .eq('change_type', 'downgrade')
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)

  const contraction = (downgrades ?? []).reduce(
    (sum, u) => sum + ((u.old_amount ?? 0) - (u.new_amount ?? 0)),
    0
  )

  // Net retention rate
  const netRetention = mrr > 0
    ? Math.max(0, (mrr + expansion - contraction) / mrr)
    : 1

  // Outstanding revenue
  const outstandingRevenue = await getOutstandingRevenue(orgId)

  // Total revenue (P1-REVENUE: use DB aggregation instead of loading all rows)
  // Use an RPC function if available; otherwise use count+sum via a limited query.
  // For now, add explicit limit to prevent unbounded loading.
  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('school_id', orgId)
    .eq('status', 'paid')
    .order('issued_at', { ascending: false })
    .limit(5000)

  const totalRevenue = (paidInvoices ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    churn: Math.round(churn * 10000) / 100,
    expansion: Math.round(expansion * 100) / 100,
    contraction: Math.round(contraction * 100) / 100,
    netRetention: Math.round(netRetention * 10000) / 100,
    outstandingRevenue,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeSubscriptions: activeSubs?.length ?? 0,
    periodStart,
    periodEnd,
  }
}

// ──────────────────────────────────────────────────────────────
// getRevenueByPeriod — Monthly/quarterly revenue
// ──────────────────────────────────────────────────────────────

export async function getRevenueByPeriod(
  orgId: string,
  period: 'monthly' | 'quarterly' = 'monthly'
): Promise<{ period: string; revenue: number; invoiceCount: number }[]> {
  const supabase = await createClient()

  const now = new Date()
  const numPeriods = period === 'monthly' ? 12 : 8
  const results: { period: string; revenue: number; invoiceCount: number }[] = []

  for (let i = 0; i < numPeriods; i++) {
    let start: Date
    let end: Date

    if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    } else {
      const quarter = Math.floor((now.getMonth() - i * 3) / 3)
      const year = now.getFullYear() + Math.floor((now.getMonth() - i * 3) / 12)
      start = new Date(year, quarter * 3, 1)
      end = new Date(year, quarter * 3 + 3, 0)
    }

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('school_id', orgId)
      .not('paid_at', 'is', null)
      .gte('paid_at', start.toISOString())
      .lte('paid_at', end.toISOString())

    const revenue = (invoices ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

    results.push({
      period: start.toISOString().slice(0, 7),
      revenue: Math.round(revenue * 100) / 100,
      invoiceCount: invoices?.length ?? 0,
    })
  }

  return results
}

// ──────────────────────────────────────────────────────────────
// getRevenueByPlan — Revenue per plan tier
// ──────────────────────────────────────────────────────────────

export async function getRevenueByPlan(orgId: string): Promise<RevenueByPlan[]> {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('plan_id, price_at_subscription, billing_cycle, plans(tier)')
    .eq('school_id', orgId)
    .in('status', ['active', 'trial'])

  const byPlan: Record<string, { mrr: number; count: number }> = {}

  for (const sub of subs ?? []) {
    const tier = ((sub.plans as unknown as { tier: string } | null)?.tier) ?? 'free'
    const amount = sub.price_at_subscription ?? 0
    const cycle = sub.billing_cycle as string

    let monthlyAmount = 0
    switch (cycle) {
      case 'monthly': monthlyAmount = amount; break
      case 'quarterly': monthlyAmount = amount / 3; break
      case 'annual': monthlyAmount = amount / 12; break
      case 'biennial': monthlyAmount = amount / 24; break
      default: monthlyAmount = amount; break
    }

    if (!byPlan[tier]) {
      byPlan[tier] = { mrr: 0, count: 0 }
    }
    byPlan[tier].mrr += monthlyAmount
    byPlan[tier].count += 1
  }

  const totalMrr = Object.values(byPlan).reduce((sum, v) => sum + v.mrr, 0)

  const allTiers: PlanTier[] = ['free', 'starter', 'professional', 'enterprise']

  return allTiers.map((tier) => {
    const data = byPlan[tier] ?? { mrr: 0, count: 0 }
    return {
      tier,
      mrr: Math.round(data.mrr * 100) / 100,
      arr: Math.round(data.mrr * 12 * 100) / 100,
      subscriberCount: data.count,
      percentage: totalMrr > 0 ? Math.round((data.mrr / totalMrr) * 10000) / 100 : 0,
    }
  })
}

// ──────────────────────────────────────────────────────────────
// getRevenueForecast — Revenue forecast for N months
// ──────────────────────────────────────────────────────────────

export async function getRevenueForecast(
  orgId: string,
  months: number = 12
): Promise<RevenueForecast[]> {
  const supabase = await createClient()
  const metrics = await getRevenueMetrics(orgId)

  // Get contract-based forecasts
  const contractForecasts = await getContractRevenueForecast(orgId)

  // Get historical revenue data for trend analysis
  const historicalData = await getRevenueByPeriod(orgId, 'monthly')
  const historicalMrrs = historicalData.map((d) => d.revenue).reverse()

  // Calculate growth rate from historical data
  let growthRate = 0
  if (historicalMrrs.length >= 2) {
    const recentMonths = historicalMrrs.slice(-3)
    const olderMonths = historicalMrrs.slice(-6, -3)
    if (olderMonths.length > 0) {
      const recentAvg = recentMonths.reduce((s, v) => s + v, 0) / recentMonths.length
      const olderAvg = olderMonths.reduce((s, v) => s + v, 0) / olderMonths.length
      growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
    }
  }

  const forecasts: RevenueForecast[] = []
  const now = new Date()

  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthStr = forecastDate.toISOString().slice(0, 7)

    // Check if contract forecast exists
    const contractForecast = contractForecasts.find((f) => f.month === monthStr)

    let projectedMrr: number
    let confidence: number
    let assumptions: string[]

    if (contractForecast && contractForecast.projectedMrr > 0) {
      // Blend contract and subscription-based forecasts
      const subscriptionMrr = metrics.mrr * Math.pow(1 + growthRate / 12, i)
      projectedMrr = contractForecast.projectedMrr * 0.7 + subscriptionMrr * 0.3
      confidence = contractForecast.confidence
      assumptions = ['Blended: 70% contract + 30% subscription forecast', ...contractForecast.assumptions]
    } else {
      // Pure subscription-based forecast with growth rate
      projectedMrr = metrics.mrr * Math.pow(1 + growthRate / 12, i)
      confidence = Math.max(0.3, 0.9 - i * 0.05)
      assumptions = [
        `Base MRR: ₦${metrics.mrr.toLocaleString()}`,
        `Growth rate: ${(growthRate * 100).toFixed(1)}%`,
        'Assumes consistent subscriber retention',
      ]
    }

    // Adjust for churn
    projectedMrr *= Math.pow(1 - metrics.churn / 100, i / 12)

    forecasts.push({
      month: monthStr,
      projectedMrr: Math.round(projectedMrr * 100) / 100,
      projectedArr: Math.round(projectedMrr * 12 * 100) / 100,
      confidence,
      assumptions,
    })
  }

  return forecasts
}

// ──────────────────────────────────────────────────────────────
// getChurnAnalysis
// ──────────────────────────────────────────────────────────────

export async function getChurnAnalysis(orgId: string): Promise<ChurnAnalysis> {
  const supabase = await createClient()

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  // Get cancellations this period
  const { data: cancellations } = await supabase
    .from('subscriptions')
    .select('plan_tier, cancelled_reason')
    .eq('school_id', orgId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', periodStart)
    .lt('cancelled_at', periodEnd)

  const totalCancellations = cancellations?.length ?? 0

  // Active at period start
  const { count: totalActiveAtStart } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .in('status', ['active', 'trial', 'cancelled'])

  const churnRate = totalActiveAtStart && totalActiveAtStart > 0
    ? totalCancellations / totalActiveAtStart
    : 0

  // Aggregate churn reasons
  const reasonCounts: Record<string, number> = {}
  for (const cancellation of cancellations ?? []) {
    const reason = cancellation.cancelled_reason ?? 'No reason provided'
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1
  }

  const reasons: ChurnReason[] = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalCancellations > 0 ? Math.round((count / totalCancellations) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Churn by plan
  const churnByPlan: Record<PlanTier, number> = { free: 0, starter: 0, professional: 0, enterprise: 0 }
  for (const cancellation of cancellations ?? []) {
    const tier = (cancellation.plan_tier as PlanTier) ?? 'free'
    churnByPlan[tier]++
  }

  return {
    churnRate: Math.round(churnRate * 10000) / 100,
    totalCancellations,
    totalActiveAtStart: totalActiveAtStart ?? 0,
    reasons,
    churnByPlan,
    periodStart,
    periodEnd,
  }
}

// ──────────────────────────────────────────────────────────────
// getOutstandingRevenue — Unpaid invoices total
// ──────────────────────────────────────────────────────────────

export async function getOutstandingRevenue(orgId: string): Promise<number> {
  const supabase = await createClient()

  const { data: outstanding } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('school_id', orgId)
    .in('status', ['sent', 'draft'])

  return (outstanding ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)
}

// ──────────────────────────────────────────────────────────────
// getCollectionRate — Payment collection efficiency
// ──────────────────────────────────────────────────────────────

export async function getCollectionRate(orgId: string): Promise<{
  rate: number
  totalInvoiced: number
  totalCollected: number
  totalOutstanding: number
  averageDaysToPayment: number
}> {
  const supabase = await createClient()

  // Total invoiced (P1-REVENUE: paginated with explicit limit)
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('total_amount, status, issue_date, paid_at')
    .eq('school_id', orgId)
    .neq('invoice_type', 'credit_note')
    .order('issue_date', { ascending: false })
    .limit(5000)

  const totalInvoiced = (allInvoices ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  // Total collected
  const paidInvoices = (allInvoices ?? []).filter((inv) => inv.paid_at !== null)
  const totalCollected = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const totalOutstanding = totalInvoiced - totalCollected

  // Average days to payment
  let totalDays = 0
  let paidCount = 0
  for (const inv of paidInvoices) {
    if (inv.issue_date && inv.paid_at) {
      const days = Math.ceil(
        (new Date(inv.paid_at).getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      totalDays += days
      paidCount++
    }
  }

  const averageDaysToPayment = paidCount > 0 ? Math.round(totalDays / paidCount) : 0
  const rate = totalInvoiced > 0 ? totalCollected / totalInvoiced : 1

  return {
    rate: Math.round(rate * 10000) / 100,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    averageDaysToPayment,
  }
}

// ──────────────────────────────────────────────────────────────
// getTopRevenueOrgs
// ──────────────────────────────────────────────────────────────

export async function getTopRevenueOrgs(limit: number = 10): Promise<{
  orgId: string
  orgName: string
  mrr: number
  arr: number
  planTier: string
}[]> {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('school_id, plan_id, price_at_subscription, billing_cycle, plans(tier), schools(id, name)')
    .in('status', ['active', 'trial'])
    .order('price_at_subscription', { ascending: false })
    .limit(limit * 2) // Over-fetch since we need to normalize

  // Normalize MRR per org
  const orgMrr: Record<string, { mrr: number; name: string; planTier: string }> = {}

  for (const sub of subs ?? []) {
    const orgId = sub.school_id as string
    const amount = sub.price_at_subscription ?? 0
    const cycle = sub.billing_cycle as string
    const orgName = ((sub.schools as unknown as Record<string, unknown>)?.name as string) ?? 'Unknown'
    const planTier = ((sub.plans as unknown as { tier: string } | null)?.tier) ?? 'unknown'

    let monthly = 0
    switch (cycle) {
      case 'monthly': monthly = amount; break
      case 'quarterly': monthly = amount / 3; break
      case 'annual': monthly = amount / 12; break
      case 'biennial': monthly = amount / 24; break
      default: monthly = amount; break
    }

    if (!orgMrr[orgId]) {
      orgMrr[orgId] = { mrr: 0, name: orgName, planTier }
    }
    orgMrr[orgId].mrr += monthly
    // Update to highest tier
    const tierOrder: Record<string, number> = { free: 0, starter: 1, professional: 2, enterprise: 3 }
    if ((tierOrder[planTier] ?? 0) > (tierOrder[orgMrr[orgId].planTier] ?? 0)) {
      orgMrr[orgId].planTier = planTier
    }
  }

  return Object.entries(orgMrr)
    .map(([orgId, data]) => ({
      orgId,
      orgName: data.name,
      mrr: Math.round(data.mrr * 100) / 100,
      arr: Math.round(data.mrr * 12 * 100) / 100,
      planTier: data.planTier,
    }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, limit)
}

// ──────────────────────────────────────────────────────────────
// getBillingDashboard — Complete billing dashboard data
// ──────────────────────────────────────────────────────────────

export async function getBillingDashboard(orgId: string): Promise<BillingDashboard> {
  const supabase = await createClient()

  // Revenue metrics
  const revenue = await getRevenueMetrics(orgId)

  // Invoice stats
  const { count: totalInvoices } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)

  const { count: paidCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'paid')

  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('school_id', orgId)
    .in('status', ['sent', 'draft'])

  const outstandingAmount = (outstandingInvoices ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const now = new Date().toISOString()
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('school_id', orgId)
    .eq('status', 'sent')
    .lt('due_date', now)

  const overdueAmount = (overdueInvoices ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const { count: draftCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'draft')

  // Subscription stats
  const { count: activeSubs } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'active')

  const { count: trialSubs } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'trial')

  const { count: cancelledSubs } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'cancelled')

  const { count: pastDueSubs } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('status', 'past_due')

  // Usage data
  const currentPeriodStr = new Date().toISOString().slice(0, 7)
  const { data: usageRecords } = await supabase
    .from('usage_records')
    .select('metric, quantity')
    .eq('org_id', orgId)
    .eq('period', currentPeriodStr)

  // Get plan limits
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('school_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const planTier = (subData?.plan_tier as PlanTier) ?? 'free'

  const PLAN_LIMITS: Record<PlanTier, Record<UsageMetric, number>> = {
    free: { ai_credits: 100, api_calls: 1000, storage_gb: 1, exam_sessions: 5, students: 50 },
    starter: { ai_credits: 1000, api_calls: 5000, storage_gb: 10, exam_sessions: 50, students: 500 },
    professional: { ai_credits: 10000, api_calls: 50000, storage_gb: 100, exam_sessions: 500, students: 5000 },
    enterprise: { ai_credits: 100000, api_calls: 500000, storage_gb: 1000, exam_sessions: 5000, students: 50000 },
  }

  const limits = PLAN_LIMITS[planTier]

  // Aggregate usage
  const usageAgg: Record<string, number> = {}
  for (const record of usageRecords ?? []) {
    const metric = record.metric as string
    usageAgg[metric] = (usageAgg[metric] ?? 0) + (record.quantity ?? 0)
  }

  const METERED_PRICES: Record<UsageMetric, number> = {
    ai_credits: 5, api_calls: 2, storage_gb: 500, exam_sessions: 100, students: 50,
  }

  const currentUsage: MeteredUsage[] = (['ai_credits', 'api_calls', 'storage_gb', 'exam_sessions', 'students'] as UsageMetric[]).map((metric) => {
    const quantity = usageAgg[metric] ?? 0
    const includedQuantity = limits[metric]
    const overageQuantity = Math.max(0, quantity - includedQuantity)
    const unitPrice = METERED_PRICES[metric]

    return {
      metric,
      quantity,
      unitPrice,
      total: overageQuantity * unitPrice,
      includedQuantity,
      overageQuantity,
    }
  })

  const overages: UsageOverage[] = currentUsage
    .filter((u) => u.overageQuantity > 0)
    .map((u) => ({
      metric: u.metric,
      limit: u.includedQuantity,
      used: u.quantity,
      overage: u.overageQuantity,
      overageCost: u.total,
    }))

  // Forecasts
  const forecasts = await getRevenueForecast(orgId, 6)

  return {
    revenue,
    invoices: {
      total: totalInvoices ?? 0,
      paid: paidCount ?? 0,
      outstanding: Math.round(outstandingAmount * 100) / 100,
      overdue: Math.round(overdueAmount * 100) / 100,
      draftCount: draftCount ?? 0,
    },
    subscriptions: {
      active: activeSubs ?? 0,
      trial: trialSubs ?? 0,
      cancelled: cancelledSubs ?? 0,
      pastDue: pastDueSubs ?? 0,
    },
    usage: {
      currentPeriod: currentUsage,
      overages,
    },
    forecasts,
  }
}
