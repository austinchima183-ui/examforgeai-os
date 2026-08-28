import { requireAuth } from '@/lib/auth/require-auth'
import { HelpCircle, Sparkles, BookOpen, FileText, Wand2, Filter, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuestionBankActions } from '@/components/buttons/question-bank-actions'
import { CreateQuestionDialog } from '@/components/dialogs/create-question-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuestionBankTable } from '@/components/tables/question-bank-table'
import { getQuestionBankData } from '@/lib/services/question-bank-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Question Bank Page
// ============================================================================
// Server Component. Premium AI OS visual treatment.
// Features "Generate with AI" button with neural glow,
// premium stat cards, category badges, and premium filters.
// ============================================================================







export default async function QuestionBankPage() {
  const { user } = await requireAuth()
  const role = user.role
  const schoolId = user.schoolId

  // Fetch live data from Supabase
  const data = await getQuestionBankData(role, user.id, schoolId)

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Browse, create, and manage questions for your exams.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Generate with AI button — neural glow */}
          <Button variant="outline" className="gap-2 neural-glow border-neural/30 text-neural hover:bg-neural/10 hover:text-neural hover:border-neural/50 transition-all duration-200 shadow-[0_0_12px_-3px_rgba(34,211,238,0.15)]">
            <Wand2 className="h-4 w-4" />
            Generate with AI
          </Button>
          <QuestionBankActions schoolId={schoolId} />
          <CreateQuestionDialog schoolId={schoolId} />
        </div>
      </div>

      {/* Ambient top glow */}
      <div className="-mt-8 h-24 rounded-2xl bg-gradient-to-r from-neural/8 via-primary/5 to-transparent blur-sm pointer-events-none" />

      {/* Premium Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-primary/15 transition-all duration-200">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground mt-0.5">In question bank</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-neural/8 via-neural/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Generated</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neural/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-neural/15 transition-all duration-200">
              <Sparkles className="h-4 w-4 text-neural" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.aiGenerated}</div>
            <p className="text-xs text-muted-foreground mt-0.5">AI-created questions</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-ember/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Covered</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-ember/15 transition-all duration-200">
              <BookOpen className="h-4 w-4 text-ember" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.subjectsCovered}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Unique subjects</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-emerald-500/3 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exam Usage</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 backdrop-blur-sm border border-white/[0.04] group-hover:border-white/[0.06] group-hover:bg-emerald-500/15 transition-all duration-200">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tracking-tight">{data.stats.examUsage}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Used in exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold tracking-tight">All Questions</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border/80 via-border/40 to-transparent" />
        <Badge variant="outline" className="text-xs border-white/[0.04] bg-secondary/50 tabular-nums">{data.questions.length} questions</Badge>
      </div>

      {/* Data Table — Premium Card */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] transition-all duration-200">
        <CardContent className="p-6">
          <QuestionBankTable data={ data.questions } />
        </CardContent>
      </Card>
    </div>
  )
}
