'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BarChart3, LineChart, Search, Calendar, FileText,
  TrendingUp, TrendingDown, Brain, GraduationCap, DollarSign,
  AlertTriangle, Users, ChevronRight, Clock, RefreshCw, Send,
  Shield, Sparkles
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { DashboardType, AnalyticsTimePeriod } from '@/lib/enterprise-analytics/types'

// ── Dashboard Types Config ───────────────────────────────────────
const DASHBOARD_TYPES: { value: DashboardType; label: string; icon: typeof DollarSign; color: string }[] = [
  { value: 'financial', label: 'Financial', icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
  { value: 'academic', label: 'Academic', icon: GraduationCap, color: 'text-violet-600' },
  { value: 'government', label: 'Government', icon: Shield, color: 'text-sky-600' },
  { value: 'risk', label: 'Risk', icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'enrollment', label: 'Enrollment', icon: Users, color: 'text-cyan-600' },
  { value: 'ai', label: 'AI Usage', icon: Brain, color: 'text-pink-600' },
]

const TIME_PERIODS: { value: AnalyticsTimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
]

// ── Metric Data (mapped from LIVE /api/analytics/enterprise data) ──
interface MetricData {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'flat'
  icon: typeof DollarSign
}

interface ChartPoint {
  label: string
  value: number
  secondary?: number
}

// Response envelope from /api/analytics/enterprise
interface EnterpriseAnalyticsResponse {
  type: DashboardType
  data: Record<string, unknown>
}

const CHART_TYPE: Partial<Record<DashboardType, 'area' | 'bar'>> = {
  financial: 'area',
  academic: 'bar',
  government: 'bar',
  risk: 'area',
  enrollment: 'bar',
  ai: 'area',
}

// Map UI time period → API period param (day|week|month|quarter|year)
const API_PERIOD: Partial<Record<AnalyticsTimePeriod, string>> = {
  today: 'day',
  yesterday: 'day',
  last_7_days: 'week',
  last_30_days: 'month',
  last_90_days: 'quarter',
  this_month: 'month',
  last_month: 'month',
  this_quarter: 'quarter',
  this_year: 'year',
  custom: 'month',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmtCompact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

// ── Map LIVE analytics payloads → metric cards ──
function mapMetrics(type: DashboardType, d: Record<string, unknown>): MetricData[] {
  switch (type) {
    case 'financial':
      return [
        { label: 'Total Revenue', value: fmtCurrency(Number(d.revenue) || 0), change: 'live', trend: 'flat', icon: DollarSign },
        { label: 'MRR', value: fmtCurrency(Number(d.mrr) || 0), change: 'live', trend: 'flat', icon: TrendingUp },
        { label: 'Collection Rate', value: fmtPct(Number(d.collectionRate) || 0), change: 'live', trend: 'flat', icon: BarChart3 },
        { label: 'Outstanding', value: fmtCurrency(Number(d.outstandingRevenue) || 0), change: 'live', trend: 'flat', icon: AlertTriangle },
      ]
    case 'academic':
      return [
        { label: 'Average GPA', value: (Number(d.avgGPA) || 0).toFixed(2), change: 'live', trend: 'flat', icon: GraduationCap },
        { label: 'Pass Rate', value: fmtPct(Number(d.passRate) || 0), change: 'live', trend: 'flat', icon: TrendingUp },
        { label: 'Exam Completion', value: fmtPct(Number(d.examCompletionRate) || 0), change: 'live', trend: 'flat', icon: BarChart3 },
        { label: 'Avg Score', value: (Number(d.avgScore) || 0).toFixed(1), change: 'live', trend: 'flat', icon: LineChart },
      ]
    case 'government':
      return [
        { label: 'Total Schools', value: String(Number(d.totalSchools) || 0), change: 'live', trend: 'flat', icon: Shield },
        { label: 'Total Students', value: fmtCompact(Number(d.totalStudents) || 0), change: 'live', trend: 'flat', icon: Users },
        { label: 'Compliance Rate', value: fmtPct(Number(d.complianceRate) || 0), change: 'live', trend: 'flat', icon: AlertTriangle },
        { label: 'Avg Performance', value: (Number(d.avgPerformance) || 0).toFixed(1), change: 'live', trend: 'flat', icon: BarChart3 },
      ]
    case 'risk': {
      const atRisk = Array.isArray(d.atRiskStudents) ? d.atRiskStudents.length : 0
      const compliance = Array.isArray(d.complianceRisks) ? d.complianceRisks.length : 0
      const score = Number(d.overallRiskScore) || 0
      return [
        { label: 'At-Risk Students', value: String(atRisk), change: 'live', trend: 'flat', icon: AlertTriangle },
        { label: 'Overall Risk Score', value: score.toFixed(1), change: 'live', trend: 'flat', icon: Shield },
        { label: 'Dropout Predictions', value: String(Array.isArray(d.dropoutPredictions) ? d.dropoutPredictions.length : 0), change: 'live', trend: 'flat', icon: TrendingDown },
        { label: 'Compliance Issues', value: String(compliance), change: 'live', trend: 'flat', icon: Shield },
      ]
    }
    case 'enrollment':
      return [
        { label: 'Current Enrollment', value: fmtCompact(Number(d.currentEnrollment) || 0), change: 'live', trend: 'flat', icon: Users },
        { label: 'Retention Rate', value: fmtPct(Number(d.retentionRate) || 0), change: 'live', trend: 'flat', icon: TrendingUp },
        { label: 'New Enrollments', value: String(Number(d.newEnrollments) || 0), change: 'live', trend: 'flat', icon: GraduationCap },
        { label: 'Withdrawals', value: String(Number(d.withdrawals) || 0), change: 'live', trend: 'flat', icon: TrendingDown },
      ]
    case 'ai':
      return [
        { label: 'AI Generations', value: fmtCompact(Number(d.totalGenerations) || 0), change: 'live', trend: 'flat', icon: Brain },
        { label: 'Tokens Used', value: fmtCompact(Number(d.totalTokens) || 0), change: 'live', trend: 'flat', icon: Sparkles },
        { label: 'AI Cost', value: fmtCurrency(Number(d.totalCost) || 0), change: 'live', trend: 'flat', icon: DollarSign },
        { label: 'Error Rate', value: fmtPct(Number(d.errorRate) || 0), change: 'live', trend: 'flat', icon: AlertTriangle },
      ]
    default:
      return []
  }
}

// ── Map LIVE analytics payloads → chart series ──
function mapChart(type: DashboardType, d: Record<string, unknown>): ChartPoint[] {
  const series = (key: string): ChartPoint[] => {
    const arr = Array.isArray(d[key]) ? (d[key] as Array<Record<string, unknown>>) : []
    return arr.map((p) => ({
      label: String(p.label ?? p.month ?? p.name ?? p.date ?? ''),
      value: Number(p.value ?? p.count ?? p.revenue ?? 0),
    }))
  }
  switch (type) {
    case 'financial':
      return series('revenueByMonth')
    case 'academic':
      return (Array.isArray(d.subjectsPerformance) ? (d.subjectsPerformance as Array<Record<string, unknown>>) : []).map((s) => ({
        label: String(s.subjectName ?? ''),
        value: Number(s.avgScore ?? 0),
      }))
    case 'government':
      return (Array.isArray(d.districtsPerformance) ? (d.districtsPerformance as Array<Record<string, unknown>>) : []).map((r) => ({
        label: String(r.districtName ?? r.district ?? ''),
        value: Number(r.avgPerformance ?? r.performance ?? 0),
      }))
    case 'risk':
      return series('riskTrends')
    case 'enrollment':
      return (Array.isArray(d.projectionsByGrade) ? (d.projectionsByGrade as Array<Record<string, unknown>>) : []).map((p) => ({
        label: String(p.label ?? ''),
        value: Number(p.current ?? 0),
        secondary: Number(p.projected ?? 0),
      }))
    case 'ai':
      return (Array.isArray(d.topUseCases) ? (d.topUseCases as Array<Record<string, unknown>>) : []).map((u) => ({
        label: String(u.label ?? u.name ?? ''),
        value: Number(u.value ?? 0),
      }))
    default:
      return []
  }
}
// (METRIC_SETS and CHART_DATA removed — all metrics and chart series now
// come from the LIVE /api/analytics/enterprise endpoint. Mission Ω-8: no
// placeholder data.)

// ── NLQ Suggestions ──────────────────────────────────────────────
const NLQ_SUGGESTIONS = [
  'What is the revenue growth this quarter?',
  'Show at-risk students by district',
  'Compare enrollment trends across regions',
  'What is the AI cost per student?',
]

// ── Reports API type ─────────────────────────────────────────
interface ScheduledReport {
  id: string
  name: string
  type: string
  schedule: string
  nextRun: string
  enabled: boolean
}

// Live response from /api/analytics/enterprise?type=X&period=Y
interface EnterpriseAnalyticsResponse {
  type: DashboardType
  data: Record<string, unknown>
  // Some deployments may include scheduled reports in the payload
  reports?: ScheduledReport[]
}

// ── Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.dataKey === 'secondary' ? 'Previous Period' : 'Current'}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function EnterpriseAnalyticsPage() {
  const [dashboardType, setDashboardType] = useState<DashboardType>('financial')
  const [timePeriod, setTimePeriod] = useState<AnalyticsTimePeriod>('last_30_days')
  const [nlq, setNlq] = useState('')
  const [nlqLoading, setNlqLoading] = useState(false)
  const [nlqResult, setNlqResult] = useState<string | null>(null)
  const [drilldownPath, setDrilldownPath] = useState<string[]>(['Enterprise', 'Financial'])

  // ── LIVE analytics data — refetches when dashboard type or period changes ──
  const analyticsUrl = `/api/analytics/enterprise?type=${dashboardType}&period=${API_PERIOD[timePeriod] ?? 'month'}`
  const { data: analyticsData, loading: dataLoading, error: dataError, refetch } =
    useApi<EnterpriseAnalyticsResponse>(analyticsUrl)
  const reports = analyticsData?.reports ?? []

  const loading = dataLoading
  const hasError = !!dataError

  const metrics = useMemo(
    () => (analyticsData ? mapMetrics(dashboardType, analyticsData.data ?? {}) : []),
    [analyticsData, dashboardType]
  )
  const chartData = useMemo(
    () => (analyticsData ? mapChart(dashboardType, analyticsData.data ?? {}) : []),
    [analyticsData, dashboardType]
  )
  const chartType = CHART_TYPE[dashboardType] ?? 'area'
  const currentLabel = DASHBOARD_TYPES.find(d => d.value === dashboardType)?.label ?? 'Dashboard'

  // Loading state from API
  useEffect(() => {
    setDrilldownPath(['Enterprise', currentLabel])
  }, [currentLabel])

  const handleNlqSubmit = useCallback(async () => {
    if (!nlq.trim()) return
    setNlqLoading(true)
    setNlqResult(null)
    try {
      const res = await apiFetch('/api/analytics/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlq, dashboardType, timePeriod }),
      })
      if (res.ok) {
        const data = await res.json()
        setNlqResult(data.result ?? data.summary ?? 'Query processed successfully.')
      } else {
        setNlqResult('Unable to process query. Please try rephrasing.')
      }
    } catch {
      setNlqResult('Network error. Please try again.')
    } finally {
      setNlqLoading(false)
    }
  }, [nlq, dashboardType, timePeriod])

  const handleDrilldown = (level: string) => {
    const idx = drilldownPath.indexOf(level)
    if (idx >= 0 && idx < drilldownPath.length - 1) {
      setDrilldownPath(drilldownPath.slice(0, idx + 1))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/analytics/enterprise">Enterprise Analytics</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Analytics</h1>
          <p className="text-muted-foreground">Executive dashboards with real-time insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={v => setTimePeriod(v as AnalyticsTimePeriod)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" disabled={loading} onClick={() => refetch()} aria-label="Refresh analytics data">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* NLQ Input Bar */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              className="border-0 shadow-none text-base placeholder:text-foreground/60 focus-visible:ring-0 forge-input-glow"
              placeholder="Ask a question about your data..."
              value={nlq}
              onChange={e => setNlq(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNlqSubmit() }}
            />
            <Button size="sm" onClick={handleNlqSubmit} disabled={!nlq.trim() || nlqLoading}>
              {nlqLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {nlqResult && (
            <div className="mt-3 p-3 rounded-md bg-muted/50 border text-sm">
              <Brain className="h-4 w-4 inline mr-2 text-primary" />
              {nlqResult}
            </div>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            {NLQ_SUGGESTIONS.map(s => (
              <Button key={s} variant="outline" size="sm" className="text-xs h-7" onClick={() => setNlq(s)}>{s}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {DASHBOARD_TYPES.map(dt => {
          const Icon = dt.icon
          return (
            <Button
              key={dt.value}
              variant={dashboardType === dt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDashboardType(dt.value)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />{dt.label}
            </Button>
          )
        })}
      </div>

      {/* Drilldown Breadcrumb Trail */}
      <div className="flex gap-1 text-sm flex-wrap items-center">
        {drilldownPath.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              className={`hover:underline transition-colors ${i === drilldownPath.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              onClick={() => handleDrilldown(p)}
            >
              {p}
            </button>
          </span>
        ))}
      </div>

      {/* Error state */}
      {hasError && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive flex items-center justify-between">
            <span>Could not load analytics data. Check your plan access and try again.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Metric Cards (LIVE data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && metrics.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))
          : metrics.map(m => {
          const Icon = m.icon
          return (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />{m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  live data
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart Area */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {chartType === 'bar' ? <BarChart3 className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
            {currentLabel} Trend
          </CardTitle>
          <CardDescription>Current vs previous period comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground/70">No data for this period yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Charts populate automatically as your school generates exams, payments, and activity.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="secondary" fill="#0ea5e9" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#areaGrad)" />
                  <Area type="monotone" dataKey="secondary" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="5 5" fill="url(#areaGrad2)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Reports (honest empty state — no fake report rows) */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Scheduled Reports</CardTitle>
            <CardDescription>{reports.filter(r => r.enabled).length} of {reports.length} reports active</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No scheduled reports configured yet. Reports will appear here once your
              school starts generating recurring analytics.
            </p>
          ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.schedule} · Next: {r.nextRun}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                    <Badge variant={r.enabled ? 'default' : 'secondary'}>
                      {r.enabled ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
