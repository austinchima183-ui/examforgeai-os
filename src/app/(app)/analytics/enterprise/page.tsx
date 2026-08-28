'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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

// ── Metric Data per Dashboard ────────────────────────────────────
interface MetricData {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'flat'
  icon: typeof DollarSign
}

const METRIC_SETS: Record<string, MetricData[]> = {
  financial: [
    { label: 'Total Revenue', value: '$585,000', change: '+12.3%', trend: 'up', icon: DollarSign },
    { label: 'MRR', value: '$48,750', change: '+4.8%', trend: 'up', icon: TrendingUp },
    { label: 'Collection Rate', value: '94.2%', change: '+1.1%', trend: 'up', icon: BarChart3 },
    { label: 'Outstanding', value: '$12,400', change: '-8.5%', trend: 'down', icon: AlertTriangle },
  ],
  academic: [
    { label: 'Average GPA', value: '3.42', change: '+0.08', trend: 'up', icon: GraduationCap },
    { label: 'Pass Rate', value: '78.5%', change: '+2.3%', trend: 'up', icon: TrendingUp },
    { label: 'Exam Completion', value: '92.1%', change: '+1.5%', trend: 'up', icon: BarChart3 },
    { label: 'Avg Score', value: '68.4', change: '+3.2', trend: 'up', icon: LineChart },
  ],
  government: [
    { label: 'Total Schools', value: '1,247', change: '+23', trend: 'up', icon: Shield },
    { label: 'Total Students', value: '850K', change: '+5.2%', trend: 'up', icon: Users },
    { label: 'Compliance Rate', value: '89.3%', change: '+1.8%', trend: 'up', icon: AlertTriangle },
    { label: 'Avg Performance', value: '72.1', change: '+2.4', trend: 'up', icon: BarChart3 },
  ],
  risk: [
    { label: 'At-Risk Students', value: '342', change: '-12', trend: 'down', icon: AlertTriangle },
    { label: 'Dropout Risk', value: '4.2%', change: '-0.5%', trend: 'down', icon: TrendingDown },
    { label: 'Financial Risk', value: 'Low', change: 'Stable', trend: 'flat', icon: DollarSign },
    { label: 'Compliance Issues', value: '3', change: '-2', trend: 'down', icon: Shield },
  ],
  enrollment: [
    { label: 'Current Enrollment', value: '42,500', change: '+1,200', trend: 'up', icon: Users },
    { label: 'Retention Rate', value: '91.3%', change: '+0.8%', trend: 'up', icon: TrendingUp },
    { label: 'New Enrollments', value: '1,200', change: '+15%', trend: 'up', icon: GraduationCap },
    { label: 'Withdrawals', value: '89', change: '-23%', trend: 'down', icon: TrendingDown },
  ],
  ai: [
    { label: 'AI Generations', value: '124K', change: '+28%', trend: 'up', icon: Brain },
    { label: 'Tokens Used', value: '45.2M', change: '+15%', trend: 'up', icon: Sparkles },
    { label: 'AI Cost', value: '$2,340', change: '+12%', trend: 'up', icon: DollarSign },
    { label: 'Error Rate', value: '0.8%', change: '-0.3%', trend: 'down', icon: AlertTriangle },
  ],
}

// ── Chart Data ───────────────────────────────────────────────────
interface ChartPoint {
  label: string
  value: number
  secondary?: number
}

const CHART_DATA: Record<string, ChartPoint[]> = {
  financial: [
    { label: 'Jan', value: 38000, secondary: 35000 },
    { label: 'Feb', value: 40200, secondary: 37200 },
    { label: 'Mar', value: 42100, secondary: 39500 },
    { label: 'Apr', value: 44300, secondary: 41000 },
    { label: 'May', value: 46500, secondary: 43000 },
    { label: 'Jun', value: 48750, secondary: 45000 },
  ],
  academic: [
    { label: 'Jan', value: 65, secondary: 62 },
    { label: 'Feb', value: 67, secondary: 64 },
    { label: 'Mar', value: 68, secondary: 66 },
    { label: 'Apr', value: 70, secondary: 68 },
    { label: 'May', value: 72, secondary: 69 },
    { label: 'Jun', value: 74, secondary: 71 },
  ],
  government: [
    { label: 'Q1', value: 72, secondary: 68 },
    { label: 'Q2', value: 75, secondary: 71 },
    { label: 'Q3', value: 78, secondary: 74 },
    { label: 'Q4', value: 80, secondary: 76 },
  ],
  risk: [
    { label: 'Jan', value: 420, secondary: 450 },
    { label: 'Feb', value: 395, secondary: 430 },
    { label: 'Mar', value: 380, secondary: 410 },
    { label: 'Apr', value: 365, secondary: 390 },
    { label: 'May', value: 350, secondary: 370 },
    { label: 'Jun', value: 342, secondary: 360 },
  ],
  enrollment: [
    { label: 'Jan', value: 40000, secondary: 38500 },
    { label: 'Feb', value: 40500, secondary: 39200 },
    { label: 'Mar', value: 41200, secondary: 40000 },
    { label: 'Apr', value: 41800, secondary: 40500 },
    { label: 'May', value: 42200, secondary: 41200 },
    { label: 'Jun', value: 42500, secondary: 41800 },
  ],
  ai: [
    { label: 'Jan', value: 85000, secondary: 72000 },
    { label: 'Feb', value: 95000, secondary: 80000 },
    { label: 'Mar', value: 100000, secondary: 88000 },
    { label: 'Apr', value: 108000, secondary: 95000 },
    { label: 'May', value: 116000, secondary: 102000 },
    { label: 'Jun', value: 124000, secondary: 110000 },
  ],
}

// Chart type per dashboard
const CHART_TYPE: Record<string, 'area' | 'bar'> = {
  financial: 'area', academic: 'area', government: 'bar',
  risk: 'area', enrollment: 'area', ai: 'bar',
}

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

interface EnterpriseAnalyticsData {
  metrics: Record<string, MetricData[]>
  chartData: Record<string, ChartPoint[]>
  reports: ScheduledReport[]
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

  const { data: analyticsData, loading: dataLoading, error: dataError, refetch } = useApi<EnterpriseAnalyticsData>('/api/analytics/enterprise')
  const reports = analyticsData?.reports ?? []

  const loading = dataLoading

  const metrics = useMemo(() => METRIC_SETS[dashboardType] ?? METRIC_SETS.financial, [dashboardType])
  const chartData = useMemo(() => CHART_DATA[dashboardType] ?? CHART_DATA.financial, [dashboardType])
  const chartType = useMemo(() => CHART_TYPE[dashboardType] ?? 'area', [dashboardType])
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
      const res = await fetch('/api/analytics/nlq', {
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
          <Button variant="outline" size="icon" disabled={loading}>
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
              className="border-0 shadow-none text-base placeholder:text-foreground/40 focus-visible:ring-0 forge-input-glow"
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

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon
          return (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />{m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold">{m.value}</p>}
                {loading ? <Skeleton className="h-4 w-16" /> : (
                  <p className={`text-xs flex items-center gap-1 ${m.trend === 'up' ? 'text-green-600 dark:text-green-400' : m.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {m.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {m.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    {m.change}
                  </p>
                )}
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

      {/* Scheduled Reports */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Scheduled Reports</CardTitle>
            <CardDescription>{reports.filter(r => r.enabled).length} of {reports.length} reports active</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />Create Report
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
