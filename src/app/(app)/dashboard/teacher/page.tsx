import { requireAnyRole } from '@/lib/auth/require-auth'
import { Plus, AlertCircle, ArrowRight, Brain } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { getTeacherStats, getTeacherActivities } from '@/lib/services/dashboard-service'
import {
  getTeacherExamPerformance,
  getTeacherUpcomingExams,
  getUpcomingSchoolEvents,
} from '@/lib/services/dashboard-widget-service'
import {
  Button,
  DashboardPage,
  HeroSection,
  KpiCard,
  KpiGrid,
  QuickActions,
  SectionCard,
  getGreeting,
  type ActivityFeedItem,
  type TaskItem,
  type CalendarDayEvent,
} from '@/components/system'
import { TeacherWidgets } from '@/components/dashboards/teacher-widgets'

export const dynamic = 'force-dynamic'

// ============================================================================
// Teacher Dashboard — UX 2.0
// ============================================================================
// NOTE: The previous version rendered HARDCODED demo data for "Today's
// Schedule" (fixed time slots) and "Class Performance" (fixed averages).
// That violated the no-fake-data rule. This version replaces them with
// REAL database widgets: upcoming exams, per-exam average performance,
// real school calendar events, and goals computed from real counts.
// ============================================================================

export default async function TeacherDashboard() {
  const { user } = await requireAnyRole(['teacher', 'school_admin', 'super_admin'])

  const firstName = user.fullName.split(' ')[0]

  const [stats, activities, examPerformance, upcomingExams, schoolEvents] =
    await Promise.all([
      getTeacherStats(user.id),
      getTeacherActivities(user.id),
      getTeacherExamPerformance(user.id),
      getTeacherUpcomingExams(user.id),
      getUpcomingSchoolEvents(user.schoolId, 6),
    ])

  const feedItems: ActivityFeedItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.description,
    timestamp: a.timestamp,
  }))

  // ── Upcoming exams → Tasks (REAL data) ──
  const tasks: TaskItem[] = upcomingExams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    dueAt: exam.start_time,
    href: `/exams/${exam.id}`,
    meta: 'Exam window',
    tone: 'cyan',
  }))

  // ── Calendar events: teacher's exams + school events (REAL) ──
  const calendarEvents: CalendarDayEvent[] = [
    ...upcomingExams
      .filter((exam) => exam.start_time)
      .map((exam) => ({
        id: `exam-${exam.id}`,
        title: exam.title,
        date: exam.start_time!.slice(0, 10),
        tone: 'cyan' as const,
      })),
    ...schoolEvents.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      date: event.start_date.slice(0, 10),
      tone: 'ember' as const,
    })),
  ]

  // ── Goals computed from REAL metrics ──
  const goals = [
    {
      id: 'question-bank',
      label: 'Build a 100-question bank',
      current: stats.questions,
      target: 100,
      tone: 'blue' as const,
    },
    {
      id: 'clear-grading',
      label: 'Clear the grading queue',
      current: Math.max(0, stats.pendingGrading === 0 ? 1 : 0),
      target: 1,
      tone: 'ember' as const,
    },
    {
      id: 'publish-exams',
      label: 'Run 10 exams total',
      current: stats.exams,
      target: 10,
      tone: 'cyan' as const,
    },
  ]

  // ── Quick Actions ──
  const quickActionItems = [
    {
      href: ROUTES.EXAM_CREATE,
      icon: 'plus',
      label: 'Create Exam',
      description: 'Build a new exam from scratch or a template',
      color: 'bg-blue-500/15 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: ROUTES.EXAMS,
      icon: 'bar-chart3',
      label: 'View Results',
      description: 'Review exam submissions and analytics',
      color: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: ROUTES.QUESTIONS_CREATE,
      icon: 'sparkles',
      label: 'Generate Questions',
      description: 'Use AI to create questions instantly',
      color: 'bg-violet-500/15 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ]

  // ── Teacher Tools ──
  const teacherTools = [
    {
      href: ROUTES.TEACHER_LESSON_PLANS,
      icon: 'clipboard-list',
      label: 'Lesson Planner',
      description: 'Plan your lessons',
      color: 'bg-teal-500/15 dark:bg-teal-500/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      href: ROUTES.TEACHER_AI_QUESTION_GENERATOR,
      icon: 'brain',
      label: 'AI Question Gen',
      description: 'Auto-generate questions',
      color: 'bg-cyan-500/15 dark:bg-cyan-500/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      href: ROUTES.TEACHER_WORKSHEETS,
      icon: 'file-text',
      label: 'Worksheet Builder',
      description: 'Build printable worksheets',
      color: 'bg-amber-500/15 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      href: ROUTES.TEACHER_GRADING,
      icon: 'check-circle2',
      label: 'Grading Queue',
      description: 'Review submissions',
      color: 'bg-rose-500/15 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ]

  const performanceChartData = examPerformance.map((p) => ({
    name: p.exam,
    value: p.avgScore,
  }))

  return (
    <DashboardPage
      title="Dashboard"
      badge={{ label: 'Teacher', icon: 'book-open' }}
      actions={
        <Button asChild>
          <Link href={ROUTES.EXAM_CREATE}>
            <Plus className="h-3.5 w-3.5" />
            New exam
          </Link>
        </Button>
      }
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        greeting={getGreeting()}
        name={firstName}
        description={
          stats.activeExams > 0
            ? `${stats.activeExams} exam${stats.activeExams > 1 ? 's' : ''} currently active — stay on top of grading!`
            : 'Your teaching workspace is ready for the day.'
        }
        badge="Teacher Workspace"
        badgeIcon="book-open"
        stats={[
          { label: 'Students reached', value: stats.students, icon: 'users', tone: 'blue' },
          { label: 'Active exams', value: stats.activeExams, icon: 'check-circle2', tone: 'emerald' },
          { label: 'Pending grading', value: stats.pendingGrading, icon: 'alert-triangle', tone: 'ember' },
          { label: 'Questions', value: stats.questions, icon: 'sparkles', tone: 'cyan' },
        ]}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.TEACHER_GRADING}>
                Grading queue
                {stats.pendingGrading > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                    {stats.pendingGrading}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.TEACHER_AI_QUESTION_GENERATOR}>
                <Brain className="h-3.5 w-3.5" />
                Generate questions
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <KpiGrid cols={4}>
        <KpiCard
          index={0}
          label="Students"
          value={stats.students}
          description="Total students"
          icon="users"
          iconBg="bg-blue-500/15 dark:bg-blue-500/20"
          iconColor="text-blue-600 dark:text-blue-400"
          gradient="from-blue-500/[0.04] to-transparent"
        />
        <KpiCard
          index={1}
          label="Exams"
          value={stats.exams}
          description="Exams created"
          icon="file-text"
          iconBg="bg-emerald-500/15 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          gradient="from-emerald-500/[0.04] to-transparent"
        />
        <KpiCard
          index={2}
          label="Questions"
          value={stats.questions}
          description="In your question bank"
          icon="sparkles"
          iconBg="bg-violet-500/15 dark:bg-violet-500/20"
          iconColor="text-violet-600 dark:text-violet-400"
          gradient="from-violet-500/[0.04] to-transparent"
        />
        <KpiCard
          index={3}
          label="Active Exams"
          value={stats.activeExams}
          description="Currently running"
          icon="check-circle2"
          iconBg="bg-amber-500/15 dark:bg-amber-500/20"
          iconColor="text-amber-600 dark:text-amber-400"
          gradient="from-amber-500/[0.04] to-transparent"
          trend={stats.activeExams > 0 ? 'up' : 'neutral'}
          trendValue={stats.activeExams > 0 ? 'live' : undefined}
        />
      </KpiGrid>

      {/* ── Pending grading alert — full-width banner ─────────────────── */}
      {stats.pendingGrading > 0 && (
        <SectionCard
          tier="surface"
          className="border-amber-500/20 bg-gradient-to-r from-amber-500/[0.03] to-amber-500/[0.01]"
          padding="default"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/15">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {stats.pendingGrading} pending grading
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submissions awaiting your review
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
              <Link href={ROUTES.TEACHER_GRADING}>
                Review now
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </SectionCard>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <QuickActions actions={quickActionItems} cols={3} />

      {/* ── Interactive widget grid — drag / resize / collapse / refresh ── */}
      <TeacherWidgets
        role={user.role}
        userId={user.id}
        schoolId={user.schoolId ?? ''}
        performanceChartData={performanceChartData}
        tasks={tasks}
        goals={goals}
        calendarEvents={calendarEvents}
        announcements={schoolEvents.map((e) => ({
          id: e.id,
          title: e.title,
          event_type: e.event_type,
          start_date: e.start_date,
        }))}
        feedItems={feedItems}
        teacherTools={teacherTools}
      />
    </DashboardPage>
  )
}
