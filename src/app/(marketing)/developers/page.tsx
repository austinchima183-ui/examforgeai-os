import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Code, ArrowRight, Zap, BookOpen, Terminal,
  GitBranch, MessageCircle, ExternalLink,
  CheckCircle2, Download, Clock, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { CodeBlock } from '@/components/docs/code-block'
import { DeveloperCodeExamples } from '@/components/marketing/developer-code-examples'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Developer Resources Page
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Developer Resources — ExamForge AI',
  description:
    'Everything developers need to build on ExamForge AI. Quick start guides, code examples, SDK downloads, API rate limits, and community resources.',
  path: '/developers',
})

// ─── SDK Data ───

const sdkCards = [
  {
    language: 'JavaScript / TypeScript',
    emoji: '🟨',
    package: '@examforge/sdk',
    version: '3.2.0',
    status: 'stable' as const,
    install: 'npm install @examforge/sdk',
    github: 'https://github.com/examforgeai/sdk-js',
  },
  {
    language: 'Python',
    emoji: '🐍',
    package: 'examforge',
    version: '3.1.0',
    status: 'stable' as const,
    install: 'pip install examforge',
    github: 'https://github.com/examforgeai/sdk-python',
  },
  {
    language: 'PHP',
    emoji: '🐘',
    package: 'examforge/sdk',
    version: '2.0.0',
    status: 'beta' as const,
    install: 'composer require examforge/sdk',
    github: 'https://github.com/examforgeai/sdk-php',
  },
  {
    language: 'Go',
    emoji: '🔵',
    package: 'sdk-go',
    version: '1.0.0',
    status: 'beta' as const,
    install: 'go get github.com/examforgeai/sdk-go',
    github: 'https://github.com/examforgeai/sdk-go',
  },
]

function getSdkBadge(status: 'stable' | 'beta') {
  if (status === 'stable') {
    return <Badge className="bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800 text-[10px]">Stable</Badge>
  }
  return <Badge className="bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">Beta</Badge>
}

// ─── Rate Limits ───

const rateLimits = [
  { plan: 'Starter', requestsPerMin: '100', dailyQuota: '10,000', features: 'Core endpoints, basic analytics', price: '$49/mo' },
  { plan: 'Professional', requestsPerMin: '1,000', dailyQuota: '100,000', features: 'All endpoints, AI features, analytics', price: '$149/mo' },
  { plan: 'Enterprise', requestsPerMin: 'Custom', dailyQuota: 'Unlimited', features: 'All features, dedicated infrastructure, priority support', price: 'Custom' },
]

// ─── GitHub Repos ───

const githubRepos = [
  { name: 'examforgeai/sdk-js', description: 'Official JavaScript/TypeScript SDK', stars: '1.2k', lang: 'TypeScript' },
  { name: 'examforgeai/sdk-python', description: 'Official Python SDK', stars: '890', lang: 'Python' },
  { name: 'examforgeai/examples', description: 'Full working example apps and tutorials', stars: '340', lang: 'TypeScript' },
  { name: 'examforgeai/postman', description: 'Postman collection & environment', stars: '210', lang: 'JSON' },
]

