// ============================================================================
// ExamForge AI — Financial Analytics Service
// ============================================================================
// Provides comprehensive financial analytics for executive dashboards,
// including revenue, expenses, MRR/ARR, collection efficiency, and forecasts.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type FinancialAnalytics,
  type RevenueTrend,
  type CollectionEfficiency,
  type ProfitAnalysis,
  type CashFlowForecast,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  type PercentageBreakdown,
  type RankedItem,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main Financial Analytics
// ──────────────────────────────────────────────────────────────

export async function getFinancialAnalytics(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<FinancialAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Fetch invoices for the period
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total_amount, status, due_date, paid_at, created_at, school_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Fetch payments
  const { data: payments } = await supabase
    .from('transactions')
    .select('id, amount, status, created_at, school_id, invoice_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Fetch subscriptions for MRR calculation
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, price_at_subscription, status, billing_cycle, school_id')
    .eq('status', 'active')

  const invoiceRows = invoices ?? []
  const paymentRows = payments ?? []
  const subscriptionRows = subscriptions ?? []

  // Calculate core metrics
  const revenue = paymentRows
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const totalInvoiced = invoiceRows
    .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const outstandingRevenue = invoiceRows
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const expenses = revenue * 0.35 // Estimate expenses as 35% of revenue
  const profit = revenue - expenses

  // MRR from active subscriptions
  const mrr = subscriptionRows.reduce((sum, sub) => {
    const amount = sub.price_at_subscription ?? 0
    if (sub.billing_cycle === 'yearly') return sum + amount / 12
    if (sub.billing_cycle === 'quarterly') return sum + amount / 3
    return sum + amount
  }, 0)

  const arr = mrr * 12
  const collectionRate = totalInvoiced > 0 ? (revenue / totalInvoiced) * 100 : 100

  // Revenue by month
  const revenueByMonth = aggregateRevenueByMonth(paymentRows)

  // Revenue by source
  const revenueBySource = aggregateRevenueBySource(paymentRows as unknown as Array<{ amount: number | null; payment_method: string | null }>, revenue)

  // Top paying organizations
  const topPayingOrgs = await getTopPayingOrganizations(10)

  return {
    revenue,
    expenses,
    profit,
    mrr,
    arr,
    collectionRate,
    outstandingRevenue,
    revenueByMonth,
    revenueBySource,
    topPayingOrgs,
  }
}

// ──────────────────────────────────────────────────────────────
// Revenue Trend
// ──────────────────────────────────────────────────────────────

export async function getRevenueTrend(
  orgId: string,
  months: number = 12
): Promise<RevenueTrend> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())

  const paymentRows = payments ?? []
  const monthlyData = aggregateRevenueByMonth(paymentRows)

  // Calculate growth rate
  const growthRate = calculateGrowthRate(monthlyData)

  // Project next month using simple linear extrapolation
  const projectedNextMonth = monthlyData.length >= 2
    ? monthlyData[monthlyData.length - 1].value +
      (monthlyData[monthlyData.length - 1].value - monthlyData[monthlyData.length - 2].value)
    : monthlyData.length > 0
      ? monthlyData[monthlyData.length - 1].value
      : 0

  return {
    months: monthlyData,
    growthRate,
    projectedNextMonth,
  }
}

// ──────────────────────────────────────────────────────────────
// Revenue by Source
// ──────────────────────────────────────────────────────────────

export async function getRevenueBySource(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<PercentageBreakdown[]> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, payment_method, created_at')
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const paymentRows = payments ?? []
  const total = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return aggregateRevenueBySource(paymentRows as unknown as Array<{ amount: number | null; payment_method: string | null }>, total)
}

// ──────────────────────────────────────────────────────────────
// Collection Efficiency
// ──────────────────────────────────────────────────────────────

export async function getCollectionEfficiency(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<CollectionEfficiency> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total_amount, status, due_date, paid_at, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const invoiceRows = invoices ?? []
  const paymentRows = payments ?? []

  const totalInvoiced = invoiceRows.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)
  const totalCollected = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 100

  // Calculate average days to payment
  const paidInvoices = invoiceRows.filter(inv => inv.paid_at && inv.due_date)
  const averageDaysToPayment = paidInvoices.length > 0
    ? paidInvoices.reduce((sum, inv) => {
        const paidDate = new Date(inv.paid_at!)
        const dueDate = new Date(inv.due_date!)
        return sum + Math.max(0, (paidDate.getTime() - dueDate.getTime()) / 86400000)
      }, 0) / paidInvoices.length
    : 0

  const overdueInvoices = invoiceRows.filter(inv => inv.status === 'overdue')
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)

  const byMonth = aggregateRevenueByMonth(paymentRows)

  return {
    totalInvoiced,
    totalCollected,
    collectionRate,
    averageDaysToPayment,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    byMonth,
  }
}

// ──────────────────────────────────────────────────────────────
// Top Paying Organizations
// ──────────────────────────────────────────────────────────────

export async function getTopPayingOrganizations(
  limit: number = 10
): Promise<RankedItem[]> {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, school_id, schools(id, name)')
    .eq('status', 'completed')

  const paymentRows = (payments ?? []) as unknown as Array<{
    amount: number | null
    status: string
    school_id: string | null
    schools: { id: string; name: string } | null
  }>

  // Aggregate by organization
  const orgTotals: Record<string, { name: string; total: number }> = {}
  for (const p of paymentRows) {
    if (!p.school_id || !p.schools) continue
    const id = p.school_id
    if (!orgTotals[id]) {
      orgTotals[id] = { name: p.schools.name, total: 0 }
    }
    orgTotals[id].total += p.amount ?? 0
  }

  return Object.entries(orgTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([id, data], index) => ({
      id,
      name: data.name,
      rank: index + 1,
      score: data.total,
    }))
}

