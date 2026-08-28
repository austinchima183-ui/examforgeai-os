import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import {
  BookOpen, MonitorPlay, Users, BarChart3, Bot,
  CreditCard, MessageSquare, ArrowRight, FileText,
  Code, GraduationCap, Settings, Shield, Zap,
  PlayCircle, Puzzle, Globe, Database, Terminal, Webhook
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { HowToJsonLd } from '@/components/seo/howto-jsonld'
import { DocsBreadcrumbs } from '@/components/docs/docs-breadcrumbs'
import { DocsSearchBar } from '@/components/docs/docs-search-bar'
import { RoleQuickLinks } from '@/components/docs/role-quick-links'
import { InteractiveWalkthrough } from '@/components/docs/interactive-walkthrough'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Enhanced Documentation Center
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Documentation — ExamForge AI',
  description:
    'Comprehensive guides, tutorials, and API references for ExamForge AI. Learn how to set up, configure, and master every feature of the AI operating system for modern schools.',
  path: '/docs',
})

// ─── Data ───

const docCategories = [
  {
    icon: 'graduation-cap',
    title: 'Getting Started',
    description: 'Quick setup guides to get your school up and running with ExamForge AI in minutes.',
    articles: 12,
    links: [
      { label: 'Quick Start Guide', href: '/docs' },
      { label: 'Account Setup', href: '/docs' },
      { label: 'School Onboarding', href: '/docs' },
      { label: 'Importing Student Data', href: '/docs' },
      { label: 'First Exam Setup', href: '/docs' },
    ],
  },
  {
    icon: 'monitor-play',
    title: 'CBT Platform',
    description: 'Everything you need to create, deliver, and grade computer-based examinations.',
    articles: 24,
    links: [
      { label: 'Creating an Exam', href: '/docs' },
      { label: 'Question Types & Formats', href: '/docs' },
      { label: 'Live Monitoring', href: '/docs' },
      { label: 'Auto-Marking Configuration', href: '/docs' },
      { label: 'Result Processing', href: '/docs' },
    ],
  },
  {
    icon: 'bot',
    title: 'AI Features',
    description: 'Harness AI-powered question generation, auto-marking, and predictive analytics.',
    articles: 18,
    links: [
      { label: 'AI Question Generation', href: '/docs' },
      { label: 'AI Auto-Marking', href: '/docs' },
      { label: 'AI Assistant', href: '/docs' },
      { label: 'Predictive Analytics', href: '/docs' },
      { label: 'Custom AI Training', href: '/docs' },
    ],
  },
  {
    icon: 'users',
    title: 'Student Management',
    description: 'Manage student profiles, enrollment, attendance, grades, and parent communication.',
    articles: 15,
    links: [
      { label: 'Student Enrollment', href: '/docs' },
      { label: 'Attendance Tracking', href: '/docs' },
      { label: 'Grade Management', href: '/docs' },
      { label: 'Parent Portal', href: '/docs' },
      { label: 'Health Records', href: '/docs' },
    ],
  },
  {
    icon: 'bar-chart-3',
    title: 'Analytics & Reports',
    description: 'Build dashboards, generate reports, and gain insights from your school data.',
    articles: 10,
    links: [
      { label: 'Dashboard Overview', href: '/docs' },
      { label: 'Custom Report Builder', href: '/docs' },
      { label: 'Performance Analytics', href: '/docs' },
      { label: 'Exporting Data', href: '/docs' },
      { label: 'Scheduled Reports', href: '/docs' },
    ],
  },
  {
    icon: 'settings',
    title: 'Administration',
    description: 'Configure school settings, manage users, roles, permissions, and integrations.',
    articles: 13,
    links: [
      { label: 'School Settings', href: '/docs' },
      { label: 'User Roles & Permissions', href: '/docs' },
      { label: 'Timetable Management', href: '/docs' },
      { label: 'Billing & Payments', href: '/docs' },
      { label: 'Notification Preferences', href: '/docs' },
    ],
  },
  {
    icon: 'shield',
    title: 'Security & Compliance',
    description: 'Data protection, privacy controls, audit logs, and compliance documentation.',
    articles: 8,
    links: [
      { label: 'Security Overview', href: '/docs' },
      { label: 'Data Encryption', href: '/docs' },
      { label: 'Audit Logging', href: '/docs' },
      { label: 'GDPR Compliance', href: '/docs' },
      { label: 'Access Control', href: '/docs' },
    ],
  },
  {
    icon: 'code',
    title: 'API Reference',
    description: 'RESTful API documentation for developers building custom integrations.',
    articles: 40,
    links: [
      { label: 'API Overview', href: '/api-docs' },
      { label: 'Authentication', href: '/api-docs' },
      { label: 'Endpoints Reference', href: '/api-docs' },
      { label: 'Webhooks', href: '/api-docs' },
      { label: 'SDKs & Libraries', href: '/api-docs' },
    ],
  },
]

