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
    icon: 'GraduationCap',
    name: 'Moodle',
    description: 'Sync courses, quizzes, and grades between Moodle and ExamForge AI. Students access ExamForge exams directly within Moodle\'s interface with SSO support.',
    category: 'Student Information Systems',
    categorySlug: 'sis',
    status: 'available',
    details: 'LTI 1.3 integration, Moodle quiz import/export, grade passback, user synchronization, and SSO via Moodle authentication.',
    docsLink: '/docs/integrations/moodle',
  },
  {
    icon: 'GraduationCap',
    name: 'Canvas LMS',
    description: 'Deep integration with Canvas LMS for seamless exam delivery, grade synchronization, and course content sharing.',
    category: 'Student Information Systems',
    categorySlug: 'sis',
    status: 'beta',
    details: 'Canvas API integration, external tool registration, grade passback via LTI, assignment creation, and roster sync.',
    docsLink: '/docs/integrations/canvas',
  },
  {
    icon: 'Mail',
    name: 'Google Workspace',
    description: 'Sync your school\'s Google Workspace with ExamForge AI for SSO authentication, Drive file picker for question attachments, and Calendar sync for exam scheduling.',
    category: 'Productivity',
    categorySlug: 'productivity',
    status: 'available',
    details: 'Google SSO, Google Drive file picker, Google Calendar sync, Gmail integration for automated notifications, and Classroom grade passback.',
    docsLink: '/docs/integrations/google-workspace',
  },
  {
    icon: 'Mail',
    name: 'Microsoft 365',
    description: 'Connect with your institution\'s Microsoft 365 environment. Azure AD SSO, Teams notifications, OneDrive integration, and Outlook calendar sync.',
    category: 'Productivity',
    categorySlug: 'productivity',
    status: 'available',
    details: 'Azure AD SSO, Microsoft Teams bot, OneDrive file management, Outlook calendar sync, and SharePoint document library access.',
    docsLink: '/docs/integrations/microsoft-365',
  },
  {
    icon: 'MessageSquare',
    name: 'WhatsApp',
    description: 'Reach parents and students where they already are. Send exam reminders, result notifications, and announcements directly through WhatsApp.',
    category: 'Communication',
    categorySlug: 'communication',
    status: 'available',
    details: 'WhatsApp Business API, automated message templates, parent notification workflows, and two-way messaging for support.',
    docsLink: '/docs/integrations/whatsapp',
  },
  {
    icon: 'MessageSquare',
    name: 'Slack',
    description: 'Real-time Slack notifications for exam completion alerts, grading assignments, system health updates, and administrative notifications.',
    category: 'Communication',
    categorySlug: 'communication',
    status: 'available',
    details: 'Configurable webhook notifications, channel-based routing, daily summary digests, and interactive message buttons.',
    docsLink: '/docs/integrations/slack',
  },
  {
    icon: 'CreditCard',
    name: 'Flutterwave',
    description: 'Accept tuition payments, subscription fees, and exam registration charges across 20+ African currencies with support for bank transfers, cards, mobile money, and USSD.',
    category: 'Payment',
    categorySlug: 'payment',
    status: 'available',
    details: 'Automated invoice generation, payment tracking, reconciliation dashboards, multi-currency support, and real-time payment confirmation.',
    docsLink: '/docs/integrations/flutterwave',
  },
  {
    icon: 'BarChart3',
    name: 'Power BI',
    description: 'Connect ExamForge AI data directly to Microsoft Power BI for advanced analytics dashboards, custom visualizations, and institutional reporting.',
    category: 'Analytics',
    categorySlug: 'analytics',
    status: 'beta',
    details: 'Power BI data connector, pre-built report templates, real-time dataset refresh, and custom DAX measures for institutional KPIs.',
    docsLink: '/docs/integrations/power-bi',
  },
  {
    icon: 'Webhook',
    name: 'Custom Webhooks',
    description: 'Receive real-time event notifications for exam completions, student registrations, payment events, and AI question generation. Build custom workflows with any service.',
    category: 'Custom API',
    categorySlug: 'developer',
    status: 'available',
    details: '6 event types, configurable retry logic, signature verification, event delivery logs, and batch event processing.',
    docsLink: '/api-docs',
  },
  {
    icon: 'Code',
    name: 'REST API',
    description: 'Full programmatic access to every feature — from question bank management and exam creation to result processing and analytics. OpenAPI 3.0 specification with SDKs for 4 languages.',
    category: 'Custom API',
    categorySlug: 'developer',
    status: 'available',
    details: 'OpenAPI 3.0 spec, OAuth 2.0 authentication, rate limiting, webhook events, and SDKs for JavaScript, Python, PHP, and Go.',
    docsLink: '/api-docs',
  },
  {
    icon: 'Zap',
    name: 'Zapier',
    description: 'Connect ExamForge AI to over 5,000 apps without writing code. Create custom workflows triggered by exam events, result publications, or student enrollments.',
    category: 'Productivity',
    categorySlug: 'productivity',
    status: 'available',
    details: 'Pre-built Zap templates, custom trigger and action configuration, multi-step Zaps, and webhook support for advanced use cases.',
    docsLink: '/docs/integrations/zapier',
  },
  {
    icon: 'Database',
    name: 'Google BigQuery',
    description: 'Export ExamForge AI analytics data to Google BigQuery for advanced analytics, machine learning, and cross-platform data analysis.',
    category: 'Analytics',
    categorySlug: 'analytics',
    status: 'coming_soon',
    details: 'Scheduled data exports, incremental sync, schema documentation, and SQL query examples for common analytics workflows.',
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
