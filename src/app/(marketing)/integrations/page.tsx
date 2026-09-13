import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Plug, CreditCard, Mail, MessageSquare, Webhook, Zap,
  Database, Code, BarChart3, GraduationCap, BookOpen,
  ExternalLink, CheckCircle2, ArrowRight, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { IntegrationFilter } from '@/components/marketing/integration-filter'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Enhanced Integrations Page
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Integrations — ExamForge AI',
  description:
    'ExamForge AI integrates with the tools your school already uses. Connect Student Information Systems, communication tools, productivity suites, payment gateways, and analytics platforms.',
  path: '/integrations',
})

// ─── Integration Categories ───

const categories = [
  {
    label: 'Student Information Systems',
    icon: 'GraduationCap',
    slug: 'sis',
  },
  {
    label: 'Communication',
    icon: 'MessageSquare',
    slug: 'communication',
  },
  {
    label: 'Productivity',
    icon: 'BookOpen',
    slug: 'productivity',
  },
  {
    label: 'Payment',
    icon: 'CreditCard',
    slug: 'payment',
  },
  {
    label: 'Analytics',
    icon: 'BarChart3',
    slug: 'analytics',
  },
  {
    label: 'Custom API',
    icon: 'Code',
    slug: 'developer',
  },
]

// ─── Integrations Data ───

type IntegrationStatus = 'available' | 'beta' | 'coming_soon'

export interface IntegrationItem {
  icon: string
  name: string
  description: string
  category: string
  categorySlug: string
  status: IntegrationStatus
  details: string
  docsLink?: string
}

export const integrations: IntegrationItem[] = [
  {
    icon: 'Database',
    name: 'Supabase',
    description: 'Our entire data layer: Postgres database, authentication, row-level security, storage, and edge functions. Live in production today.',
    category: 'Core Infrastructure',
    categorySlug: 'infrastructure',
    status: 'available',
    details: '270 tables all protected by row-level security, 700+ scoped policies, managed auth with 2FA support, 14 deployed edge functions.',
    docsLink: 'https://supabase.com/docs',
  },
  {
    icon: 'Sparkles',
    name: 'Google Gemini (AI)',
    description: 'AI question generation, teacher assistance, and student tutoring — powered by Gemini and verified live in production.',
    category: 'Artificial Intelligence',
    categorySlug: 'ai',
    status: 'available',
    details: 'Real, quota-tracked AI generation through secured edge functions with per-role usage analytics. Every request is logged.',
    docsLink: '/features',
  },
  {
    icon: 'CreditCard',
    name: 'Flutterwave',
    description: 'Payment processing for subscriptions and fees — checkout, invoices, and HMAC-verified webhooks, built for African payment methods.',
    category: 'Payment',
    categorySlug: 'payment',
    status: 'beta',
    details: 'Checkout and webhook rails are live and verified. End-to-end production transactions are being validated with pilot schools before full release.',
    docsLink: '/pricing',
  },
  {
    icon: 'Webhook',
    name: 'Custom Webhooks',
    description: 'HMAC-verified webhook endpoints for billing and marketplace events, with signature validation on every delivery.',
    category: 'Custom API',
    categorySlug: 'developer',
    status: 'available',
    details: 'Billing and marketplace webhook routes with HMAC signature verification, retry handling, and delivery logging.',
    docsLink: '/api-docs',
  },
  {
    icon: 'Code',
    name: 'REST API',
    description: '150 API endpoints across the platform — question banks, exams, results, analytics, and administration — with an OpenAPI endpoint.',
    category: 'Custom API',
    categorySlug: 'developer',
    status: 'available',
    details: 'Role-scoped REST API with server-side RBAC enforcement, rate limiting, Zod input validation, and a machine-readable OpenAPI endpoint at /api/developer/openapi.',
    docsLink: '/api-docs',
  },
  {
    icon: 'Mail',
    name: 'Resend (Email)',
    description: 'Transactional email for notifications and account flows. Code and credentials are wired; production delivery is in final validation.',
    category: 'Communication',
    categorySlug: 'communication',
    status: 'coming_soon',
    details: 'Email service integration is implemented and configured; delivery pipelines are being exercised with pilot traffic before being marked available.',
  },
  {
    icon: 'CreditCard',
    name: 'Paystack',
    description: 'Secondary payment provider support with a dedicated HMAC-verified webhook route.',
    category: 'Payment',
    categorySlug: 'payment',
    status: 'coming_soon',
    details: 'Route-level support exists; live-key end-to-end validation is pending before this graduates to available.',
  },
]

function getStatusBadge(status: IntegrationStatus) {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800 text-[10px]">Available</Badge>
    case 'beta':
      return <Badge className="bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">Beta</Badge>
    case 'coming_soon':
      return <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
  }
}

export default function IntegrationsPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Products', href: '/integrations' },
          { name: 'Integrations', href: '/integrations' },
        ]}
      />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Plug className="h-3.5 w-3.5" />
            <span>Integrations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Connect ExamForge AI{' '}
            <GradientText preset="cool">with Your Tools</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            ExamForge AI doesn&apos;t ask you to replace your existing systems — it connects
            to them. From student information systems to payment gateways, our integrations
            ensure a seamless workflow across your entire educational technology stack.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              {integrations.filter((i) => i.status === 'available').length} Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              {integrations.filter((i) => i.status === 'beta').length} In Beta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {integrations.filter((i) => i.status === 'coming_soon').length} Coming Soon
            </span>
          </div>
        </div>
      </SectionWrapper>

      {/* Integration Categories */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Integration <GradientText preset="primary">Categories</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Explore integrations by category to find the connections that matter most
            to your institution.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const IconMap: Record<string, React.ComponentType<{ className?: string }>> = { GraduationCap, MessageSquare, BookOpen, CreditCard, BarChart3, Code }
            const Icon = IconMap[category.icon] || Code
            const count = integrations.filter((i) => i.categorySlug === category.slug).length
            return (
              <div
                key={category.slug}
                className="text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200"
              >
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold leading-tight">{category.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{count} integration{count !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Filtered Integration Cards */}
      <SectionWrapper>
        <IntegrationFilter integrations={integrations} />
      </SectionWrapper>

      {/* Build Your Own Integration */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
              <Code className="h-7 w-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Build your own integrations with the{' '}
              <GradientText preset="cool">ExamForge AI API</GradientText>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our RESTful API gives you programmatic access to every feature in the
              platform. Create custom integrations, automate workflows, and build
              specialized tools that connect ExamForge AI to your school&apos;s unique
              technology ecosystem. Full OpenAPI 3.0 documentation, SDKs for four
              major languages, and dedicated developer support make integration
              development fast and reliable.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/api-docs">
                  View API Documentation
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/developers">Developer Resources</Link>
              </Button>
            </div>
          </div>
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
            <div className="space-y-3 animate-fade-in">
              {[
                'OpenAPI 3.0 Specification',
                'OAuth 2.0 & API Key Authentication',
                'Webhook Event Subscriptions',
                'SDKs: TypeScript · Python · PHP · Go',
                'Rate Limiting with Burst Allowances',
                'Postman Collection & Environment',
                '99.9% API Uptime SLA',
                'Dedicated Developer Support',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
