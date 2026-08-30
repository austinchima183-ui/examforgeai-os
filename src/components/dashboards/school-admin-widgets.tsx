'use client'

// ============================================================================
// ExamForge AI — School Admin Dashboard Widgets (Mission Ω-3)
// ============================================================================
// Client wrapper: school-admin dashboard widget sections become draggable /
// resizable / collapsible / refreshable widgets via WidgetGrid.
// Layout persists per `${role}:${userId}` in localStorage.
// ============================================================================

import Link from 'next/link'
import { School, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'
import {
  ActivityFeed,
  EmptyState,
  GoalsWidget,
  MiniCalendarWidget,
  PerformanceBarWidget,
  QuickActions,
  TrendWidget,
  AnnouncementsWidget,
  Button,
  WidgetGrid,
  type WidgetDef,
  type ActivityFeedItem,
  type CalendarDayEvent,
} from '@/components/system'
import { IntelligentInsights } from '@/components/dashboard/intelligent-insights'
import type { UserRole } from '@/lib/types'

export interface SchoolAdminWidgetsProps {
  role: UserRole
  userId: string
  schoolId: string
  revenueData: Array<{ date: string; value: number }>
  totalTrendRevenue: number
  scoreDistData: Array<{ name: string; value: number }>
  growthData: Array<{ date: string; value: number }>
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
  adminTools: Array<{
    href: string
    icon: string
    label: string
    description: string
    color: string
    iconColor: string
  }>
}

export function SchoolAdminWidgets(props: SchoolAdminWidgetsProps) {
  const {
    role,
    userId,
    schoolId,
    revenueData,
    totalTrendRevenue,
    scoreDistData,
    growthData,
    goals,
    calendarEvents,
    announcements,
    feedItems,
    adminTools,
  } = props

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const widgets: WidgetDef[] = [
    {
      id: 'revenue-trend',
      title: 'Revenue Trend',
      description: 'Successful payments over the last 30 days',
      category: 'analytics',
      exportData: () =>
        revenueData.map((r) => ({ date: r.date, revenue: r.value })),
      defaultPosition: { x: 1, y: 1, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => (
        <TrendWidget
          data={revenueData}
          title="Revenue Trend"
          format="currency"
          color="emerald"
          headline={formatCurrency(totalTrendRevenue)}
          headlineLabel="last 30 days"
          bare
          emptyTitle="No payments yet"
          emptyDescription="Revenue will appear here as successful transactions accumulate."
        />
      ),
    },
    {
      id: 'score-distribution',
      title: 'Score Distribution',
      description: 'Students per score band',
      category: 'analytics',
      exportData: () => scoreDistData.map((s) => ({ band: s.name, students: s.value })),
      defaultPosition: { x: 1, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <PerformanceBarWidget
          data={scoreDistData}
          valueFormat="number"
          title="Score Distribution"
          icon="bar-chart3"
          bare
          emptyTitle="No graded sessions yet"
          emptyDescription="Distribution appears once students complete exams."
        />
      ),
    },
    {
      id: 'user-growth',
      title: 'New Users',
      description: 'Signups over the last 14 days',
      category: 'analytics',
      exportData: () => growthData.map((g) => ({ date: g.date, signups: g.value })),
      defaultPosition: { x: 2, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <TrendWidget
          data={growthData}
          title="New Users"
          format="number"
          color="blue"
          bare
          emptyTitle="No recent signups"
          emptyDescription="New user signups will appear here."
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
      id: 'calendar',
      title: 'Calendar',
      description: 'School events at a glance',
      category: 'tasks',
      exportData: () =>
        calendarEvents.map((e) => ({ date: e.date, event: e.title, tone: e.tone })),
      defaultPosition: { x: 1, y: 3, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <MiniCalendarWidget events={calendarEvents} bare />,
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'Quick access to administration',
      category: 'tools',
      defaultPosition: { x: 1, y: 4, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <QuickActions actions={adminTools} cols={4} />,
    },
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'Latest school announcements',
      category: 'social',
      exportData: () =>
        announcements.map((a) => ({ title: a.title, type: a.event_type, date: a.start_date })),
      defaultPosition: { x: 1, y: 5, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => <AnnouncementsWidget announcements={announcements} bare />,
    },
    {
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'Personalized recommendations from your data',
      category: 'ai',
      frameless: true,
      defaultPosition: { x: 1, y: 6, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <IntelligentInsights role={role} userId={userId} schoolId={schoolId} />,
    },
    {
      id: 'ai-insights-shortcut',
      title: 'Predictive Analytics',
      description: 'AI analytics for your school',
      category: 'ai',
      defaultPosition: { x: 1, y: 7, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Identify at-risk students, predict exam outcomes, and surface
            actionable recommendations powered by school-wide AI analysis.
          </p>
          <Button asChild size="sm" variant="ghost" className="mt-3">
            <Link href="/school-admin/ai-insights">
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
      description: 'Latest events across your school',
      category: 'system',
      exportData: () =>
        feedItems.map((f) => ({ type: f.type, activity: f.title, timestamp: f.timestamp })),
      defaultPosition: { x: 1, y: 8, w: 12, h: 1, pinned: false, collapsed: false },
      render: () =>
        feedItems.length === 0 ? (
          <EmptyState
            icon={<School className="h-7 w-7" />}
            title="No activity yet"
            description="School activity will appear here as teachers and students engage with the platform."
            primaryAction={{
              label: 'Manage your school',
              href: ROUTES.SETTINGS,
            }}
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
      aria-label="School admin dashboard widgets — drag, resize, collapse or pin cards"
    />
  )
}
