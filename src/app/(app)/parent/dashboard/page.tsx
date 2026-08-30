'use client'

import * as React from 'react'
import {
  GraduationCap,
  CalendarDays,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Brain,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  DashboardPage,
  HeroSection,
  KpiCard,
  KpiGrid,
  SectionCard,
  GoalsWidget,
  EmptyState,
  Button,
  Badge,
  Progress,
  Skeleton,
  WidgetGrid,
  getGreeting,
  type WidgetDef,
} from '@/components/system'

// ============================================================================
// Parent Dashboard — UX 2.0
// ============================================================================
// Hero + KPI strip + 12/8/4 widget grid. All data comes from the real
// /api/parent/dashboard endpoint (children, notifications, messages) —
// skeleton loading while fetching, honest empty states when empty.
// ============================================================================

interface ChildData {
  id: string
  fullName: string
  email: string
  relationship: string
  className: string
  classId: string
  averageScore: number
  attendanceRate: number
  totalOutstanding: number
  recentResults: {
    id: string
    exam: string
    subject: string
    score: number
    totalMarks: number
    percentage: number
    grade: string | null
  }[]
  insights: string[]
}

interface ParentDashboardData {
  children: ChildData[]
  notifications: {
    id: string
    title: string
    message: string
    type: string
    createdAt: string
  }[]
  recentMessages: {
    id: string
    subject: string | null
    content: string
    createdAt: string
    sender: { fullName: string; role: string }
  }[]
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore()
  const { data, loading, error } = useApi<ParentDashboardData>(
    `/api/parent/dashboard?userId=${user?.id || ''}`,
  )

  const children = data?.children || []
  const avgScore =
    children.length > 0
      ? children.reduce((s, c) => s + c.averageScore, 0) / children.length
      : 0
  const avgAttendance =
    children.length > 0
      ? children.reduce((s, c) => s + c.attendanceRate, 0) / children.length
      : 0
  const totalOutstanding = children.reduce((s, c) => s + c.totalOutstanding, 0)
  const allInsights = children.flatMap((c) =>
    c.insights.map((i) => ({ child: c.fullName, insight: i })),
  )

  // ── Goals computed from REAL child metrics ──
  const goals = [
    {
      id: 'avg-score',
      label: 'Children average above 75%',
      current: Math.round(avgScore),
      target: 75,
      unit: '%',
      tone: 'blue' as const,
    },
    {
      id: 'attendance',
      label: 'Attendance above 95%',
      current: Math.round(avgAttendance),
      target: 95,
      unit: '%',
      tone: 'cyan' as const,
    },
    {
      id: 'fees',
      label: 'Settle all outstanding fees',
      current: totalOutstanding === 0 && children.length > 0 ? 1 : 0,
      target: 1,
      tone: 'emerald' as const,
    },
  ]

