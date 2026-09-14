// ============================================================================
// ExamForge AI — Student Exams View (Ω-UI)
// ============================================================================
// The student's exam storefront (UI Constitution, Article IX): students
// never see teacher telemetry — no Create buttons, no Participants columns,
// no Monitor links. Each exam is an honest card: availability window,
// duration, size, the student's own score when taken, and a single clear
// next action.
// ============================================================================

import Link from 'next/link'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Lock,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ExamListItem, StudentExamProgress } from '@/lib/services/cbt-service'
import { cn } from '@/lib/utils/cn'

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Anytime'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function StudentExamsView({
  exams,
  myResults,
}: {
  exams: ExamListItem[]
  myResults: Record<string, StudentExamProgress>
}) {
  const now = Date.now()
  const sorted = [...exams].sort((a, b) => {
    // Active/available first, then upcoming, then completed
    const rank = (e: ExamListItem) =>
      e.status === 'active' ? 0 : e.status === 'published' ? 1 : 2
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    return (a.startTime ? new Date(a.startTime).getTime() : Infinity) -
           (b.startTime ? new Date(b.startTime).getTime() : Infinity)
  })

  const availability = (exam: ExamListItem) => {
    const start = exam.startTime ? new Date(exam.startTime).getTime() : null
    const end = exam.endTime ? new Date(exam.endTime).getTime() : null
    if (exam.status === 'active') return 'available' as const
    if (exam.status === 'published' && (start === null || start > now)) return 'upcoming' as const
    if (end !== null && end < now) return 'closed' as const
    return exam.status === 'completed' ? 'completed' as const : 'available' as const
  }

  if (sorted.length === 0) {
    return (
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl">
        <CardContent className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No exams yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              When your teachers publish exams for your class, they will appear here with
              everything you need: timing, duration, and marks.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/student/practice">
              <Target className="h-3.5 w-3.5" />
              Practice while you wait
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((exam) => {
        const avail = availability(exam)
        const mine = myResults[exam.id]
        const taken = !!mine && mine.percentage !== null

        return (
          <Card
            key={exam.id}
            className={cn(
              'forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow transition-all duration-200',
              avail === 'available' && 'hover:-translate-y-0.5 hover:border-primary/20'
            )}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug line-clamp-2">{exam.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {exam.subject ?? 'General'}
                    {exam.className ? ` · ${exam.className}` : ''}
                  </p>
                </div>
                {taken ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 tabular-nums',
                      (mine.percentage ?? 0) >= 50
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-destructive/30 bg-destructive/10 text-destructive'
                    )}
                  >
                    {Math.round(mine.percentage ?? 0)}%
                  </Badge>
                ) : mine?.status === 'in_progress' ? (
                  <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-primary">
                    In progress
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0',
                      avail === 'available' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                      avail === 'upcoming' && 'border-ember/30 bg-ember/10 text-ember',
                      (avail === 'closed' || avail === 'completed') &&
                        'border-border/40 bg-secondary/50 text-muted-foreground'
                    )}
                  >
                    {avail === 'available' && 'Available'}
                    {avail === 'upcoming' && 'Upcoming'}
                    {avail === 'closed' && 'Closed'}
                    {avail === 'completed' && 'Finished'}
                  </Badge>
                )}
              </div>

              {/* Facts grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/30 border border-border/20 px-2 py-2">
                  <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-xs font-medium mt-1">{formatDuration(exam.duration)}</p>
                  <p className="text-[10px] text-muted-foreground">Duration</p>
                </div>
                <div className="rounded-lg bg-secondary/30 border border-border/20 px-2 py-2">
                  <FileText className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-xs font-medium mt-1 tabular-nums">{exam.totalQuestions}</p>
                  <p className="text-[10px] text-muted-foreground">Questions</p>
                </div>
                <div className="rounded-lg bg-secondary/30 border border-border/20 px-2 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-xs font-medium mt-1 tabular-nums">{exam.totalMarks}</p>
                  <p className="text-[10px] text-muted-foreground">Marks</p>
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {avail === 'available' ? (
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                ) : avail === 'upcoming' ? (
                  <Hourglass className="h-3.5 w-3.5 text-ember" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span>
                  {avail === 'upcoming' && exam.startTime
                    ? `Opens ${formatDate(exam.startTime)}`
                    : exam.endTime
                      ? `Closes ${formatDate(exam.endTime)}`
                      : 'No closing date'}
                  {mine && mine.attempts > 1 ? ` · ${mine.attempts} attempts` : ''}
                </span>
              </div>

              {/* Action — exactly one clear next step */}
              {avail === 'available' ? (
                <Button asChild className="w-full" size="sm">
                  <Link href={`/exams/${exam.id}/take`}>
                    {taken ? 'Retake Exam' : 'Start Exam'}
                  </Link>
                </Button>
              ) : taken ? (
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href="/results">View Results</Link>
                </Button>
              ) : (
                <Button variant="outline" className="w-full" size="sm" disabled>
                  {avail === 'upcoming' ? 'Not Open Yet' : 'Exam Closed'}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
