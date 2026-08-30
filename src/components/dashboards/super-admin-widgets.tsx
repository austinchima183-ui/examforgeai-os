'use client'

// ============================================================================
// ExamForge AI — Super Admin Dashboard Widgets (Mission Ω-3)
// ============================================================================
// Client wrapper: super-admin dashboard widget sections become draggable /
// resizable / collapsible / refreshable widgets via WidgetGrid.
// Layout persists per `${role}:${userId}` in localStorage.
// ============================================================================

import Link from 'next/link'
import { Shield, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'
import {
  ActivityFeed,
  EmptyState,
  GoalsWidget,
  PerformanceBarWidget,
  QuickActions,
  TrendWidget,
  Button,
  WidgetGrid,
  type WidgetDef,
  type ActivityFeedItem,
} from '@/components/system'
import { IntelligentInsights } from '@/components/dashboard/intelligent-insights'
import type { UserRole } from '@/lib/types'

export interface SuperAdminWidgetsProps {
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

export function SuperAdminWidgets(props: SuperAdminWidgetsProps) {
  const {
    role,
    userId,
    schoolId,
    revenueData,
    totalTrendRevenue,
    scoreDistData,
    growthData,
    goals,
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
      id: 'platform-revenue',
      title: 'Platform Revenue',
      description: 'Successful payments across all schools (30 days)',
      category: 'analytics',
      exportData: () => revenueData.map((r) => ({ date: r.date, revenue: r.value })),
      defaultPosition: { x: 1, y: 1, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => (
        <TrendWidget
          data={revenueData}
          title="Platform Revenue"
          format="currency"
          color="emerald"
          headline={formatCurrency(totalTrendRevenue)}
          headlineLabel="last 30 days"
          bare
          emptyTitle="No payments yet"
          emptyDescription="Platform revenue will appear here as transactions accumulate."
        />
      ),
    },
    {
      id: 'score-distribution',
      title: 'Score Distribution',
      description: 'Graded sessions per score band',
      category: 'analytics',
      exportData: () => scoreDistData.map((s) => ({ band: s.name, sessions: s.value })),
      defaultPosition: { x: 1, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <PerformanceBarWidget
          data={scoreDistData}
          valueFormat="number"
          title="Score Distribution"
          icon="bar-chart3"
          bare
          emptyTitle="No graded sessions yet"
          emptyDescription="Distribution appears as students complete exams."
        />
      ),
    },
    {
      id: 'platform-growth',
      title: 'Platform Growth',
      description: 'New user signups over the last 14 days',
      category: 'analytics',
      exportData: () => growthData.map((g) => ({ date: g.date, signups: g.value })),
      defaultPosition: { x: 1, y: 3, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => (
        <TrendWidget
          data={growthData}
          title="Platform Growth"
          format="number"
          color="blue"
          bare
          emptyTitle="No recent signups"
          emptyDescription="New signups will appear here as users register."
        />
      ),
    },
    {
      id: 'platform-goals',
      title: 'Platform Goals',
      description: 'Milestones computed from live data',
      category: 'analytics',
      exportData: () =>
        goals.map((g) => ({ goal: g.label, current: g.current, target: g.target, unit: g.unit ?? '' })),
      defaultPosition: { x: 1, y: 4, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <GoalsWidget goals={goals} title="Platform Goals" bare />
      ),
    },
    {
      id: 'administration',
      title: 'Administration',
      description: 'Platform administration tools',
      category: 'tools',
      defaultPosition: { x: 1, y: 5, w: 12, h: 1, pinned: false, collapsed: false },
      render: () => <QuickActions actions={adminTools} cols={6} />,
    },
    {
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'Personalized recommendations from platform data',
      category: 'ai',
      frameless: true,
      defaultPosition: { x: 1, y: 6, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => <IntelligentInsights role={role} userId={userId} schoolId={schoolId} />,
    },
    {
      id: 'ai-insights-shortcut',
      title: 'Platform Intelligence',
      description: 'Platform-wide intelligence',
      category: 'ai',
      defaultPosition: { x: 1, y: 7, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
        <div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Anomaly detection, usage forecasting, churn prediction, and
            platform-wide recommendations powered by AI analytics.
          </p>
          <Button asChild size="sm" variant="ghost" className="mt-3">
            <Link href={ROUTES.ADMIN_ANALYTICS}>
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
      description: 'Latest platform-wide events',
      category: 'system',
      exportData: () =>
        feedItems.map((f) => ({ type: f.type, activity: f.title, timestamp: f.timestamp })),
      defaultPosition: { x: 1, y: 8, w: 12, h: 1, pinned: false, collapsed: false },
      render: () =>
        feedItems.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-7 w-7" />}
            title="No activity yet"
            description="Platform activity will appear here as schools and users engage with ExamForge."
            primaryAction={{
              label: 'Manage schools',
              href: ROUTES.ADMIN_SCHOOLS,
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
      aria-label="Super admin dashboard widgets — drag, resize, collapse or pin cards"
    />
  )
}