  const widgets: WidgetDef[] = [
    {
      id: 'children-overview',
      frameless: true,
      title: 'Children Overview',
      description: 'Click a child to view detailed progress, attendance, and fees',
      category: 'social',
      exportData: () =>
        children.map((c) => ({
          child: c.fullName,
          class: c.className,
          relationship: c.relationship,
          average_score: c.averageScore,
          attendance_rate: c.attendanceRate,
          outstanding_fees: c.totalOutstanding,
        })),
      defaultPosition: { x: 1, y: 1, w: 8, h: 1, pinned: false, collapsed: false },
      render: () => (
          <SectionCard
            title="Children Overview"
            description="Click a child to view detailed progress, attendance, and fees"
            icon="graduation-cap"
            tier="surface"
          >
            {error ? (
              <p className="py-6 text-center text-sm text-destructive">{error}</p>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : children.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-7 w-7" />}
                title="No children linked"
                description="Contact your school administrator to link your child's account to your profile."
              />
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="forge-glass-elevated rounded-lg border border-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.06]"
                  >
                    <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-emerald-500/10">
                          <GraduationCap className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">
                            {child.fullName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {child.className} • {child.relationship}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/parent/child-progress?childId=${child.id}`}>
                            <BarChart3 className="h-3.5 w-3.5" />
                            Progress
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/parent/attendance?childId=${child.id}`}>
                            <CalendarDays className="h-3.5 w-3.5" />
                            Attendance
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-center">
                        <div className="text-lg font-bold text-foreground">
                          {child.averageScore.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Avg Score
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-center">
                        <div className="text-lg font-bold text-foreground">
                          {child.attendanceRate.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Attendance
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-center">
                        <div className="text-lg font-bold text-foreground">
                          ₦{child.totalOutstanding.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Outstanding
                        </div>
                      </div>
                    </div>
                    {child.recentResults.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                          Recent Results
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {child.recentResults.slice(0, 4).map((r) => (
                            <Badge
                              key={r.id}
                              variant="secondary"
                              className="h-5 bg-white/[0.04] px-1.5 text-[10px] border-white/[0.06]"
                            >
                              {r.subject}: {r.percentage.toFixed(0)}% ({r.grade || '—'})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
      ),
    },
    {
      id: 'family-goals',
      frameless: true,
      title: 'Family Goals',
      description: "Computed from your children's live metrics",
      category: 'analytics',
      exportData: () =>
        goals.map((g) => ({ goal: g.label, current: g.current, target: g.target, unit: g.unit ?? '' })),
      defaultPosition: { x: 1, y: 2, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
          <GoalsWidget
            goals={goals}
            title="Family Goals"
            description="Computed from your children's live metrics"
          />
      ),
    },
    {
      id: 'recent-messages',
      frameless: true,
      title: 'Recent Messages',
      description: 'Conversations with teachers and school admin',
      category: 'social',
      exportData: () =>
        (data?.recentMessages ?? []).map((m) => ({
          subject: m.subject ?? '',
          content: m.content,
          sender: m.sender.fullName,
          sender_role: m.sender.role,
          sent_at: m.createdAt,
        })),
      defaultPosition: { x: 1, y: 3, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
          <SectionCard
            title="Recent Messages"
            description="Conversations with teachers and school admin"
            icon="message-square"
            tier="surface"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/parent/messaging">
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.recentMessages || data.recentMessages.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No recent messages
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentMessages.slice(0, 6).map((m) => (
                  <Link
                    key={m.id}
                    href="/parent/messaging"
                    className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-sky-500/10">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground/90">
                        {m.subject || m.content.slice(0, 50)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        From: {m.sender.fullName} •{' '}
                        {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
      ),
    },
    {
      id: 'recent-notifications',
      frameless: true,
      title: 'Recent Notifications',
      description: 'From school and platform',
      category: 'system',
      exportData: () =>
        (data?.notifications ?? []).map((n) => ({
          title: n.title,
          type: n.type,
          message: n.message,
          created_at: n.createdAt,
        })),
      defaultPosition: { x: 1, y: 4, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
          <SectionCard
            title="Recent Notifications"
            description="From school and platform"
            icon="bell"
            tier="surface"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/notifications">
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.notifications || data.notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No recent notifications
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-white/[0.03]"
                  >
                    <div
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        n.type === 'warning'
                          ? 'bg-amber-400'
                          : n.type === 'error'
                            ? 'bg-rose-400'
                            : 'bg-cyan-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground/90">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
      ),
    },
    {
      id: 'ai-insights',
      frameless: true,
      title: 'AI Insights',
      description: 'Personalized recommendations',
      category: 'ai',
      exportData: () =>
        allInsights.map((i) => ({ child: i.child, insight: i.insight })),
      defaultPosition: { x: 1, y: 5, w: 4, h: 1, pinned: false, collapsed: false },
      render: () => (
          <>{
            allInsights.length > 0 ? (
            <SectionCard
              title="AI Insights"
              description="Personalized recommendations"
              icon="sparkles"
              tier="elevated"
              className="border-amber-500/20"
            >
              <div className="space-y-2.5">
                {allInsights.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 p-2.5"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground/90">
                        {item.child}:
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {item.insight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="AI Advisor"
              description="Get expert guidance on your child's education"
              icon="brain"
              tier="surface"
              action={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/parent/ai-advisor">
                    Open
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              }
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ask about academic performance, attendance concerns, fee
                schedules, or how to support your child&apos;s learning at home.
              </p>
            </SectionCard>
          )}
          </>
      ),
    }
  ]

  return (
    <DashboardPage
      title="Dashboard"
      badge={{ label: 'Parent', icon: 'users' }}
      actions={
        <Button asChild variant="outline">
          <Link href="/parent/messaging">
            <MessageSquare className="h-3.5 w-3.5" />
            Message school
          </Link>
        </Button>
      }
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        greeting={getGreeting()}
        name={user?.fullName?.split(' ')[0] ?? 'Parent'}
        description="Overview of your children's academic progress and activities"
        badge="Parent Workspace"
        badgeIcon="users"
        stats={[
          { label: 'Children', value: children.length, icon: 'graduation-cap', tone: 'emerald' },
          { label: 'Avg score', value: loading ? '—' : `${avgScore.toFixed(0)}%`, icon: 'bar-chart3', tone: 'blue' },
          { label: 'Attendance', value: loading ? '—' : `${avgAttendance.toFixed(0)}%`, icon: 'calendar-days', tone: 'cyan' },
          { label: 'Outstanding fees', value: loading ? '—' : `₦${totalOutstanding.toLocaleString()}`, icon: 'credit-card', tone: 'ember' },
        ]}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/parent/ai-advisor">
                <Brain className="h-3.5 w-3.5" />
                AI Advisor
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/parent/child-progress">
                <BarChart3 className="h-3.5 w-3.5" />
                View progress
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <KpiGrid cols={4}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex h-28 items-center justify-center rounded-xl border border-white/[0.04] forge-glass-surface"
            >
              <Skeleton className="h-16 w-3/4" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              index={0}
              label="Children"
              value={children.length}
              description="Linked accounts"
              icon="users"
              iconBg="bg-emerald-500/15 dark:bg-emerald-500/20"
              iconColor="text-emerald-600 dark:text-emerald-400"
              gradient="from-emerald-500/[0.04] to-transparent"
            />
            <KpiCard
              index={1}
              label="Avg Score"
              value={`${avgScore.toFixed(0)}%`}
              description="Across all subjects"
              icon="bar-chart3"
              iconBg="bg-amber-500/15 dark:bg-amber-500/20"
              iconColor="text-amber-600 dark:text-amber-400"
              gradient="from-amber-500/[0.04] to-transparent"
              trend={avgScore >= 70 ? 'up' : avgScore >= 50 ? 'neutral' : 'down'}
              sparkline={<Progress value={avgScore} className="w-16 h-1" />}
            />
            <KpiCard
              index={2}
              label="Attendance"
              value={`${avgAttendance.toFixed(0)}%`}
              description="Average attendance"
              icon="calendar-days"
              iconBg="bg-cyan-500/15 dark:bg-cyan-500/20"
              iconColor="text-cyan-600 dark:text-cyan-400"
              gradient="from-cyan-500/[0.04] to-transparent"
              trend={avgAttendance >= 90 ? 'up' : 'neutral'}
              sparkline={<Progress value={avgAttendance} className="w-16 h-1" />}
            />
            <KpiCard
              index={3}
              label="Outstanding"
              value={`₦${totalOutstanding.toLocaleString()}`}
              description="In pending fees"
              icon="credit-card"
              iconBg="bg-rose-500/15 dark:bg-rose-500/20"
              iconColor="text-rose-600 dark:text-rose-400"
              gradient="from-rose-500/[0.04] to-transparent"
              trend={totalOutstanding > 0 ? 'down' : 'up'}
              trendValue={totalOutstanding > 0 ? 'due' : 'clear'}
            />
          </>
        )}
      </KpiGrid>

      {/* ── Interactive widget grid — drag / resize / collapse / refresh ── */}
      <WidgetGrid
        widgets={widgets}
        role={user?.role ?? 'parent'}
        userId={user?.id ?? 'default'}
        aria-label="Parent dashboard widgets — drag, resize, collapse or pin cards"
      />
    </DashboardPage>
  )
}
