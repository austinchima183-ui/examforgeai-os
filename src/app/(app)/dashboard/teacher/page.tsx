import { requireAnyRole } from '@/lib/auth/require-auth'
import {
  Plus,
  AlertCircle,
  ClipboardList,
  ArrowRight,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { getTeacherStats, getTeacherActivities } from '@/lib/services/dashboard-service'
import {
  getTeacherExamPerformance,
  getTeacherUpcomingExams,
  getUpcomingSchoolEvents,
} from '@/lib/services/dashboard-widget-service'
import { IntelligentInsights } from '@/components/dashboard/intelligent-insights'
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  gridSpans,
  HeroSection,
  KpiCard,
  KpiGrid,
  SectionCard,
  ActivityFeed,
  QuickActions,
  PerformanceBarWidget,
  UpcomingTasksWidget,
  MiniCalendarWidget,
  AnnouncementsWidget,
  GoalsWidget,
  EmptyState,
  Button,
  getGreeting,
  type ActivityFeedItem,
  type TaskItem,
  type CalendarDayEvent,
} from '@/components/system'

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

      {/* ── Main widget grid (12/8/4) ────────────────────────────────── */}
      <DashboardGrid>
        {/* Exam performance — REAL per-exam averages */}
        <GridItem span={gridSpans.wide}>
          <PerformanceBarWidget
            data={performanceChartData}
            title="Exam Performance"
            description="Average score across your exams"
            icon="bar-chart3"
            emptyTitle="No graded exams yet"
            emptyDescription="Average scores appear once students complete your exams."
          />
        </GridItem>

        {/* Upcoming exams — REAL tasks */}
        <GridItem span={gridSpans.third}>
          <UpcomingTasksWidget
            tasks={tasks}
            title="Exam Schedule"
            description="Your upcoming exam windows"
            emptyAction={{ label: 'Create an exam', href: ROUTES.EXAM_CREATE }}
          />
        </GridItem>

        {/* Goals — computed from real metrics */}
        <GridItem span={gridSpans.third}>
          <GoalsWidget goals={goals} />
        </GridItem>

        {/* Calendar — real events */}
        <GridItem span={gridSpans.third}>
          <MiniCalendarWidget events={calendarEvents} />
        </GridItem>

        {/* Teacher tools */}
        <GridItem span={gridSpans.wide}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Teacher Tools</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
            </div>
            <QuickActions actions={teacherTools} cols={4} />
          </div>
        </GridItem>

        {/* Announcements — real school events */}
        <GridItem span={gridSpans.third}>
          <AnnouncementsWidget
            announcements={schoolEvents.map((e) => ({
              id: e.id,
              title: e.title,
              event_type: e.event_type,
              start_date: e.start_date,
            }))}
          />
        </GridItem>

        {/* AI insights */}
        <GridItem span={gridSpans.wide}>
          <IntelligentInsights role={user.role} userId={user.id} schoolId={user.schoolId} />
        </GridItem>

        {/* AI Copilot shortcut */}
        <GridItem span={gridSpans.third}>
          <SectionCard
            title="AI Copilot"
            description="Generate questions, worksheets, lesson plans"
            icon="brain"
            tier="surface"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href={ROUTES.TEACHER_AI_QUESTION_GENERATOR}>
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your AI copilot helps you create exam questions, build worksheets,
              draft lesson plans, and analyze student performance — all in seconds.
            </p>
          </SectionCard>
        </GridItem>

        {/* Recent Activity — real feed */}
        <GridItem span={gridSpans.full}>
          <SectionCard
            title="Recent Activity"
            description="Latest exam, question, and grading events"
            icon="clock"
            tier="surface"
            animate
          >
            {feedItems.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-7 w-7" />}
                title="No activity yet"
                description="Create an exam or generate questions to see your activity here."
                primaryAction={{
                  label: 'Create your first exam',
                  href: ROUTES.EXAM_CREATE,
                }}
              />
            ) : (
              <ActivityFeed items={feedItems} maxItems={10} />
            )}
          </SectionCard>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  )
}
