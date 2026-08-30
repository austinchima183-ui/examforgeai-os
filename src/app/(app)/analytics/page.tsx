'use client'

import { useState, useEffect } from 'react'
import { createClient, createClientOrNull } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AreaChart } from '@/components/charts/area-chart'
import { BarChart } from '@/components/charts/bar-chart'
import { BarChart3, Users, TrendingUp, Award, Download, Loader2, AlertCircle, Sparkles, AlertTriangle, Activity } from 'lucide-react'
import type { AnalyticsOverview } from '@/lib/services/analytics-service'

// ============================================================================
// ExamForge AI — Analytics Page
// ============================================================================
// Client component with live Supabase data. No mock data.
// Features: Student Growth, Revenue, Exam Activity, Active Users,
// Usage metrics, School Rankings. Loading, empty, and error states.
// Premium AI OS visual treatment applied.
// ============================================================================

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  function generateCSV(data: AnalyticsOverview): string {
    const rows = [['Metric', 'Value']]
    rows.push(['Total Exams', String(data.stats.totalExams)])
    rows.push(['Active Students', String(data.stats.activeStudents)])
    rows.push(['Avg Pass Rate', `${data.stats.avgPassRate}%`])
    rows.push(['Avg Score', `${data.stats.avgScore}%`])
    return rows.map(r => r.join(',')).join('\n')
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function fetchAnalytics() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClientOrNull()
        if (!supabase) {
          const res = await fetch(`/api/analytics?range=${dateRange}`, { signal })
          if (!res.ok) throw new Error('Failed to fetch analytics data')
          const result = await res.json()
          if (!signal.aborted) setData(result)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user || signal.aborted) return

        const { data: profile } = await supabase
          .from('users')
          .select('school_id, role')
          .eq('id', user.id)
          .maybeSingle()

        const profileData = profile as { school_id: string | null; role: string } | null
        const role = (profileData?.role ?? 'student') as 'student' | 'teacher' | 'school_admin' | 'super_admin'
        const schoolId = profileData?.school_id

        const res = await fetch(`/api/analytics?range=${dateRange}`, { signal })
        if (!res.ok) {
          throw new Error('Failed to fetch analytics data')
        }
        const result = await res.json()
        if (!signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => controller.abort()
  }, [dateRange])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="forge-glass-surface border border-destructive/30 rounded-xl forge-card-shadow">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-destructive/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 backdrop-blur-sm border-white/[0.04]">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-medium">Failed to load analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4 forge-input-glow"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                  <BarChart3 className="h-7 w-7 text-foreground/60" />
                </div>
              </div>
              <p className="text-base font-medium text-foreground">No analytics data available</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">Analytics will appear once there is exam activity on the platform.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-white/[0.04]">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
              <span className="text-[11px] font-medium text-emerald-500">Live</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Detailed insights into exam performance, student progress, and platform activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="h-9 w-[140px] forge-input-glow bg-secondary/50 border-white/[0.04]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2 forge-input-glow border-white/[0.04]" onClick={() => { const csv = generateCSV(data); downloadFile(csv, 'analytics-report.csv') }}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Premium Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 backdrop-blur-sm border border-white/[0.04] group-hover:bg-primary/15 transition-colors">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.totalExams}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Exams on platform</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-neural/8 via-neural/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neural/15 backdrop-blur-sm border border-white/[0.04] group-hover:bg-neural/15 transition-colors">
              <Users className="h-4 w-4 text-neural" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.activeStudents}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Currently enrolled</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-emerald-500/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pass Rate</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 backdrop-blur-sm border border-white/[0.04] group-hover:bg-emerald-500/15 transition-colors">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.avgPassRate}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">Across all exams</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-ember/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/15 backdrop-blur-sm border border-white/[0.04] group-hover:bg-ember/15 transition-colors">
              <Award className="h-4 w-4 text-ember" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.avgScore}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">Average percentage</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center gap-6">
          <TabsList className="bg-secondary/50 border border-white/[0.04]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Overview</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Performance</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Activity</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Exam Activity Trend</CardTitle>
                <CardDescription>Monthly submissions and average scores</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.examTrend.length > 0 ? (
                  <AreaChart
                    data={data.examTrend}
                    xKey="label"
                    yKeys={['value', 'value2']}
                    colors={['hsl(var(--chart-1))', 'hsl(var(--chart-2))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-primary/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <Activity className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No exam activity data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Subject Performance</CardTitle>
                <CardDescription>Average scores by subject</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.subjectPerformance.length > 0 ? (
                  <BarChart
                    data={data.subjectPerformance}
                    xKey="subject"
                    yKeys={['score']}
                    colors={['hsl(var(--chart-1))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <BarChart3 className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No subject performance data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-ember/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Score Distribution</CardTitle>
                <CardDescription>Average scores by subject</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.subjectPerformance.length > 0 ? (
                  <BarChart
                    data={data.subjectPerformance}
                    xKey="subject"
                    yKeys={['score', 'passRate']}
                    colors={['hsl(var(--chart-1))', 'hsl(var(--chart-3))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-ember/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <Award className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No performance data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-neural/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Pass Rate by Subject</CardTitle>
                <CardDescription>Percentage of students passing each subject</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.subjectPerformance.length > 0 ? (
                  <AreaChart
                    data={data.subjectPerformance}
                    xKey="subject"
                    yKeys={['passRate']}
                    colors={['hsl(var(--chart-3))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-neural/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <TrendingUp className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No pass rate data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Weekly Activity</CardTitle>
                <CardDescription>Exam submissions by week</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.weeklyActivity.length > 0 ? (
                  <BarChart
                    data={data.weeklyActivity}
                    xKey="week"
                    yKeys={['exams', 'participants']}
                    colors={['hsl(var(--chart-1))', 'hsl(var(--chart-2))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-primary/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <Activity className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No weekly activity data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/4 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="text-lg font-semibold tracking-tight">Participation Trend</CardTitle>
                <CardDescription>Student engagement over time</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {data.weeklyActivity.length > 0 ? (
                  <AreaChart
                    data={data.weeklyActivity}
                    xKey="week"
                    yKeys={['exams', 'participants']}
                    colors={['hsl(var(--chart-1))', 'hsl(var(--chart-2))']}
                    height={300}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-lg" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                        <Users className="h-5 w-5 text-foreground/60" />
                      </div>
                    </div>
                    <p className="text-sm">No participation trend data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Quick Insights */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold tracking-tight">Quick Insights</CardTitle>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 border border-white/[0.04]">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <CardDescription>Key takeaways from your analytics data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors group">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center backdrop-blur-sm border border-white/[0.04] group-hover:bg-emerald-500/15 transition-colors">
                <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Top Performing Subject</p>
                <p className="text-xs text-muted-foreground">{data.quickInsights.topSubject ?? 'No data yet'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-ember/5 border border-ember/15 hover:border-ember/30 transition-colors group">
              <div className="h-10 w-10 rounded-lg bg-ember/15 flex items-center justify-center backdrop-blur-sm border border-white/[0.04] group-hover:bg-ember/15 transition-colors">
                <AlertTriangle className="h-4.5 w-4.5 text-ember" />
              </div>
              <div>
                <p className="text-sm font-medium">Needs Attention</p>
                <p className="text-xs text-muted-foreground">{data.quickInsights.needsAttention ?? 'No data yet'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-colors group">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center backdrop-blur-sm border border-white/[0.04] group-hover:bg-primary/15 transition-colors">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Most Active Month</p>
                <p className="text-xs text-muted-foreground">{data.quickInsights.mostActiveMonth ?? 'No data yet'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* School Rankings */}
      {data.schoolRankings.length > 0 && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">School Rankings</CardTitle>
            <CardDescription>Top performing schools by student count and exam activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.schoolRankings.map((school, idx) => (
                <div key={school.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/15 hover:border-white/[0.06] hover:bg-hover/20 transition-all duration-200">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/15">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{school.name}</p>
                    <p className="text-xs text-muted-foreground">{school.totalStudents} students · {school.totalExams} exams</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-white/[0.04]">
                    {school.totalStudents} students
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