export default function DevelopersPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/developers' },
          { name: 'Developer Resources', href: '/developers' },
        ]}
      />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Code className="h-3.5 w-3.5" />
            <span>Developer Resources</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Build on the{' '}
            <GradientText preset="cool">ExamForge AI Platform</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Everything you need to integrate ExamForge AI into your applications.
            Official SDKs, comprehensive API, real-time webhooks, and working code examples
            to get you started in minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="shadow-md shadow-primary/25" asChild>
              <Link href="/register">
                Get API Key
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/api-docs">API Reference</Link>
            </Button>
          </div>
          {/* Quick Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              20+ Endpoints
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              4 Official SDKs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              6 Webhook Events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              99.9% Uptime SLA
            </span>
          </div>
        </div>
      </SectionWrapper>

      {/* Quick Start */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
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

      {/* Code Examples Gallery */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Code <GradientText preset="cool">Examples</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Working code examples for common tasks. Switch between languages and
            categories to find exactly what you need.
          </p>
        </div>
        <DeveloperCodeExamples />
      </SectionWrapper>

      {/* SDK Downloads */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Official <GradientText preset="primary">SDKs</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Idiomatic SDKs for your preferred language. Type-safe, auto-documented,
            and fully tested.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sdkCards.map((sdk) => (
            <div
              key={sdk.language}
              className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sdk.emoji}</span>
                  <div>
                    <h3 className="text-base font-semibold">{sdk.language}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{sdk.package} v{sdk.version}</p>
                  </div>
                </div>
                {getSdkBadge(sdk.status)}
              </div>
              <div className="mb-4">
                <CodeBlock
                  code={sdk.install}
                  language="bash"
                  filename="Install"
                  showLineNumbers={false}
                />
              </div>
              <div className="mt-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <a href={sdk.github} target="_blank" rel="noopener noreferrer" aria-label={`View ${sdk.language} SDK on GitHub`}>
                    <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                    GitHub
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <Link href="/api-docs">
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                    Docs
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Postman Collection */}
      <SectionWrapper>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                <Terminal className="h-7 w-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                <GradientText preset="warm">Postman</GradientText> Collection
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Import our Postman collection to explore every API endpoint
                with pre-configured authentication, example request bodies,
                and response schemas. Get started testing in seconds.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>20+ pre-configured requests organized by resource</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Environment variables for live and test API keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Example request/response payloads for every endpoint</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Automated test scripts for common workflows</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <a
                    href="https://www.postman.com/examforgeai/examforge-ai-api/collection"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Import Collection
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/api-docs">View API Docs</Link>
                </Button>
              </div>
            </div>
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <CodeBlock
                code={`# Import via Postman URL
1. Open Postman
2. Click Import → Link
3. Paste: https://www.postman.com/examforgeai/examforge-ai-api/collection

# Or run with Newman CLI
npm install -g newman
newman run examforge-ai-api.json \\
  --environment examforge-env.json \\
  --reporters cli,json`}
                language="bash"
                filename="Import Steps"
                showLineNumbers={false}
              />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* GitHub Examples */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Open Source on{' '}
            <GradientText preset="cool">GitHub</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            All our SDKs and example applications are open source. Explore, contribute,
            and fork to customize for your school.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-4">
          {githubRepos.map((repo) => (
            <a
              key={repo.name}
              href={`https://github.com/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D1D1D] text-foreground">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-mono group-hover:text-primary transition-colors">{repo.name}</p>
                  <p className="text-xs text-muted-foreground">{repo.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {repo.lang}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {repo.stars}
                </span>
                <ExternalLink className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      </SectionWrapper>

      {/* Developer Community */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Developer <GradientText preset="primary">Community</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Get help, share your projects, and connect with other developers building
            on ExamForge AI.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-4">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">GitHub Discussions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Ask questions, share integration patterns, and collaborate with the community
              on GitHub Discussions. Maintainers actively respond to help requests.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com/examforgeai/sdk-js/discussions" target="_blank" rel="noopener noreferrer">
                Join Discussions
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          </div>
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-4">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369c-1.025-.403-2.104-.695-3.224-.868a.076.076 0 0 0-.079.038c-.14.25-.293.492-.458.726a12.5 12.5 0 0 0-3.856-.568c-1.322 0-2.62.178-3.856.568-.166-.234-.32-.476-.46-.726a.076.076 0 0 0-.078-.038 12.3 12.3 0 0 0-3.224.868 5.77 5.77 0 0 0-.357.528C.638 8.175.17 12.16.17 12.16s.472 3.988 3.478 6.843c.126.144.25.288.38.428 1.74 1.634 3.856 2.57 6.17 2.784.21.024.418.036.627.036h.036c.21 0 .418-.012.627-.036 2.314-.214 4.43-1.15 6.17-2.784.13-.14.254-.284.38-.428 3.006-2.855 3.478-6.843 3.478-6.843s-.468-3.985-3.728-7.264a5.77 5.77 0 0 0-.357-.528zM8.08 15.336c-.776 0-1.408-.712-1.408-1.592s.62-1.592 1.408-1.592c.788 0 1.42.712 1.42 1.592s-.632 1.592-1.42 1.592zm7.856 0c-.776 0-1.408-.712-1.408-1.592s.62-1.592 1.408-1.592c.788 0 1.42.712 1.42 1.592s-.632 1.592-1.42 1.592z" /></svg>
            </div>
            <h3 className="text-base font-semibold mb-2">Discord</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Real-time chat with developers and the ExamForge AI team. Get instant help
              with integration questions, share your projects, and stay updated on API changes.
            </p>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
        </div>
      </SectionWrapper>

      {/* API Rate Limits */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Rate Limits &{' '}
            <GradientText preset="warm">Quotas</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Generous rate limits that scale with your plan. Rate limit headers are included
            in every response so you can build adaptive throttling.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
          <div className="mt-4 p-3 rounded-lg bg-[#1D1D1D]/50 text-xs text-muted-foreground">
            <p>
              <strong>Rate limit headers:</strong> Every response includes{' '}
              <code className="font-mono bg-[#1D1D1D] px-1 rounded">X-RateLimit-Limit</code>,{' '}
              <code className="font-mono bg-[#1D1D1D] px-1 rounded">X-RateLimit-Remaining</code>, and{' '}
              <code className="font-mono bg-[#1D1D1D] px-1 rounded">X-RateLimit-Reset</code> headers.
              When rate limited, the API returns a{' '}
              <code className="font-mono bg-[#1D1D1D] px-1 rounded">429 Too Many Requests</code> response.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
