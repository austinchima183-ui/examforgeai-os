'use client'

// ============================================================================
// ExamForge AI — Student Dashboard Widgets (Mission Ω-3)
// ============================================================================
// Client wrapper that turns the student dashboard's widget sections into
// draggable / resizable / collapsible / refreshable widgets via WidgetGrid.
// The server page keeps all data fetching; this component only composes.
// Layout persists per `${role}:${userId}` in localStorage.
// ============================================================================

import Link from 'next/link'
import { FileText, Trophy, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'
import {
  ActivityFeed,
  EmptyState,
  GoalsWidget,
  MiniCalendarWidget,
  PerformanceBarWidget,
  QuickActions,
  ScoreTrendWidget,
  UpcomingTasksWidget,
  AnnouncementsWidget,
  Button,
  WidgetGrid,
  type WidgetDef,
  type ActivityFeedItem,
  type TaskItem,
  type CalendarDayEvent,
} from '@/components/system'
import { IntelligentInsights } from '@/components/dashboard/intelligent-insights'
import type { UserRole } from '@/lib/types'

export interface StudentWidgetsProps {
  role: UserRole
  userId: string
  schoolId: string
  scoreTrend: Array<{ date: string; score: number; label: string }>
  subjectChartData: Array<{ name: string; value: number }>
  tasks: TaskItem[]
  goals: Array<{
    id: string
    label: string
    current: number
    target: number
    unit?: string
    tone: 'blue' | 'cyan' | 'emerald'
  }>
  calendarEvents: CalendarDayEvent[]
  announcements: Array<{
    id: string
    title: string
    event_type: string
    start_date: string
  }>
  feedItems: ActivityFeedItem[]
  learningTools: Array<{
    href: string
    icon: string
    label: string
    description: string
    color: string
    iconColor: string
  }>
  streakDays: number
  completed: number
  practiceSessions: number
  averageScore: number
}

export function StudentWidgets(props: StudentWidgetsProps) {
  const {
    role,
    userId,
    schoolId,
    scoreTrend,
    subjectChartData,
    tasks,
    goals,
    calendarEvents,
    announcements,
    feedItems,
    learningTools,
    streakDays,
    completed,
    practiceSessions,
    averageScore,
  } = props

  const widgets: WidgetDef[] = [
    {
      id: 'score-trend',
      title: 'Score Progression',
      description: 'Your exam scores over time',
      category: 'analytics',
      exportData: () =>
        scoreTrend.map((p) => ({ date: p.date, score: p.score, exam: p.label })),
      defaultPosition: { x: 1, y: 1, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <ScoreTrendWidget data={scoreTrend} referenceValue={50} bare />,
    },
    {
      id: 'upcoming-exams',
      title: 'Upcoming Exams',
      description: 'Your scheduled assessments',
      category: 'tasks',
      exportData: () =>
        tasks.map((t) => ({
          title: t.title,
          due_at: t.dueAt ?? '',
          type: t.meta,
          link: t.href,
        })),
      defaultPosition: { x: 1, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <UpcomingTasksWidget
          tasks={tasks}
          title="Upcoming Exams"
          bare
          emptyAction={{ label: 'Browse exams', href: ROUTES.STUDENT_PRACTICE }}
        />
      ),
    },
    {
      id: 'subject-performance',
      title: 'Subject Performance',
      description: 'Average score per subject',
      category: 'analytics',
      exportData: () => subjectChartData.map((s) => ({ subject: s.name, average_score: s.value })),
      defaultPosition: { x: 2, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <PerformanceBarWidget
          data={subjectChartData}
          title="Subject Performance"
          icon="bar-chart3"
          bare
          emptyTitle="No subject data yet"
          emptyDescription="Subject averages appear after your first graded exams."
        />
      ),
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'Progress toward your targets',
      category: 'analytics',
      exportData: () =>
        goals.map((g) => ({ goal: g.label, current: g.current, target: g.target, unit: g.unit ?? '' })),
      defaultPosition: { x: 3, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <GoalsWidget goals={goals} bare />,
    },
    {
      id: 'learning-tools',
      title: 'Learning Tools',
      description: 'Quick access to your study tools',
      category: 'tools',
      defaultPosition: { x: 1, y: 3, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <QuickActions actions={learningTools} cols={4} />,
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Your month at a glance',
      category: 'tasks',
      exportData: () =>
        calendarEvents.map((e) => ({ date: e.date, event: e.title, tone: e.tone })),
      defaultPosition: { x: 1, y: 4, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <MiniCalendarWidget events={calendarEvents} bare />,
    },
    {
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'Personalized recommendations from your data',
      category: 'ai',
      frameless: true,
      defaultPosition: { x: 1, y: 5, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <IntelligentInsights role={role} userId={userId} schoolId={schoolId} />,
    },
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'Latest from your school',
      category: 'social',
      exportData: () =>
        announcements.map((a) => ({ title: a.title, type: a.event_type, date: a.start_date })),
      defaultPosition: { x: 1, y: 6, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <AnnouncementsWidget announcements={announcements} bare />,
    },
    {
      id: 'study-streak',
      title: 'Study Streak',
      description: 'Keep your momentum going',
      category: 'analytics',
      exportData: () => [
        { metric: 'study_streak_days', value: streakDays },
        { metric: 'exams_completed', value: completed },
        { metric: 'practice_sessions', value: practiceSessions },
        { metric: 'average_score', value: averageScore },
      ],
      defaultPosition: { x: 1, y: 7, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ember">{streakDays}</span>
            <span className="text-xs text-muted-foreground">days this week</span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => {
              const active = i < streakDays
              return (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${active ? 'bg-ember' : 'bg-white/[0.04]'}`}
                />
              )
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'achievements',
      title: 'Achievements',
      description: 'Milestones unlocked',
      category: 'social',
      exportData: () => [
        { achievement: 'First Exam', description: 'Completed your first exam', unlocked: completed > 0 },
        { achievement: 'Practiced', description: 'Completed a practice session', unlocked: practiceSessions > 0 },
        { achievement: 'High Scorer', description: 'Scored above 70%', unlocked: averageScore >= 70 },
      ],
      defaultPosition: { x: 1, y: 8, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div className="space-y-2">
          {[
            { label: 'First Exam', desc: 'Completed your first exam', unlocked: completed > 0 },
            { label: 'Practiced', desc: 'Completed a practice session', unlocked: practiceSessions > 0 },
            { label: 'High Scorer', desc: 'Scored above 70%', unlocked: averageScore >= 70 },
          ].map((ach) => (
            <div
              key={ach.label}
              className={`flex items-center gap-2.5 rounded-lg p-2 ${
                ach.unlocked
                  ? 'bg-ember/5 border border-ember/15'
                  : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
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
      ),
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      description: 'Get instant help with any topic',
      category: 'ai',
      defaultPosition: { x: 1, y: 9, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your AI tutor is ready 24/7. Ask anything about your subjects, get
            explanations, and prepare smarter for exams.
          </p>
          <Button asChild size="sm" variant="ghost" className="mt-3">
            <Link href={ROUTES.STUDENT_AI_TUTOR}>
              Open
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      ),
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      description: 'Your latest exam, practice, and result events',
      category: 'system',
      exportData: () =>
        feedItems.map((f) => ({ type: f.type, activity: f.title, timestamp: f.timestamp })),
      defaultPosition: { x: 1, y: 10, w: 12, h: 1, pinned: false, collapsed: false },
      render: () =>
        feedItems.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="No activity yet"
            description="Take an exam or start a practice session to see your activity here."
            primaryAction={{ label: 'Start practicing', href: ROUTES.STUDENT_PRACTICE }}
          />
        ) : (
          <ActivityFeed items={feedItems} maxItems={10} />
        ),
    },
  ]

  return (
    <WidgetGrid
      widgets={widgets}
      role={role}
      userId={userId}
      aria-label="Student dashboard widgets — drag, resize, collapse or pin cards"
    />
  )
}
