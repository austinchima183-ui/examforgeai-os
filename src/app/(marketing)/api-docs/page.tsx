import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Code, ArrowRight, Key, Webhook, Shield,
  Zap, BookOpen, Terminal, Lock, Clock,
  CheckCircle2, GitBranch
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { DocsBreadcrumbs } from '@/components/docs/docs-breadcrumbs'
import { CodeBlock } from '@/components/docs/code-block'
import { EndpointBrowser } from '@/components/docs/endpoint-browser'
import {
  endpoints, sdks, webhookEvents, apiTags, getEndpointsByTag,
} from '@/content/api-reference'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ============================================================================
// ExamForge AI — Enhanced API Documentation
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'API Reference — ExamForge AI',
  description:
    'ExamForge AI RESTful API reference. Authentication, endpoints, webhooks, SDKs, and integration guides for developers building on the ExamForge AI platform.',
  path: '/api-docs',
})

// ─── Prepare endpoint tags with grouped data ───

const tagsWithEndpoints = apiTags.map((tag) => ({
  ...tag,
  endpoints: getEndpointsByTag(tag.slug),
})).filter((tag) => tag.endpoints.length > 0)

// ─── Rate limits data ───

const rateLimits = [
  { plan: 'Starter', requestsPerMin: '100', dailyQuota: '10,000', features: 'Core endpoints, basic analytics', price: '$49/mo' },
  { plan: 'Professional', requestsPerMin: '1,000', dailyQuota: '100,000', features: 'All endpoints, AI features, analytics', price: '$149/mo' },
  { plan: 'Enterprise', requestsPerMin: 'Custom', dailyQuota: 'Unlimited', features: 'All features, dedicated infrastructure, priority support', price: 'Custom' },
]

// ─── SDK status icon mapping ───

function getSdkStatusBadge(status: 'stable' | 'beta' | 'planned') {
  switch (status) {
    case 'stable':
      return <Badge className="bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800 text-[10px]">Stable</Badge>
    case 'beta':
      return <Badge className="bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">Beta</Badge>
    case 'planned':
      return <Badge variant="secondary" className="text-[10px]">Planned</Badge>
  }
}

function getSdkLanguageIcon(language: string): string {
  if (language.includes('TypeScript') || language.includes('JavaScript')) return '🟨'
  if (language.includes('Python')) return '🐍'
  if (language.includes('PHP')) return '🐘'
  if (language.includes('Go')) return '🔵'
  return '📦'
}

