import { Suspense, createElement } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  TrendingUp,
  Calendar,
  Mail,
  MessageSquare,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchMarketingKPIs, fetchRecentActivities } from '@/lib/marketing-admin/data'
import { resolveIcon } from '@/lib/design/icon-registry'

// ============================================================================
// ExamForge AI — Marketing Dashboard (Admin)
// ============================================================================
// Server component showing marketing KPIs, pipeline funnel, and recent activity.
// ============================================================================

export const metadata = {
  title: 'Marketing Dashboard',
  description: 'Marketing KPIs, pipeline funnel, and recent activity for ExamForge AI.',
}

// ── Pipeline Stage Order & Colors ──

const pipelineStages = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
] as const

const stageColors: Record<string, string> = {
  new: 'bg-sky-500',
  contacted: 'bg-primary/100',
  qualified: 'bg-yellow-50 dark:bg-yellow-9500',
  proposal: 'bg-orange-500',
  negotiation: 'bg-rose-500',
  won: 'bg-green-50 dark:bg-green-9500',
  lost: 'bg-gray-400',
}

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

// ── KPI Card Component ──

function KPICard({
  title,
  value,
  icon,
  description,
  href,
}: {
  title: string
  value: number | string
  icon: string
  description?: string
  href?: string
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {(() => {
          const iconCmp = resolveIcon(icon)
          // createElement: resolveIcon returns stable module-scope refs — rendered as data
          return iconCmp ? createElement(iconCmp, { className: 'h-4 w-4 text-muted-foreground' }) : null
        })()}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// ── Skeleton Loader ──

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Dashboard Content (async) ──

async function DashboardContent() {
  const [kpis, recentActivities] = await Promise.all([
    fetchMarketingKPIs(),
    fetchRecentActivities(10),
  ])

  // Calculate max pipeline value for bar widths
  const pipelineValues = pipelineStages.map(
    (stage) => kpis.pipelineDistribution[stage] || 0
  )
  const maxPipeline = Math.max(...pipelineValues, 1)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads}
          icon="users"
          description="All time"
          href="/marketing/leads"
        />
        <KPICard
          title="New Leads This Week"
          value={kpis.newLeadsThisWeek}
          icon="user-plus"
          description="Last 7 days"
          href="/marketing/leads"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon="trending-up"
          description="Won / Total leads"
        />
        <KPICard
          title="Demo Bookings"
          value={kpis.demoBookingsThisWeek}
          icon="calendar"
          description="This week"
          href="/marketing/demos"
        />
        <KPICard
          title="Newsletter Subscribers"
          value={kpis.newsletterSubscribers}
          icon="mail"
          description="Active"
          href="/marketing/newsletter"
        />
        <KPICard
          title="Contact Submissions"
          value={kpis.contactSubmissionsThisWeek}
          icon="message-square"
          description="This week"
          href="/marketing/contacts"
        />
      </div>

      {/* Pipeline Funnel */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipelineStages.map((stage) => {
              const count = kpis.pipelineDistribution[stage] || 0
              const widthPercent = maxPipeline > 0 ? (count / maxPipeline) * 100 : 0
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-right">
                    {stageLabels[stage]}
                  </span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className={`h-full ${stageColors[stage]} rounded-md transition-all duration-500`}
                      style={{ width: `${widthPercent}%` }}
                    />
                    {count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="w-8 text-sm text-muted-foreground text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Link
              href="/marketing/leads"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all leads <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity found.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {activity.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Page Export ──

export default function MarketingDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Marketing Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of marketing performance, lead pipeline, and recent activity.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