const quickStartCards = [
  { icon: 'zap', label: 'Quick Start', desc: 'Get started in 5 minutes', href: '/docs', color: 'text-yellow-600 dark:text-yellow-400' },
  { icon: 'code', label: 'API Reference', desc: 'RESTful API docs', href: '/api-docs', color: 'text-primary' },
  { icon: 'file-text', label: 'Guides', desc: 'Step-by-step tutorials', href: '/docs', color: 'text-green-600 dark:text-green-400' },
  { icon: 'message-square', label: 'Community', desc: 'Get help from others', href: '/docs', color: 'text-purple-600 dark:text-purple-400' },
]

const popularArticles = [
  { title: 'How to Create Your First CBT Exam', category: 'CBT Platform', readTime: '5 min', views: '12.4K' },
  { title: 'AI Question Generation: Complete Guide', category: 'AI Features', readTime: '8 min', views: '9.8K' },
  { title: 'Setting Up Anti-Cheating Measures', category: 'CBT Platform', readTime: '6 min', views: '8.2K' },
  { title: 'Importing Students via CSV', category: 'Student Management', readTime: '4 min', views: '7.5K' },
  { title: 'OAuth 2.0 Authentication Guide', category: 'API Reference', readTime: '10 min', views: '6.1K' },
  { title: 'Configuring Webhook Notifications', category: 'API Reference', readTime: '7 min', views: '5.3K' },
]

const videoTutorials = [
  { title: 'Getting Started with ExamForge AI', duration: '12:34', description: 'Complete platform walkthrough from signup to your first exam.' },
  { title: 'AI Question Generation Deep Dive', duration: '18:22', description: 'Learn how to generate curriculum-aligned questions using AI.' },
  { title: 'Setting Up Live Exam Monitoring', duration: '9:15', description: 'Monitor students in real-time during CBT exams.' },
  { title: 'Building Custom Reports', duration: '14:08', description: 'Create custom analytics reports and schedule automated delivery.' },
]

const integrationGuides = [
  { icon: 'globe', title: 'Google Workspace', description: 'Sync calendars, share to Google Classroom, and authenticate with Google SSO.', status: 'Available' },
  { icon: 'database', title: 'Microsoft 365', description: 'Integrate with Teams, OneDrive, and Active Directory for seamless school IT.', status: 'Available' },
  { icon: 'webhook', title: 'Custom Webhooks', description: 'Receive real-time event notifications for exam completions, payments, and more.', status: 'Available' },
  { icon: 'terminal', title: 'REST API', description: 'Build custom integrations with our comprehensive RESTful API and official SDKs.', status: 'Available' },
  { icon: 'puzzle', title: 'Flutterwave Payments', description: 'Process school fee payments with Flutterwave — cards, bank transfer, mobile money.', status: 'Available' },
  { icon: 'database', title: 'Power BI / Tableau', description: 'Connect ExamForge data to your business intelligence tools for advanced analytics.', status: 'Beta' },
]

const gettingStartedSteps = [
  {
    title: 'Create Your School Account',
    description: 'Sign up at examforge.ai and set up your school profile including name, logo, address, and academic calendar. Choose your subscription plan to unlock features.',
    code: `// After signup, configure your school
const school = await client.schools.update({
  name: 'Grace International School',
  logo_url: 'https://cdn.example.com/grace-logo.png',
  academic_calendar: {
    session: '2025/2026',
    terms: ['First Term', 'Second Term', 'Third Term'],
  },
})`,
  },
  {
    title: 'Import Your Student Data',
    description: 'Upload your existing student records via CSV or enter them manually. The platform automatically creates student profiles, assigns classes, and generates login credentials.',
    code: `// Import students from CSV
const result = await client.students.bulkImport({
  file: './students.csv',
  mapping: {
    first_name: 'FirstName',
    last_name: 'LastName',
    admission_number: 'AdmNo',
    class: 'ClassName',
  },
})
console.log(\`Imported \${result.successful} students\`)`,
  },
  {
    title: 'Create Your First Exam',
    description: 'Use the exam wizard to create your first CBT exam. You can manually add questions, import from the question bank, or use AI to generate questions from any topic and curriculum.',
    code: `// Generate AI questions and create exam
const questions = await client.ai.generateQuestions({
  subject: 'Mathematics',
  topic: 'Quadratic Equations',
  count: 40,
  difficulty: 'intermediate',
  curriculum: 'WAEC',
})

const exam = await client.exams.create({
  title: 'Mid-Term Mathematics SS2',
  questions: questions.data.map(q => q.id),
  duration_minutes: 60,
  settings: { shuffle: true, auto_mark: true },
})`,
  },
  {
    title: 'Publish and Monitor',
    description: 'Publish your exam to make it available to students. Use the live monitoring dashboard to track student progress, detect irregularities, and ensure exam integrity in real-time.',
    code: `// Publish the exam
await client.exams.publish(exam.id)

// Monitor live sessions
const sessions = await client.exams.listSessions(exam.id, {
  status: 'in_progress',
})
sessions.data.forEach(s => {
  console.log(\`\${s.student.name}: \${s.progress}% complete\`)
})`,
  },
]

