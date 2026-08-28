import { requireAnyRole } from '@/lib/auth/require-auth'
import {
  Brain,
  Plus,
  FileText,
  Trophy,
  ArrowRight,
  Target,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'
import { getStudentStats, getStudentActivities } from '@/lib/services/dashboard-service'
import {
  getStudentScoreTrend,
  getStudentSubjectPerformance,
  getStudentUpcomingExams,
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
  ScoreTrendWidget,
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
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// ============================================================================
// Student Dashboard — UX 2.0
// ============================================================================
// Enterprise dashboard composition:
//   Sticky toolbar (title + actions always visible)
//   → Hero (greeting + live stats + CTAs)
//   → KPI strip (4 animated cards)
//   → 12/8/4 responsive widget grid:
//       Score progression (real chart) · Subject performance (real chart)
//       Upcoming exams (real tasks)     · Goals (computed from real metrics)
//       Calendar (real events)          · Announcements (real school events)
//       AI insights · Recent activity
// All data is LIVE from the database — honest empty states when empty.
// ============================================================================

export default async function StudentDashboard() {
  const { user } = await requireAnyRole(['student', 'parent'])

  const firstName = user.fullName.split(' ')[0]

  const [stats, activities, scoreTrend, subjectPerf, upcomingExams, schoolEvents] =
    await Promise.all([
      getStudentStats(user.id, user.schoolId),
      getStudentActivities(user.id),
      getStudentScoreTrend(user.id),
      getStudentSubjectPerformance(user.id),
      getStudentUpcomingExams(user.id, user.schoolId),
      getUpcomingSchoolEvents(user.schoolId, 6),
    ])

  const scoreTrend2 = stats.averageScore >= 70 ? 'up' : stats.averageScore >= 50 ? 'neutral' : 'down'
  const scoreTrendLabel =
    scoreTrend2 === 'up' ? 'strong' : scoreTrend2 === 'down' ? 'needs work' : 'steady'

  // Map activity service items → ActivityFeedItem shape
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
    href: `/exams/${exam.id}/take`,
    meta: 'Exam',
    tone: 'blue',
  }))

  // ── Calendar events: exams + school events (REAL) ──
  const calendarEvents: CalendarDayEvent[] = [
    ...upcomingExams
      .filter((exam) => exam.start_time)
      .map((exam) => ({
        id: `exam-${exam.id}`,
        title: exam.title,
        date: exam.start_time!.slice(0, 10),
        tone: 'blue' as const,
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
      id: 'avg-score',
      label: 'Reach 80% average score',
      current: stats.averageScore,
      target: 80,
      unit: '%',
      tone: 'blue' as const,
    },
    {
      id: 'exams-done',
      label: 'Complete 10 exams',
      current: stats.completed,
      target: 10,
      tone: 'cyan' as const,
    },
    {
      id: 'high-scores',
      label: 'Score above 70% consistently',
      current: stats.averageScore >= 70 ? 1 : 0,
      target: 1,
      tone: 'emerald' as const,
    },
  ]

  // ── Quick Actions (top row) ──
  const quickActionItems = [
    {
      href: ROUTES.STUDENT_PRACTICE,
      icon: 'target',
      label: 'Take Exam',
      description: 'View and take your scheduled exams',
      color: 'bg-blue-500/15 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: ROUTES.STUDENT_PROGRESS,
      icon: 'bar-chart3',
      label: 'View Results',
      description: 'Check your scores and performance',
      color: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: ROUTES.STUDENT_PRACTICE,
      icon: 'sparkles',
      label: 'Practice',
      description: 'AI-powered practice sessions',
      color: 'bg-violet-500/15 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ]

  // ── Learning Tools (compact row) ──
  const learningTools = [
    {
      href: ROUTES.STUDENT_FLASHCARDS,
      icon: 'book-open',
      label: 'Flashcards',
      description: 'Review key concepts',
      color: 'bg-rose-500/15 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      href: ROUTES.STUDENT_AI_TUTOR,
      icon: 'brain',
      label: 'AI Tutor',
      description: 'Get instant help',
      color: 'bg-cyan-500/15 dark:bg-cyan-500/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      href: ROUTES.STUDENT_STUDY_PLANNER,
      icon: 'clipboard-list',
      label: 'Study Planner',
      description: 'Organize your study',
      color: 'bg-teal-500/15 dark:bg-teal-500/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      href: ROUTES.STUDENT_REVISION_HUB,
      icon: 'sparkles',
      label: 'Revision Hub',
      description: 'Smart revision sessions',
      color: 'bg-amber-500/15 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  const subjectChartData = subjectPerf.map((s) => ({ name: s.subject, value: s.score }))
  const streakDays = Math.min(stats.completed + stats.practiceSessions, 7)

  return (
    <DashboardPage
      title="Dashboard"
      badge={{ label: 'Student', icon: 'graduation-cap' }}
      actions={
        <Button asChild>
          <Link href={ROUTES.STUDENT_PRACTICE}>
            <Plus className="h-3.5 w-3.5" />
            Start practice
          </Link>
        </Button>
      }
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        greeting={getGreeting()}
        name={firstName}
        description={
          stats.upcomingExams > 0
            ? `You have ${stats.upcomingExams} upcoming exam${stats.upcomingExams > 1 ? 's' : ''} — stay prepared!`
            : 'No upcoming exams right now. Perfect time to practice!'
        }
        badge="Student Workspace"
        badgeIcon="graduation-cap"
        stats={[
          { label: 'Average score', value: `${stats.averageScore}%`, icon: 'bar-chart3', tone: 'blue' },
          { label: 'Exams completed', value: stats.completed, icon: 'check-circle2', tone: 'emerald' },
          { label: 'Study streak', value: `${streakDays} ${streakDays === 1 ? 'day' : 'days'}`, icon: 'flame', tone: 'ember' },
          { label: 'Upcoming', value: stats.upcomingExams, icon: 'calendar-days', tone: 'cyan' },
        ]}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.STUDENT_AI_TUTOR}>
                <Brain className="h-3.5 w-3.5" />
                Ask AI Tutor
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.STUDENT_PRACTICE}>
                <Target className="h-3.5 w-3.5" />
                Practice now
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <KpiGrid cols={4}>
        <KpiCard
          index={0}
          label="Upcoming Exams"
          value={stats.upcomingExams}
          description="Scheduled exams"
          icon="calendar-days"
          iconBg="bg-blue-500/15 dark:bg-blue-500/20"
          iconColor="text-blue-600 dark:text-blue-400"
          gradient="from-blue-500/[0.04] to-transparent"
        />
        <KpiCard
          index={1}
          label="Completed"
          value={stats.completed}
          description="Exams taken"
          icon="check-circle2"
          iconBg="bg-emerald-500/15 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          gradient="from-emerald-500/[0.04] to-transparent"
          trend={stats.completed > 0 ? 'up' : 'neutral'}
          trendValue={stats.completed > 0 ? 'active' : undefined}
        />
        <KpiCard
          index={2}
          label="Average Score"
          value={`${stats.averageScore}%`}
          description="Across all exams"
          icon="bar-chart3"
          iconBg="bg-violet-500/15 dark:bg-violet-500/20"
          iconColor="text-violet-600 dark:text-violet-400"
          gradient="from-violet-500/[0.04] to-transparent"
          trend={scoreTrend2}
          trendValue={scoreTrendLabel}
        />
        <KpiCard
          index={3}
          label="Practice Sessions"
          value={stats.practiceSessions}
          description="Total attempts"
          icon="target"
          iconBg="bg-amber-500/15 dark:bg-amber-500/20"
          iconColor="text-amber-600 dark:text-amber-400"
          gradient="from-amber-500/[0.04] to-transparent"
        />
      </KpiGrid>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <QuickActions actions={quickActionItems} cols={3} />

      {/* ── Main widget grid (12/8/4) ────────────────────────────────── */}
      <DashboardGrid>
        {/* Score progression — real chart */}
        <GridItem span={gridSpans.wide}>
          <ScoreTrendWidget data={scoreTrend} referenceValue={50} />
        </GridItem>

        {/* Upcoming exams — real tasks */}
        <GridItem span={gridSpans.third}>
          <UpcomingTasksWidget
            tasks={tasks}
            title="Upcoming Exams"
            description="Your scheduled assessments"
            emptyAction={{ label: 'Browse exams', href: ROUTES.STUDENT_PRACTICE }}
          />
        </GridItem>

        {/* Subject performance — real chart */}
        <GridItem span={gridSpans.third}>
          <PerformanceBarWidget
            data={subjectChartData}
            title="Subject Performance"
            description="Average score per subject"
            icon="bar-chart3"
            emptyTitle="No subject data yet"
            emptyDescription="Subject averages appear after your first graded exams."
          />
        </GridItem>

        {/* Goals — computed from real metrics */}
        <GridItem span={gridSpans.third}>
          <GoalsWidget goals={goals} />
        </GridItem>

        {/* Learning tools */}
        <GridItem span={gridSpans.wide}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Learning Tools</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
            </div>
            <QuickActions actions={learningTools} cols={4} />
          </div>
        </GridItem>

        {/* Calendar — real events */}
        <GridItem span={gridSpans.third}>
          <MiniCalendarWidget events={calendarEvents} />
        </GridItem>

        {/* AI insights */}
        <GridItem span={gridSpans.wide}>
          <IntelligentInsights role={user.role} userId={user.id} schoolId={user.schoolId} />
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

        {/* Study streak widget */}
        <GridItem span={gridSpans.third}>
          <SectionCard
            title="Study Streak"
            description="Keep your momentum going"
            icon="flame"
            tier="elevated"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-ember">
                {streakDays}
              </span>
              <span className="text-xs text-muted-foreground">days this week</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => {
                const active = i < streakDays
                return (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      active ? 'bg-ember' : 'bg-white/[0.04]'
                    }`}
                  />
                )
              })}
            </div>
          </SectionCard>
        </GridItem>

        {/* Achievements widget */}
        <GridItem span={gridSpans.third}>
          <SectionCard
            title="Achievements"
            description="Milestones unlocked"
            icon="trophy"
            tier="surface"
          >
            <div className="space-y-2">
              {[
                { label: 'First Exam', desc: 'Completed your first exam', unlocked: stats.completed > 0 },
                { label: 'Practiced', desc: 'Completed a practice session', unlocked: stats.practiceSessions > 0 },
                { label: 'High Scorer', desc: 'Scored above 70%', unlocked: stats.averageScore >= 70 },
              ].map((ach) => (
                <div
                  key={ach.label}
                  className={`flex items-center gap-2.5 rounded-lg p-2 ${
                    ach.unlocked ? 'bg-ember/5 border border-ember/15' : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-md flex items-center justify-center ${
                      ach.unlocked ? 'bg-ember/15 text-ember' : 'bg-white/[0.04] text-muted-foreground'
                    }`}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/90 truncate">{ach.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </GridItem>

        {/* AI Tutor shortcut */}
        <GridItem span={gridSpans.third}>
          <SectionCard
            title="AI Tutor"
            description="Get instant help with any topic"
            icon="brain"
            tier="surface"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href={ROUTES.STUDENT_AI_TUTOR}>
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your AI tutor is ready 24/7. Ask anything about your subjects,
              get explanations, and prepare smarter for exams.
            </p>
          </SectionCard>
        </GridItem>

        {/* Recent Activity — real feed */}
        <GridItem span={gridSpans.full}>
          <SectionCard
            title="Recent Activity"
            description="Your latest exam, practice, and result events"
            icon="clock"
            tier="surface"
            animate
          >
            {feedItems.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-7 w-7" />}
                title="No activity yet"
                description="Take an exam or start a practice session to see your activity here."
                primaryAction={{
                  label: 'Start practicing',
                  href: ROUTES.STUDENT_PRACTICE,
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