export default function ApiDocsPage() {
  return (
    <div className="pt-16">
      {/* Structured Data */}
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Resources', href: '/api-docs' }, { name: 'API Reference', href: '/api-docs' }]} />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <DocsBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/api-docs' }, { label: 'API Reference', href: '/api-docs' }]} />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Code className="h-3.5 w-3.5" />
            <span>API Reference</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Build on the{' '}
            <GradientText preset="cool">ExamForge AI platform</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            A powerful RESTful API with real-time webhooks, official SDKs, and
            comprehensive documentation. Integrate ExamForge AI into your existing
            systems in minutes, not months.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="shadow-md shadow-primary/25" asChild>
              <Link href="/register">
                Get API Key
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/docs">View Guides</Link>
            </Button>
          </div>
          {/* Quick Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              {endpoints.length}+ Endpoints
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              {sdks.length} Official SDKs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              {webhookEvents.length} Webhook Events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              99.9% Uptime SLA
            </span>
          </div>
        </div>
      </SectionWrapper>

      {/* Quick Start Code */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Quick Start</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Install the SDK, initialize with your API key, and make your first API call in under 2 minutes.
          </p>
          <div className="space-y-4 animate-fade-in">
            <CodeBlock
              code="npm install @examforge/sdk\n\n# or with yarn\nyarn add @examforge/sdk\n\n# or with pnpm\npnpm add @examforge/sdk"
              language="bash"
              filename="Install the SDK"
              showLineNumbers={false}
            />
            <CodeBlock
              code={`import { ExamForge } from '@examforge/sdk'

const client = new ExamForge({
  apiKey: process.env.EXAMFORGE_API_KEY,
})

// Generate AI questions
const questions = await client.ai.generateQuestions({
  subject: 'Mathematics',
  topic: 'Quadratic Equations',
  count: 20,
  difficulty: 'intermediate',
})

// Create an exam
const exam = await client.exams.create({
  title: 'Mid-Term Mathematics',
  questions: questions.data.map(q => q.id),
  duration: 60, // minutes
  settings: { shuffle: true, autoMark: true },
})

// Publish the exam to students
await client.exams.publish(exam.id)
console.log(\`Exam published with \${questions.data.length} questions\`)`}
              language="ts"
              filename="index.ts"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* Tabbed Endpoint Browser */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            API <GradientText preset="cool">Endpoints</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Explore our comprehensive RESTful API. Every endpoint is documented with
            request parameters, response schemas, and working code examples.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <EndpointBrowser tags={tagsWithEndpoints} />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8 max-w-3xl mx-auto">
          And 40+ more endpoints for students, exams, analytics, billing, and more.
          All endpoints support pagination, filtering, and consistent error handling.
        </p>
      </SectionWrapper>

      {/* SDKs */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Official <GradientText preset="primary">SDKs</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Use our official SDKs to integrate ExamForge AI into your application
            with idiomatic code in your preferred language.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          {sdks.map((sdk) => (
            <div
              key={sdk.name}
              className="rounded-xl border-white/[0.06] bg-card/80 p-6 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getSdkLanguageIcon(sdk.language)}</span>
                  <div>
                    <h3 className="text-base font-semibold">{sdk.language}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{sdk.name} v{sdk.version}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getSdkStatusBadge(sdk.status)}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={sdk.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${sdk.language} SDK on GitHub`}>
                      <GitBranch className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <CodeBlock
                code={sdk.installCommand}
                language="bash"
                filename="Install"
                showLineNumbers={false}
              />
              <div className="mt-3">
                <CodeBlock
                  code={sdk.quickStart}
                  language={sdk.language.includes('Python') ? 'py' : sdk.language.includes('Go') ? 'go' : sdk.language.includes('PHP') ? 'php' : 'ts'}
                  filename="Quick Start"
                  showLineNumbers
                />
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Webhooks */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Real-time <GradientText preset="warm">Webhooks</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Get instant notifications when key events occur. Configure webhook
            endpoints to receive real-time event payloads for automated workflows.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-4">
          {webhookEvents.map((wh) => (
            <div
              key={wh.event}
              className="rounded-xl border-white/[0.06] bg-card/50 p-5 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="font-mono text-xs text-primary">
                  {wh.event}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{wh.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock className="h-3 w-3" />
                <span>Trigger: {wh.triggerCondition}</span>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                  View payload example
                  <ChevronIcon className="h-3 w-3 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-3">
                  <CodeBlock
                    code={wh.payloadExample}
                    language="json"
                    filename="payload.json"
                    showLineNumbers={false}
                  />
                </div>
              </details>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Authentication Guide */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              <GradientText preset="cool">Authentication</GradientText>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              ExamForge AI supports two authentication methods to suit your security requirements.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Keys */}
            <div className="rounded-xl border-white/[0.06] bg-card/80 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-2">API Key Authentication</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Simple and fast. Include your API key in the request header for server-to-server
                communication. Ideal for backend integrations and scripts.
              </p>
              <CodeBlock
                code={`curl -X GET https://api.examforge.ai/v1/students \\
  -H "Authorization: Bearer ef_live_abc123..." \\
  -H "Content-Type: application/json"`}
                language="bash"
                showLineNumbers={false}
              />
            </div>
            {/* OAuth 2.0 */}
            <div className="rounded-xl border-white/[0.06] bg-card/80 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-2">OAuth 2.0 Flow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Industry-standard OAuth 2.0 with fine-grained permission scopes.
                Ideal for third-party applications and user-facing integrations
                that need delegated access.
              </p>
              <CodeBlock
                code={`// OAuth 2.0 Authorization Code Flow
const authUrl = client.auth.getAuthorizationUrl({
  scope: ['students:read', 'exams:read', 'exams:write'],
  redirect_uri: 'https://your-app.com/callback',
})

// Exchange code for tokens
const tokens = await client.auth.exchangeCode(code)`}
                language="ts"
                showLineNumbers={false}
              />
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Security best practice:</strong> Never expose your API keys in client-side code. Always use environment variables and route API calls through your backend server. All API traffic is encrypted with TLS 1.3.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Rate Limits */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Rate Limits &{' '}
            <GradientText preset="warm">Quotas</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Generous rate limits that scale with your plan. Rate limit headers are included in every response so you can build adaptive throttling.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
              <TableRow className="hover:bg-white/[0.02] transition-colors">
                <TableHead>Plan</TableHead>
                <TableHead>Requests / Min</TableHead>
                <TableHead>Daily Quota</TableHead>
                <TableHead className="hidden sm:table-cell">Features</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLimits.map((row) => (
                <TableRow key={row.plan}>
                  <TableCell className="font-semibold">{row.plan}</TableCell>
                  <TableCell className="font-mono">{row.requestsPerMin}</TableCell>
                  <TableCell className="font-mono">{row.dailyQuota}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{row.features}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{row.price}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p>
              <strong>Rate limit headers:</strong> Every response includes <code className="font-mono bg-muted px-1 rounded">X-RateLimit-Limit</code>,{' '}
              <code className="font-mono bg-muted px-1 rounded">X-RateLimit-Remaining</code>, and{' '}
              <code className="font-mono bg-muted px-1 rounded">X-RateLimit-Reset</code> headers. When rate limited, the API returns a <code className="font-mono bg-muted px-1 rounded">429 Too Many Requests</code> response.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}

// ─── Small helper component ───

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