export default function DocsPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      {/* Structured Data */}
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Resources', href: '/docs' }, { name: 'Documentation', href: '/docs' }]} />
      <OrganizationJsonLd />
      <HowToJsonLd
        name="Getting Started with ExamForge AI"
        description="Step-by-step guide to set up your school, import students, and create your first CBT exam."
        steps={gettingStartedSteps.map((s) => ({ name: s.title, text: s.description }))}
      />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <DocsBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/docs' }, { label: 'Documentation', href: '/docs' }]} />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything you need to{' '}
            <GradientText preset="primary">master ExamForge AI</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Comprehensive guides, tutorials, and API references to help you get the most
            out of ExamForge AI. From quick setup to advanced configurations, we have
            you covered.
          </p>
          <div className="mt-8">
            <DocsSearchBar />
          </div>
        </div>
      </SectionWrapper>

      {/* Quick Start Cards */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStartCards.map((item) => {
            const Icon = resolveIcon(item.icon) ?? Zap
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4 text-left hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300"
              >
                <Icon className={`h-5 w-5 mb-2 ${item.color}`} />
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </Link>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Documentation Categories */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Documentation <GradientText preset="cool">Categories</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Explore our comprehensive documentation organized by feature area. Each category contains detailed guides, tutorials, and references.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docCategories.map((category) => {
            const Icon = resolveIcon(category.icon) ?? Zap
            return (
              <div
                key={category.title}
                className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{category.title}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {category.articles} articles
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {category.description}
                </p>
                <ul className="space-y-2 animate-fade-in">
                  {category.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Getting Started Walkthrough */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Zap className="h-3.5 w-3.5" />
              <span>Interactive Walkthrough</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Getting Started in{' '}
              <GradientText preset="warm">4 Easy Steps</GradientText>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Follow this interactive walkthrough to set up your school and deliver your first CBT exam. Each step includes working code examples.
            </p>
          </div>
          <InteractiveWalkthrough
            title="Getting Started with ExamForge AI"
            steps={gettingStartedSteps}
          />
        </div>
      </SectionWrapper>

      {/* Role-Specific Quick Links */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Quick Links by{' '}
            <GradientText preset="primary">Role</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Find the most relevant documentation for your role. Whether you are an administrator, teacher, student, or parent — we have tailored guides for you.
          </p>
        </div>
        <RoleQuickLinks />
      </SectionWrapper>

      {/* Popular Articles */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Popular <GradientText preset="cool">Articles</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            The most-read guides and tutorials from our documentation, curated to help you get productive fast.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {popularArticles.map((article, i) => (
            <Link
              key={article.title}
              href="/docs"
              className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-4 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 text-sm font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {article.category}
                  </span>
                  <span>{article.readTime} read</span>
                  <span>{article.views} views</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* Video Tutorials */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Video <GradientText preset="warm">Tutorials</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Watch step-by-step video tutorials to learn ExamForge AI visually. Each video covers a key workflow with practical demonstrations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videoTutorials.map((video) => (
            <div
              key={video.title}
              className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300"
            >
              {/* Video Thumbnail Placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/5 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
                  <PlayCircle className="h-8 w-8" />
                </div>
                <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px] font-mono">
                  {video.duration}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Integration Guides */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Integration <GradientText preset="cool">Guides</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Connect ExamForge AI with your existing tools and systems. Our integration guides make it easy to create a seamless workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrationGuides.map((guide) => {
            const Icon = resolveIcon(guide.icon) ?? Zap
            return (
              <div
                key={guide.title}
                className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{guide.title}</h3>
                  </div>
                  <Badge
                    variant={guide.status === 'Available' ? 'default' : 'secondary'}
                    className={`text-[10px] ${guide.status === 'Available' ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800' : ''}`}
                  >
                    {guide.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {guide.description}
                </p>
                <Link
                  href="/docs"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  View Guide
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
