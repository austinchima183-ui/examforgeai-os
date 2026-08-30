import { requireAnyRole } from '@/lib/auth/require-auth'
import { UserPlus, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { getSchoolAdminStats, getSchoolAdminActivities } from '@/lib/services/dashboard-service'
import {
  getRevenueTrend,
  getScoreDistribution,
  getUserGrowthTrend,
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
  type CalendarDayEvent,
} from '@/components/system'
import { SchoolAdminWidgets } from '@/components/dashboards/school-admin-widgets'

export const dynamic = 'force-dynamic'

// ============================================================================
// School Admin Dashboard — UX 2.0
// ============================================================================
// NOTE: The previous version rendered HARDCODED fake metrics ("Teacher
// attendance 96%", "Student attendance 92%", "Exam completion rate 88%").
// This version replaces them with REAL database widgets: revenue trend from
// successful transactions, user growth from real signups, score distribution
// from real exam sessions, and real school calendar events.
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function SchoolAdminDashboard() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const firstName = user.fullName.split(' ')[0]
  const schoolId = user.schoolId

  const [stats, activities, revenueTrend, scoreDist, userGrowth, schoolEvents] =
    await Promise.all([
      schoolId
        ? getSchoolAdminStats(schoolId)
        : Promise.resolve({
            teachers: 0,
            students: 0,
            exams: 0,
            revenue: 0,
            activeClasses: 0,
            pendingSubmissions: 0,
          }),
      schoolId ? getSchoolAdminActivities(schoolId) : Promise.resolve([]),
      getRevenueTrend(schoolId ?? undefined),
      getScoreDistribution(schoolId),
      getUserGrowthTrend(schoolId ?? undefined),
      getUpcomingSchoolEvents(schoolId, 6),
    ])

  const feedItems: ActivityFeedItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.description,
    timestamp: a.timestamp,
  }))

  // ── Calendar events (REAL school events) ──
  const calendarEvents: CalendarDayEvent[] = schoolEvents.map((event) => ({
    id: `event-${event.id}`,
    title: event.title,
    date: event.start_date.slice(0, 10),
    tone: 'ember' as const,
  }))

  // ── Goals computed from REAL metrics ──
  const goals = [
    {
      id: 'grow-students',
      label: 'Reach 200 enrolled students',
      current: stats.students,
      target: 200,
      tone: 'blue' as const,
    },
    {
      id: 'clear-submissions',
      label: 'Clear pending submissions',
      current: stats.pendingSubmissions === 0 ? 1 : 0,
      target: 1,
      tone: 'ember' as const,
    },
    {
      id: 'grow-exams',
      label: 'Run 50 exams this year',
      current: stats.exams,
      target: 50,
      tone: 'cyan' as const,
    },
  ]

  // ── Quick Actions ──
  const quickActionItems = [
    {
      href: ROUTES.SETTINGS,
      icon: 'settings',
      label: 'Manage School',
      description: 'Configure school settings and preferences',
      color: 'bg-blue-500/15 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: ROUTES.ANALYTICS,
      icon: 'bar-chart3',
      label: 'View Reports',
      description: 'Analyze school performance and trends',
      color: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: '/admin/users',
      icon: 'user-plus',
      label: 'Add Teacher',
      description: 'Invite or create teacher accounts',
      color: 'bg-violet-500/15 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ]

  // ── Admin Tools ──
  const adminTools = [
    {
      href: '/teachers',
      icon: 'book-open',
      label: 'Teachers',
      description: 'Manage teaching staff',
      color: 'bg-blue-500/15 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: '/students',
      icon: 'users',
      label: 'Students',
      description: 'Enrollment and profiles',
      color: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: ROUTES.SCHOOL_FEES,
      icon: 'credit-card',
      label: 'Fees',
      description: 'Billing and invoices',
      color: 'bg-amber-500/15 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      href: ROUTES.SCHOOL_ATTENDANCE,
      icon: 'activity',
      label: 'Attendance',
      description: 'Track student attendance',
      color: 'bg-rose-500/15 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ]

  const scoreDistData = scoreDist.map((b) => ({ name: b.bucket, value: b.count }))
  const growthData = userGrowth.map((p) => ({ date: p.date, value: p.revenue }))
  const revenueData = revenueTrend.map((p) => ({ date: p.date, value: p.revenue }))
  const totalTrendRevenue = revenueTrend.reduce((sum, p) => sum + p.revenue, 0)

  return (
    <DashboardPage
      title="Dashboard"
      badge={{ label: 'Admin', icon: 'school' }}
      actions={
        <Button asChild>
          <Link href="/admin/users">
            <UserPlus className="h-3.5 w-3.5" />
            Add user
          </Link>
        </Button>
      }
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        greeting={getGreeting()}
        name={firstName}
        description={
          stats.pendingSubmissions > 0
            ? `${stats.pendingSubmissions} submission${stats.pendingSubmissions > 1 ? 's' : ''} pending grading — review them when ready.`
            : 'Your school administration overview at a glance.'
        }
        badge="School Administration"
        badgeIcon="school"
        stats={[
          { label: 'Teachers', value: stats.teachers, icon: 'book-open', tone: 'blue' },
          { label: 'Students', value: stats.students, icon: 'graduation-cap', tone: 'emerald' },
          { label: 'Revenue', value: formatCurrency(stats.revenue), icon: 'dollar-sign', tone: 'gold' },
          { label: 'Exams', value: stats.exams, icon: 'file-text', tone: 'cyan' },
        ]}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.ANALYTICS}>
                View reports
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/users">
                <UserPlus className="h-3.5 w-3.5" />
                Add user
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <KpiGrid cols={4}>
        <KpiCard
          index={0}
          label="Teachers"
          value={stats.teachers}
          description="Active teachers"
          icon="book-open"
          iconBg="bg-blue-500/15 dark:bg-blue-500/20"
          iconColor="text-blue-600 dark:text-blue-400"
          gradient="from-blue-500/[0.04] to-transparent"
        />
        <KpiCard
          index={1}
          label="Students"
          value={stats.students}
          description="Enrolled students"
          icon="graduation-cap"
          iconBg="bg-emerald-500/15 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          gradient="from-emerald-500/[0.04] to-transparent"
        />
        <KpiCard
          index={2}
          label="Exams"
          value={stats.exams}
          description="Total exams created"
          icon="file-text"
          iconBg="bg-violet-500/15 dark:bg-violet-500/20"
          iconColor="text-violet-600 dark:text-violet-400"
          gradient="from-violet-500/[0.04] to-transparent"
        />
        <KpiCard
          index={3}
          label="Revenue"
          value={formatCurrency(stats.revenue)}
          description="Total successful payments"
          icon="dollar-sign"
          iconBg="bg-amber-500/15 dark:bg-amber-500/20"
          iconColor="text-amber-600 dark:text-amber-400"
          gradient="from-amber-500/[0.04] to-transparent"
          trend={stats.revenue > 0 ? 'up' : 'neutral'}
          trendValue={stats.revenue > 0 ? 'collected' : undefined}
        />
      </KpiGrid>

      {/* ── Pending submissions banner ───────────────────────────────── */}
      {stats.pendingSubmissions > 0 && (
        <SectionCard
          tier="surface"
          padding="default"
          className="border-amber-500/20 bg-gradient-to-r from-amber-500/[0.03] to-amber-500/[0.01]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/15">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {stats.pendingSubmissions} Pending Submissions
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Awaiting grading across your school
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.pendingSubmissions}
            </span>
          </div>
        </SectionCard>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <QuickActions actions={quickActionItems} cols={3} />

      {/* ── Main widget grid (12/8/4) ────────────────────────────────── */}
      {/* ── Interactive widget grid — drag / resize / collapse / refresh ── */}
      <SchoolAdminWidgets
        role={user.role}
        userId={user.id}
        schoolId={user.schoolId ?? ''}
        revenueData={revenueData}
        totalTrendRevenue={totalTrendRevenue}
        scoreDistData={scoreDistData}
        growthData={growthData}
        goals={goals}
        calendarEvents={calendarEvents}
        announcements={schoolEvents.map((e) => ({
          id: e.id,
          title: e.title,
          event_type: e.event_type,
          start_date: e.start_date,
        }))}
        feedItems={feedItems}
        adminTools={adminTools}
      />
    </DashboardPage>
  )
}
