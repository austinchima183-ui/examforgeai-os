import { requireAnyRole } from '@/lib/auth/require-auth'
import {
  Shield,
  School,
  AlertCircle,
  ArrowRight,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { getSuperAdminStats, getSuperAdminActivities } from '@/lib/services/dashboard-service'
import {
  getRevenueTrend,
  getScoreDistribution,
  getUserGrowthTrend,
} from '@/lib/services/dashboard-widget-service'
import { IntelligentInsights } from '@/components/dashboard/intelligent-insights'
import { ROUTES } from '@/lib/constants/routes'
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
  TrendWidget,
  GoalsWidget,
  EmptyState,
  Button,
  Badge,
  getGreeting,
  type ActivityFeedItem,
} from '@/components/system'

export const dynamic = 'force-dynamic'

// ============================================================================
// Super Admin Dashboard — UX 2.0
// ============================================================================
// NOTE: The previous version rendered FABRICATED "System Health" metrics
// (99.98% uptime, 24ms DB, 1,247 active sessions, 8.4k API calls/min) —
// all hardcoded strings with no source. This version removes every fake
// metric and replaces them with REAL platform widgets: revenue trend from
// successful transactions, user growth from real signups, score
// distribution from real sessions, and goals computed from real counts.
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function SuperAdminDashboard() {
  const { user } = await requireAnyRole(['super_admin'])

  const firstName = user.fullName.split(' ')[0]

  const [stats, activities, revenueTrend, scoreDist, userGrowth] = await Promise.all([
    getSuperAdminStats(),
    getSuperAdminActivities(),
    getRevenueTrend(),
    getScoreDistribution(null),
    getUserGrowthTrend(),
  ])

  const feedItems: ActivityFeedItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.description,
    timestamp: a.timestamp,
  }))

  // ── Goals computed from REAL metrics ──
  const goals = [
    {
      id: 'grow-schools',
      label: 'Onboard 50 schools',
      current: stats.schools,
      target: 50,
      tone: 'blue' as const,
    },
    {
      id: 'grow-users',
      label: 'Reach 10,000 platform users',
      current: stats.users,
      target: 10000,
      tone: 'cyan' as const,
    },
    {
      id: 'clear-payments',
      label: 'Clear pending payments',
      current: stats.pendingPayments === 0 ? 1 : 0,
      target: 1,
      tone: 'ember' as const,
    },
  ]

  // ── Quick Actions ──
  const quickActionItems = [
    {
      href: ROUTES.ADMIN_SCHOOLS,
      icon: 'school',
      label: 'Manage Schools',
      description: 'View and manage all registered schools',
      color: 'bg-blue-500/15 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: ROUTES.ADMIN_ANALYTICS,
      icon: 'bar-chart3',
      label: 'View Analytics',
      description: 'Platform-wide analytics and insights',
      color: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: ROUTES.ADMIN_AUDIT_LOGS,
      icon: 'activity',
      label: 'System Health',
      description: 'Monitor infrastructure and service status',
      color: 'bg-violet-500/15 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ]

  // ── Admin Tools ──
  const adminTools = [
    { href: ROUTES.ADMIN_USERS, icon: 'users', label: 'Users', description: 'Manage accounts', color: 'bg-blue-500/15 dark:bg-blue-500/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { href: ROUTES.ADMIN_BILLING, icon: 'dollar-sign', label: 'Billing', description: 'Payments & invoices', color: 'bg-emerald-500/15 dark:bg-emerald-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { href: ROUTES.ADMIN_AGENTS, icon: 'cpu', label: 'AI Mgmt', description: 'Agent management', color: 'bg-violet-500/15 dark:bg-violet-500/20', iconColor: 'text-violet-600 dark:text-violet-400' },
    { href: ROUTES.ADMIN_MARKETPLACE, icon: 'globe', label: 'Marketplace', description: 'Extensions & plugins', color: 'bg-teal-500/15 dark:bg-teal-500/20', iconColor: 'text-teal-600 dark:text-teal-400' },
    { href: ROUTES.ADMIN_SECURITY, icon: 'lock', label: 'Security', description: 'Access & policies', color: 'bg-rose-500/15 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
    { href: ROUTES.ADMIN_AUDIT_LOGS, icon: 'database', label: 'Audit Logs', description: 'System audit trail', color: 'bg-amber-500/15 dark:bg-amber-500/20', iconColor: 'text-amber-600 dark:text-amber-400' },
  ]

  const scoreDistData = scoreDist.map((b) => ({ name: b.bucket, value: b.count }))
  const growthData = userGrowth.map((p) => ({ date: p.date, value: p.revenue }))
  const revenueData = revenueTrend.map((p) => ({ date: p.date, value: p.revenue }))
  const totalTrendRevenue = revenueTrend.reduce((sum, p) => sum + p.revenue, 0)
  const gradedSessions = scoreDist.reduce((sum, b) => sum + b.count, 0)

  return (
    <DashboardPage
      title="Dashboard"
      badge={{ label: 'Super Admin', icon: 'shield' }}
      actions={
        <Button asChild>
          <Link href={ROUTES.ADMIN_SCHOOLS}>
            <School className="h-3.5 w-3.5" />
            Manage schools
          </Link>
        </Button>
      }
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        greeting={getGreeting()}
        name={firstName}
        description={
          stats.pendingPayments > 0
            ? `${stats.pendingPayments} payment${stats.pendingPayments > 1 ? 's' : ''} pending processing — review when ready.`
            : 'Platform operations running smoothly.'
        }
        badge="Platform Control Center"
        badgeIcon="shield"
        stats={[
          { label: 'Schools', value: stats.schools, icon: 'school', tone: 'blue' },
          { label: 'Users', value: stats.users, icon: 'users', tone: 'cyan' },
          { label: 'Revenue', value: formatCurrency(stats.revenue), icon: 'dollar-sign', tone: 'gold' },
          { label: 'Graded sessions', value: gradedSessions, icon: 'check-circle2', tone: 'emerald' },
        ]}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.ADMIN_ANALYTICS}>
                View analytics
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.ADMIN_SCHOOLS}>
                <School className="h-3.5 w-3.5" />
                Manage schools
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <KpiGrid cols={4}>
        <KpiCard
          index={0}
          label="Schools"
          value={stats.schools}
          description="Registered schools"
          icon="school"
          iconBg="bg-blue-500/15 dark:bg-blue-500/20"
          iconColor="text-blue-600 dark:text-blue-400"
          gradient="from-blue-500/[0.04] to-transparent"
          trend={stats.activeSchools > 0 ? 'up' : 'neutral'}
          trendValue={stats.activeSchools > 0 ? `${stats.activeSchools} active` : undefined}
        />
        <KpiCard
          index={1}
          label="Users"
          value={stats.users}
          description="Total platform users"
          icon="users"
          iconBg="bg-violet-500/15 dark:bg-violet-500/20"
          iconColor="text-violet-600 dark:text-violet-400"
          gradient="from-violet-500/[0.04] to-transparent"
        />
        <KpiCard
          index={2}
          label="Revenue"
          value={formatCurrency(stats.revenue)}
          description="Total successful payments"
          icon="dollar-sign"
          iconBg="bg-emerald-500/15 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          gradient="from-emerald-500/[0.04] to-transparent"
          trend={stats.revenue > 0 ? 'up' : 'neutral'}
          trendValue={stats.revenue > 0 ? 'collected' : undefined}
        />
        <KpiCard
          index={3}
          label="Exams"
          value={stats.exams}
          description="Total exams created"
          icon="file-text"
          iconBg="bg-amber-500/15 dark:bg-amber-500/20"
          iconColor="text-amber-600 dark:text-amber-400"
          gradient="from-amber-500/[0.04] to-transparent"
        />
      </KpiGrid>

      {/* ── Pending Payments banner ───────────────────────────────────── */}
      {stats.pendingPayments > 0 && (
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
                  Pending Payments
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.pendingPayments}
            </span>
          </div>
        </SectionCard>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <QuickActions actions={quickActionItems} cols={3} />

      {/* ── Main widget grid (12/8/4) ────────────────────────────────── */}
      <DashboardGrid>
        {/* Revenue trend — REAL successful transactions */}
        <GridItem span={gridSpans.wide}>
          <TrendWidget
            data={revenueData}
            title="Platform Revenue"
            description="Successful payments across all schools (30 days)"
            format="currency"
            color="emerald"
            headline={formatCurrency(totalTrendRevenue)}
            headlineLabel="last 30 days"
            emptyTitle="No payments yet"
            emptyDescription="Platform revenue will appear here as transactions accumulate."
          />
        </GridItem>

        {/* Score distribution — REAL sessions */}
        <GridItem span={gridSpans.third}>
          <PerformanceBarWidget
            data={scoreDistData}
            valueFormat="number"
            title="Score Distribution"
            description="Graded sessions per score band"
            icon="bar-chart3"
            emptyTitle="No graded sessions yet"
            emptyDescription="Distribution appears as students complete exams."
          />
        </GridItem>

        {/* User growth — REAL signups */}
        <GridItem span={gridSpans.wide}>
          <TrendWidget
            data={growthData}
            title="Platform Growth"
            description="New user signups over the last 14 days"
            format="number"
            color="blue"
            emptyTitle="No recent signups"
            emptyDescription="New signups will appear here as users register."
          />
        </GridItem>

        {/* Goals — computed from real metrics */}
        <GridItem span={gridSpans.third}>
          <GoalsWidget
            goals={goals}
            title="Platform Goals"
            description="Milestones computed from live data"
          />
        </GridItem>

        {/* Administration tools */}
        <GridItem span={gridSpans.full}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Administration</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
            </div>
            <QuickActions actions={adminTools} cols={6} />
          </div>
        </GridItem>

        {/* AI insights */}
        <GridItem span={gridSpans.wide}>
          <IntelligentInsights role={user.role} userId={user.id} schoolId={user.schoolId} />
        </GridItem>

        {/* AI Insights shortcut */}
        <GridItem span={gridSpans.third}>
          <SectionCard
            title="AI Insights"
            description="Platform-wide intelligence"
            icon="brain"
            tier="surface"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href={ROUTES.ADMIN_ANALYTICS}>
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              Anomaly detection, usage forecasting, churn prediction, and
              platform-wide recommendations powered by AI analytics.
            </p>
          </SectionCard>
        </GridItem>

        {/* Recent Activity — real feed */}
        <GridItem span={gridSpans.full}>
          <SectionCard
            title="Recent Activity"
            description="Latest platform-wide events"
            icon="clock"
            tier="surface"
            animate
          >
            {feedItems.length === 0 ? (
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
            )}
          </SectionCard>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  )
}
