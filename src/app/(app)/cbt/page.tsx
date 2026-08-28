import { requireAuth } from '@/lib/auth/require-auth'
import { FileText, Users, Clock, CheckCircle2, BarChart3, Plus, Zap, Activity, Monitor, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateExamDialog } from '@/components/dialogs/create-exam-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExamsTable } from '@/components/tables/exams-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCBTData } from '@/lib/services/cbt-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — CBT (Computer-Based Test) Page
// ============================================================================
// Server Component. Premium AI OS visual treatment.
// Displays exams from Supabase with live status indicators,
// premium stat cards, and tabbed data table.
// ============================================================================

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'outline',
  active: 'default',
  completed: 'secondary',
  archived: 'secondary',
  cancelled: 'destructive',
}

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  published: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
  cancelled: 'Cancelled',
}

const statusColorMap: Record<string, string> = {
  draft: 'bg-muted-foreground/20 text-muted-foreground',
  published: 'bg-primary/15 text-primary',
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-ember/15 text-ember',
  archived: 'bg-muted/50 text-muted-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}



export default async function CBTPage() {
  const { user } = await requireAuth()
  const role = user.role
  const schoolId = user.schoolId

  // Fetch live data from Supabase
  const data = await getCBTData(role, user.id, schoolId)

  // Filter exams by status for tabs
  const upcomingExams = data.exams.filter(e => e.status === 'published' || e.status === 'draft')
  const activeExams = data.exams.filter(e => e.status === 'active')
  const completedExams = data.exams.filter(e => e.status === 'completed')

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg min-h-screen">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Computer-Based Test
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage and monitor computer-based tests and examinations in real time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateExamDialog schoolId={schoolId} />
        </div>
      </div>

      {/* Ambient top glow */}
      <div className="-mt-8 h-24 rounded-2xl bg-gradient-to-r from-primary/8 via-neural/5 to-transparent blur-sm pointer-events-none" />

      {/* Premium Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/8 via-muted-foreground/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted-foreground/10 backdrop-blur-sm border-white/[0.06] group-hover:border-border/50 group-hover:bg-muted-foreground/15 transition-all duration-200">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{data.exams.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">All exams</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 backdrop-blur-sm border border-primary/20 group-hover:border-primary/40 group-hover:bg-primary/20 transition-all duration-200">
              <Zap className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{data.stats.activeExams}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Currently running</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-ember/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/15 backdrop-blur-sm border border-ember/20 group-hover:border-ember/40 group-hover:bg-ember/20 transition-all duration-200">
              <Clock className="h-4 w-4 text-ember" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{data.stats.upcomingExams}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Scheduled</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-emerald-500/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 backdrop-blur-sm border border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20 transition-all duration-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{data.stats.completedExams}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Finished</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-neural/8 via-neural/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neural/15 backdrop-blur-sm border border-neural/20 group-hover:border-neural/40 group-hover:bg-neural/20 transition-all duration-200">
              <Users className="h-4 w-4 text-neural" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{data.stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Across all exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold tracking-tight">All Exams</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border/80 via-border/40 to-transparent" />
        <Badge variant="outline" className="text-xs border-border/30 bg-secondary/50 tabular-nums">{data.exams.length} total</Badge>
      </div>

      {/* Data Table with Tabs — Premium Card */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200">
        <CardContent className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="mb-4 bg-secondary/50 border-white/[0.06] rounded-lg">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">All ({data.exams.length})</TabsTrigger>
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-ember/15 data-[state=active]:text-ember">Upcoming ({upcomingExams.length})</TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">Active ({activeExams.length})</TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-neural/15 data-[state=active]:text-neural">Completed ({completedExams.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ExamsTable
                data={data.exams}
                searchPlaceholder="Search exams..."
                emptyMessage="No exams found"
                emptyDescription="No exams have been created yet. Create your first exam to get started."
              />
            </TabsContent>

            <TabsContent value="upcoming">
              <ExamsTable
                data={upcomingExams}
                searchPlaceholder="Search upcoming exams..."
                emptyMessage="No upcoming exams"
                emptyDescription="There are no scheduled exams at this time."
              />
            </TabsContent>

            <TabsContent value="active">
              <ExamsTable
                data={activeExams}
                searchPlaceholder="Search active exams..."
                emptyMessage="No active exams"
                emptyDescription="There are no exams currently running."
              />
            </TabsContent>

            <TabsContent value="completed">
              <ExamsTable
                data={completedExams}
                searchPlaceholder="Search completed exams..."
                emptyMessage="No completed exams"
                emptyDescription="No exams have been completed yet."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