// ──────────────────────────────────────────────────────────────
// Profit Analysis
// ──────────────────────────────────────────────────────────────

export async function getProfitAnalysis(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<ProfitAnalysis> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const paymentRows = payments ?? []
  const totalRevenue = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  // Expense categories estimation from subscriptions and platform costs
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('price_at_subscription, status')
    .eq('status', 'active')

  const subRows = subscriptions ?? []
  const subscriptionRevenue = subRows.reduce((sum, s) => sum + (s.price_at_subscription ?? 0), 0)

  const infrastructureCost = totalRevenue * 0.15
  const supportCost = totalRevenue * 0.10
  const aiCost = totalRevenue * 0.05
  const adminCost = totalRevenue * 0.05

  const totalExpenses = infrastructureCost + supportCost + aiCost + adminCost
  const grossProfit = totalRevenue - infrastructureCost
  const netProfit = totalRevenue - totalExpenses
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const expensesByCategory: PercentageBreakdown[] = [
    { label: 'Infrastructure', value: infrastructureCost, percentage: totalExpenses > 0 ? (infrastructureCost / totalExpenses) * 100 : 0 },
    { label: 'Support', value: supportCost, percentage: totalExpenses > 0 ? (supportCost / totalExpenses) * 100 : 0 },
    { label: 'AI Services', value: aiCost, percentage: totalExpenses > 0 ? (aiCost / totalExpenses) * 100 : 0 },
    { label: 'Administration', value: adminCost, percentage: totalExpenses > 0 ? (adminCost / totalExpenses) * 100 : 0 },
  ]

  const trend = aggregateRevenueByMonth(paymentRows)

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
    expensesByCategory,
    trend,
  }
}

// ──────────────────────────────────────────────────────────────
// Cash Flow Forecast
// ──────────────────────────────────────────────────────────────

export async function getCashFlowForecast(
  orgId: string,
  months: number = 6
): Promise<CashFlowForecast> {
  const supabase = await createClient()

  // Get historical payments for the last 6 months to project forward
  const historicalMonths = 6
  const histStart = new Date()
  histStart.setMonth(histStart.getMonth() - historicalMonths)

  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', histStart.toISOString())

  const { data: invoices } = await supabase
    .from('invoices')
    .select('amount, status, created_at')
    .gte('created_at', histStart.toISOString())

  const paymentRows = payments ?? []
  const invoiceRows = invoices ?? []

  // Calculate monthly cash inflows and outflows
  const monthlyInflows = aggregateRevenueByMonth(paymentRows)
  const avgMonthlyInflow = monthlyInflows.length > 0
    ? monthlyInflows.reduce((sum, m) => sum + m.value, 0) / monthlyInflows.length
    : 0

  const avgMonthlyOutflow = avgMonthlyInflow * 0.35

  // Current balance from all completed payments minus estimated expenses
  const totalCollected = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const totalExpensesEstimated = totalCollected * 0.35
  const currentBalance = totalCollected - totalExpensesEstimated

  // Generate forecast
  const forecastMonths: TimeSeriesPoint[] = []
  let runningBalance = currentBalance
  const now = new Date()

  for (let i = 1; i <= months; i++) {
    const projectedDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    runningBalance += avgMonthlyInflow - avgMonthlyOutflow
    forecastMonths.push({
      date: projectedDate.toISOString().slice(0, 10),
      value: runningBalance,
    })
  }

  const burnRate = avgMonthlyOutflow - avgMonthlyInflow
  const runwayMonths = burnRate > 0 ? Math.floor(currentBalance / burnRate) : Infinity
  const projectedBalanceEnd = forecastMonths.length > 0
    ? forecastMonths[forecastMonths.length - 1].value
    : currentBalance

  return {
    months: forecastMonths,
    currentBalance,
    projectedBalanceEnd,
    burnRate: Math.abs(burnRate),
    runwayMonths: runwayMonths === Infinity ? 999 : runwayMonths,
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function aggregateRevenueByMonth(
  payments: Array<{ amount: number | null; created_at: string | null }>
): TimeSeriesPoint[] {
  const monthly: Record<string, number> = {}

  for (const p of payments) {
    if (!p.created_at) continue
    const monthKey = p.created_at.slice(0, 7) // YYYY-MM
    monthly[monthKey] = (monthly[monthKey] ?? 0) + (p.amount ?? 0)
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function aggregateRevenueBySource(
  payments: Array<{ amount: number | null; payment_method: string | null }>,
  total: number
): PercentageBreakdown[] {
  const bySource: Record<string, number> = {}

  for (const p of payments) {
    const source = p.payment_method ?? 'other'
    bySource[source] = (bySource[source] ?? 0) + (p.amount ?? 0)
  }

  return Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
}

function calculateGrowthRate(data: TimeSeriesPoint[]): number {
  if (data.length < 2) return 0
  const first = data[0].value
  const last = data[data.length - 1].value
  if (first === 0) return last > 0 ? 100 : 0
  return ((last - first) / first) * 100
}
