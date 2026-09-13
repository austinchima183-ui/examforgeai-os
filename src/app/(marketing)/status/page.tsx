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
    'Live service health for ExamForge AI, measured from our own /api/health endpoint at page render time. No fabricated uptime or incidents.',
}

export const revalidate = 30 // re-fetch live health every 30s

// ============================================================================
// ExamForge AI — Status Page (REAL)
// ============================================================================
// RC1 reality audit: the previous version of this page listed fictional
// services (including a GraphQL API that does not exist), a fabricated
// 99.99% uptime figure, and three invented incident post-mortems.
// This version renders LIVE data fetched from our own /api/health
// endpoint at request time. We publish no uptime or incident history we
// have not actually measured.
// ============================================================================

interface HealthCheck {
  status: string
  latencyMs?: number
  message?: string
}

interface HealthPayload {
  status: string
  timestamp: string
  version: string
  uptime: number
  checks?: {
    database?: HealthCheck
    redis?: HealthCheck
    ai?: HealthCheck
  }
}

function colorFor(status: string | undefined): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600 dark:text-green-400'
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-destructive'
  }
}

function dotFor(status: string | undefined): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500'
    case 'degraded':
      return 'bg-yellow-500'
    default:
      return 'bg-red-500'
  }
}

export default async function StatusPage() {
  // Fetch our own live health endpoint — the same one monitoring uses.
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://web-alpha-bay-87.vercel.app'
  let health: HealthPayload | null = null
  let fetchOk = true
  try {
    const res = await fetch(`${base}/api/health`, { cache: 'no-store' })
    if (res.ok) health = (await res.json()) as HealthPayload
    else fetchOk = false
  } catch {
    fetchOk = false
  }

  const overall = fetchOk && health ? health.status : 'unreachable'
  const db = health?.checks?.database
  const ai = health?.checks?.ai
  const cache = health?.checks?.redis

  const services = [
    {
      name: 'Application Server',
      description: 'This web application (Next.js on Vercel)',
      status: fetchOk ? 'healthy' : 'unhealthy',
      detail: fetchOk ? `Responding — version ${health?.version ?? 'unknown'}` : 'Health endpoint unreachable',
    },
    {
      name: 'Database (Postgres)',
      description: 'Supabase Postgres — the system of record',
      status: db?.status ?? 'unhealthy',
      detail: db?.status === 'healthy' ? `Connected — ${db?.latencyMs ?? '?'}ms latency` : (db?.message ?? 'No data'),
    },
    {
      name: 'AI Engine',
      description: 'AI question generation and usage tracking',
      status: ai?.status ?? 'unhealthy',
      detail: ai?.message ?? 'No data',
    },
    {
      name: 'Cache Layer',
      description: 'In-memory caching (Supabase-only architecture)',
      status: cache?.status ?? 'unhealthy',
      detail: cache?.message ?? 'No data',
    },
  ]

  const checkedAt = health?.timestamp ? new Date(health.timestamp).toUTCString() : 'unknown'

  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Status', href: '/status' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              System Status — Live
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <GradientText preset="cool">Service Health</GradientText> Dashboard
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            This page is generated from our own{' '}
            <Link href="/api/health" className="text-primary underline underline-offset-4">
              /api/health
            </Link>{' '}
            endpoint at render time — not from hardcoded strings. We do not
            publish uptime percentages or incident history we have not
            measured with an independent monitor.
          </p>
        </div>
      </SectionWrapper>

      {/* Current Status Banner */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div
            className={`rounded-xl border p-6 text-center ${
              overall === 'healthy'
                ? 'border-emerald-500/30 bg-green-50 dark:bg-green-9500/5'
                : 'border-red-500/30 bg-red-50 dark:bg-red-9500/5'
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              {overall === 'healthy' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <h2
                className={`text-xl font-bold ${
                  overall === 'healthy'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600'
                }`}
              >
                {overall === 'healthy' ? 'All Systems Operational' : 'Degraded — See Services Below'}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Last checked: {checkedAt} (health payload generated). Process uptime:{' '}
              {health ? `${Math.floor(health.uptime / 60)} min` : 'unknown'}.
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
            Status of each ExamForge AI service, as reported by the live health
            endpoint right now.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/[0.04] bg-white/[0.01] text-sm font-medium text-muted-foreground">
              <span>Service</span>
              <span className="hidden sm:block">Detail</span>
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
                  <div>
                    <span className="font-medium text-sm block">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{service.description}</span>
                  </div>
                </div>
                <span className="hidden sm:block text-sm text-muted-foreground max-w-[260px]">
                  {service.detail}
                </span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${dotFor(service.status === 'healthy' ? 'healthy' : 'unhealthy')}`} />
                  <span className={`text-sm font-medium capitalize ${colorFor(service.status === 'healthy' ? 'healthy' : 'unhealthy')}`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Incident History — honest policy */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Incident History
            </h2>
          </div>
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-8">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
              We have not yet operated an independent uptime monitor or a
              public incident log, so we publish no historical incident or
              uptime statistics. When real incidents occur and are tracked,
              they will be reported here — with dates, causes, and resolutions
              we can stand behind. Anything less would be fiction.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Verify it yourself */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
            Verify It Yourself
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Don&apos;t take our word for it — query the same health endpoint
            this page uses and check the database, AI, and cache status
            yourself, any time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild>
              <Link href="/api/health">GET /api/health</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Engineering</Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
