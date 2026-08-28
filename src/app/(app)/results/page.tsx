import { requireAuth } from '@/lib/auth/require-auth'
import { CheckCircle2, XCircle, Trophy, BarChart3, Users, GraduationCap, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResultsTable } from '@/components/tables/results-table'
import { getResultsData } from '@/lib/services/results-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Results Page
// ============================================================================
// Server Component. Requires authentication. Data scoped by role.
// Premium AI OS visual treatment with enhanced stat cards,
// breakdown metrics, and premium data table.
// ============================================================================

export default async function ResultsPage() {
  const { user } = await requireAuth()

  // Fetch data scoped by role — students see only their own results
  const data = await getResultsData(user.role, user.id, user.schoolId)

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg min-h-screen">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results</h1>
          <p className="text-sm text-muted-foreground mt-1.5">View and analyze exam results, scores, and performance data.</p>
        </div>
      </div>

      {/* Ambient top glow */}
      <div className="-mt-8 h-24 rounded-2xl bg-gradient-to-r from-emerald-500/8 via-primary/5 to-transparent blur-sm pointer-events-none" />

      {/* Premium Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-emerald-500/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-emerald-500/15 transition-all duration-200">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight forge-gradient-text">{data.stats.passRate}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">Overall pass rate</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-primary/15 transition-all duration-200">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">Across all exams</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-ember/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-ember/15 transition-all duration-200">
              <Trophy className="h-4 w-4 text-ember" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.highestScore}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">Best result</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-neural/8 via-neural/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neural/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-neural/15 transition-all duration-200">
              <GraduationCap className="h-4 w-4 text-neural" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Exam submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards — Premium */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/15 backdrop-blur-sm flex items-center justify-center border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-emerald-500/15 transition-all duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-400">{data.stats.passedCount}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-destructive/15 backdrop-blur-sm flex items-center justify-center border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-destructive/20 transition-all duration-200">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-destructive">{data.stats.failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-muted/50 backdrop-blur-sm flex items-center justify-center border border-border/20 group-hover:border-white/[0.06] group-hover:bg-muted/50 transition-all duration-200">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{data.stats.absentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold tracking-tight">All Results</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border/80 via-border/40 to-transparent" />
        <Badge variant="outline" className="text-xs border-white/[0.04] bg-secondary/50 tabular-nums">{data.results.length} results</Badge>
      </div>

      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] transition-all duration-200">
        <CardContent className="p-6">
          <ResultsTable data={data.results} />
        </CardContent>
      </Card>
    </div>
  )
}
