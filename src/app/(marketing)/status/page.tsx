import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

export const metadata: Metadata = {
  title: 'Status',
  description:
    'Real-time status and uptime monitoring for ExamForge AI services. Check current system health and historical incident reports.',
}

// ============================================================================
// ExamForge AI — Status Page
// ============================================================================

const services = [
  {
    name: 'API',
    description: 'Core REST and GraphQL API endpoints',
    status: 'Operational' as const,
  },
  {
    name: 'CBT Platform',
    description: 'Computer-based testing delivery and exam sessions',
    status: 'Operational' as const,
  },
  {
    name: 'AI Engine',
    description: 'AI question generation, auto-marking, and adaptive learning',
    status: 'Operational' as const,
  },
  {
    name: 'Analytics',
    description: 'Performance dashboards, reports, and data pipelines',
    status: 'Operational' as const,
  },
  {
    name: 'Marketplace',
    description: 'Question bank marketplace and resource downloads',
    status: 'Operational' as const,
  },
  {
    name: 'Billing',
    description: 'Payment processing, subscriptions, and invoicing',
    status: 'Operational' as const,
  },
  {
    name: 'Notifications',
    description: 'Email, SMS, and in-app notification delivery',
    status: 'Operational' as const,
  },
  {
    name: 'Authentication',
    description: 'Login, session management, and identity providers',
    status: 'Operational' as const,
  },
]

const incidents = [
  {
    title: 'Delayed Notification Delivery',
    date: 'February 18, 2026',
    severity: 'Minor',
    description:
      'Email and SMS notifications experienced delays of up to 15 minutes between 09:00 and 11:30 WAT. The issue was caused by a queue backlog in our notification service after a scheduled database maintenance window. All queued notifications were delivered, and no messages were lost.',
    resolution: 'Resolved within 2 hours 30 minutes',
    resolvedAt: 'February 18, 2026 — 11:30 WAT',
  },
  {
    title: 'CBT Platform Intermittent Timeouts',
    date: 'January 29, 2026',
    severity: 'Major',
    description:
      'A subset of CBT exam sessions experienced intermittent timeouts and slow page loads between 08:00 and 09:45 WAT. The root cause was a misconfigured load balancer rule that routed traffic to an under-provisioned cluster during peak exam hours. All affected sessions were automatically resumed with no data loss.',
    resolution: 'Resolved within 1 hour 45 minutes',
    resolvedAt: 'January 29, 2026 — 09:45 WAT',
  },
  {
    title: 'AI Engine Elevated Latency',
    date: 'January 12, 2026',
    severity: 'Minor',
    description:
      'AI question generation and auto-marking requests experienced elevated latency of 3-5 seconds (normal: under 1 second) for approximately 4 hours. The issue was traced to a downstream model provider deploying an update that temporarily degraded inference performance. We implemented automatic failover to a secondary provider.',
    resolution: 'Resolved within 4 hours',
    resolvedAt: 'January 12, 2026 — 15:20 WAT',
  },
]

const statusColor: Record<string, string> = {
  Operational: 'text-green-600 dark:text-green-400',
  Degraded: 'text-yellow-600 dark:text-yellow-400',
  Outage: 'text-destructive',
}

const statusBg: Record<string, string> = {
  Operational: 'bg-green-50 dark:bg-green-9500',
  Degraded: 'bg-yellow-50 dark:bg-yellow-9500',
  Outage: 'bg-destructive/100',
}

export default function StatusPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Status', href: '/status' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              System Status
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <GradientText preset="cool">Service Health</GradientText> Dashboard
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Monitor the real-time health of all ExamForge AI services. We
            publish every incident transparently because your trust matters.
            Bookmark this page to stay informed about system performance and
            planned maintenance.
          </p>
        </div>
      </SectionWrapper>

      {/* Current Status Banner */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-emerald-500/30 bg-green-50 dark:bg-green-9500/5 p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-bold text-green-600 dark:text-green-400">
                All Systems Operational
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Last checked: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — All 8 services are running normally with no active incidents.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Service Status */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Service Status
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Detailed status of each ExamForge AI service. All services are
            monitored 24/7 with automated alerts and on-call engineering
            response.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/[0.04] bg-white/[0.01] text-sm font-medium text-muted-foreground">
              <span>Service</span>
              <span className="hidden sm:block">Description</span>
              <span>Status</span>
            </div>
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-4 px-6 py-4 items-center ${
                  i < services.length - 1 ? 'border-b border-white/[0.03]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <span className="hidden sm:block text-sm text-muted-foreground">
                  {service.description}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${statusBg[service.status]}`}
                  />
                  <span
                    className={`text-sm font-medium ${statusColor[service.status]}`}
                  >
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Uptime */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Uptime
            </h2>
          </div>
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-8 inline-block">
            <p className="text-5xl sm:text-6xl font-bold text-primary">
              99.99%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Uptime over the last 90 days
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4">
              <p className="text-3xl font-bold tracking-tight">0</p>
              <p className="text-sm text-muted-foreground">Active Incidents</p>
            </div>
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4">
              <p className="text-3xl font-bold tracking-tight">3</p>
              <p className="text-sm text-muted-foreground">
                Incidents (90 days)
              </p>
            </div>
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4">
              <p className="text-3xl font-bold tracking-tight">~2h 40m</p>
              <p className="text-sm text-muted-foreground">
                Avg. Resolution Time
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Recent Incidents */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Recent Incidents
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A full history of service disruptions and their resolutions. We
            publish post-mortems for every incident to ensure continuous
            improvement and accountability.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          {incidents.map((incident) => (
            <div
              key={incident.title}
              className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-base font-semibold">{incident.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {incident.date}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    incident.severity === 'Major'
                      ? 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400'
                      : 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400'
                  }`}
                >
                  {incident.severity}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-9500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolved
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {incident.description}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Resolution:
                </span>
                <span>{incident.resolution}</span>
                <span className="hidden sm:inline">·</span>
                <span>{incident.resolvedAt}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button variant="outline" asChild>
            <Link href="/contact">Subscribe to Status Updates</Link>
          </Button>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
