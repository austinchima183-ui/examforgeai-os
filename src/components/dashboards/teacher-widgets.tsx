'use client'

// ============================================================================
// ExamForge AI — Teacher Dashboard Widgets (Mission Ω-3)
// ============================================================================
// Client wrapper: teacher dashboard widget sections become draggable /
// resizable / collapsible / refreshable widgets via WidgetGrid.
// Layout persists per `${role}:${userId}` in localStorage.
// ============================================================================

import Link from 'next/link'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'
import {
  ActivityFeed,
  EmptyState,
  GoalsWidget,
  MiniCalendarWidget,
  PerformanceBarWidget,
  QuickActions,
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

export interface TeacherWidgetsProps {
  role: UserRole
  userId: string
  schoolId: string
  performanceChartData: Array<{ name: string; value: number }>
  tasks: TaskItem[]
  goals: Array<{
    id: string
    label: string
    current: number
    target: number
    unit?: string
    tone: 'blue' | 'cyan' | 'emerald' | 'ember'
  }>
  calendarEvents: CalendarDayEvent[]
  announcements: Array<{
    id: string
    title: string
    event_type: string
    start_date: string
  }>
  feedItems: ActivityFeedItem[]
  teacherTools: Array<{
    href: string
    icon: string
    label: string
    description: string
    color: string
    iconColor: string
  }>
}

export function TeacherWidgets(props: TeacherWidgetsProps) {
  const {
    role,
    userId,
    schoolId,
    performanceChartData,
    tasks,
    goals,
    calendarEvents,
    announcements,
    feedItems,
    teacherTools,
  } = props

  const widgets: WidgetDef[] = [
    {
      id: 'exam-performance',
      title: 'Exam Performance',
      description: 'Average score across your exams',
      category: 'analytics',
      exportData: () =>
        performanceChartData.map((p) => ({ exam: p.name, average_score: p.value })),
      defaultPosition: { x: 1, y: 1, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => (
        <PerformanceBarWidget
          data={performanceChartData}
          title="Exam Performance"
          icon="bar-chart3"
          bare
          emptyTitle="No graded exams yet"
          emptyDescription="Average scores appear once students complete your exams."
        />
      ),
    },
    {
      id: 'exam-schedule',
      title: 'Exam Schedule',
      description: 'Your upcoming exam windows',
      category: 'tasks',
      exportData: () =>
        tasks.map((t) => ({ title: t.title, due_at: t.dueAt ?? '', type: t.meta ?? '' })),
      defaultPosition: { x: 1, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <UpcomingTasksWidget
          tasks={tasks}
          title="Exam Schedule"
          bare
          emptyAction={{ label: 'Create an exam', href: ROUTES.EXAM_CREATE }}
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
      defaultPosition: { x: 2, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <GoalsWidget goals={goals} bare />,
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Your month at a glance',
      category: 'tasks',
      exportData: () =>
        calendarEvents.map((e) => ({ date: e.date, event: e.title, tone: e.tone })),
      defaultPosition: { x: 3, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <MiniCalendarWidget events={calendarEvents} bare />,
    },
    {
      id: 'teacher-tools',
      title: 'Teacher Tools',
      description: 'Quick access to your tools',
      category: 'tools',
      defaultPosition: { x: 1, y: 3, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <QuickActions actions={teacherTools} cols={4} />,
    },
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'Latest from your school',
      category: 'social',
      exportData: () =>
        announcements.map((a) => ({ title: a.title, type: a.event_type, date: a.start_date })),
      defaultPosition: { x: 1, y: 4, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <AnnouncementsWidget announcements={announcements} bare />,
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
      id: 'ai-copilot',
      title: 'AI Copilot',
      description: 'Generate questions, worksheets, lesson plans',
      category: 'ai',
      defaultPosition: { x: 1, y: 6, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your AI copilot helps you create exam questions, build worksheets,
            draft lesson plans, and analyze student performance — all in seconds.
          </p>
          <Button asChild size="sm" variant="ghost" className="mt-3">
            <Link href={ROUTES.TEACHER_AI_QUESTION_GENERATOR}>
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
      description: 'Latest exam, question, and grading events',
      category: 'system',
      exportData: () =>
        feedItems.map((f) => ({ type: f.type, activity: f.title, timestamp: f.timestamp })),
      defaultPosition: { x: 1, y: 7, w: 12, h: 1, pinned: false, collapsed: false },
      render: () =>
        feedItems.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="No activity yet"
            description="Create an exam or generate questions to see your activity here."
            primaryAction={{ label: 'Create your first exam', href: ROUTES.EXAM_CREATE }}
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
      aria-label="Teacher dashboard widgets — drag, resize, collapse or pin cards"
    />
  )
}
