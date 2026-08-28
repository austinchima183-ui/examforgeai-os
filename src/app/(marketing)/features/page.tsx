'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, MonitorPlay, Users, Building2, BarChart3, Bot, Store,
  Sparkles, Check, Zap, Clock, Shield, CreditCard, MessageSquare,
  Radio, Bell, TrendingUp, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Features Page (Premium)
// ============================================================================

const featureCategories = [
  {
    id: 'examination',
    title: 'Examination & Assessment',
    icon: MonitorPlay,
    features: [
      {
        id: 'cbt',
        icon: MonitorPlay,
        name: 'AI CBT Platform',
        description: 'Create, deliver, and grade computer-based exams with AI assistance. Support for multiple question types, timed exams, and live monitoring.',
        preview: 'Live Exam Session',
        previewDetail: '42 students active · 3 flagged · 1:15:32 remaining',
      },
      {
        id: 'ai-question-generation',
        icon: Bot,
        name: 'AI Question Generation',
        description: 'Generate exam questions from any topic in seconds. AI creates questions aligned with curriculum standards, complete with answer keys and explanations.',
        preview: 'Questions Generated',
        previewDetail: '50 questions · WAEC standard · 4 subjects',
      },
      {
        id: 'auto-marking',
        icon: BarChart3,
        name: 'Auto Marking',
        description: 'Instant grading for objective questions and AI-powered marking for subjective responses. Reduce marking time by 85% with detailed feedback.',
        preview: 'Auto-Marking Results',
        previewDetail: '98% accuracy · 850 papers · 3.2 seconds avg',
      },
      {
        id: 'live-monitoring',
        icon: Users,
        name: 'Live Monitoring',
        description: 'Watch students take exams in real-time. Track progress, flag suspicious activity, and ensure exam integrity across all terminals.',
        preview: 'Monitoring Dashboard',
        previewDetail: '12 halls · 360 students · 99.7% uptime',
      },
    ],
  },
  {
    id: 'management',
    title: 'School Management',
    icon: Building2,
    features: [
      {
        id: 'students',
        icon: Users,
        name: 'Student Information System',
        description: 'Complete student lifecycle management from enrollment to graduation. Track attendance, grades, health records, and parent communication.',
        preview: 'Student Records',
        previewDetail: '2,450 students · 98% attendance · 12 classes',
      },
      {
        id: 'erp',
        icon: Building2,
        name: 'School ERP',
        description: 'End-to-end school administration. Manage staff, timetables, facilities, departments, and daily operations from a single dashboard.',
        preview: 'Operations Hub',
        previewDetail: '86 staff · 45 rooms · 6 departments',
      },
      {
        id: 'marketplace',
        icon: Store,
        name: 'Marketplace',
        description: 'Browse and share exam templates, question banks, and educational resources. Download curated content or publish your own.',
        preview: 'Marketplace Stats',
        previewDetail: '1,200+ resources · 340 contributors · 4.8★ avg',
      },
      {
        id: 'ai-assistant',
        icon: Bot,
        name: 'AI Assistant',
        description: 'An intelligent assistant that helps teachers create lesson plans, generate questions, analyze data, and draft reports using natural language.',
        preview: 'AI Assistant',
        previewDetail: '24/7 available · 15,000+ prompts · 50+ templates',
      },
      {
        id: 'billing',
        icon: CreditCard,
        name: 'Billing & Payments',
        description: 'Integrated payment processing for school fees, exam fees, and more. Automatic invoicing, payment tracking, and financial reporting.',
        preview: 'Payment Overview',
        previewDetail: '₦12.4M collected · 94% on-time · 890 invoices',
      },
      {
        id: 'messaging',
        icon: MessageSquare,
        name: 'Messaging',
        description: 'Built-in communication tools for teachers, students, and parents. Send announcements, reminders, and individual messages.',
        preview: 'Messages',
        previewDetail: '1,230 sent today · 98% read rate · 3 channels',
      },
      {
        id: 'collaboration',
        icon: Radio,
        name: 'Realtime Collaboration',
        description: 'Co-edit exams and documents in real-time. Multiple teachers can work on the same assessment simultaneously with live cursor tracking.',
        preview: 'Collaboration',
        previewDetail: '5 active editors · 3 comments · Auto-saved',
      },
      {
        id: 'notifications',
        icon: Bell,
        name: 'Notifications',
        description: 'Smart multi-channel alerts for exam schedules, result releases, fee reminders, and system updates via email, SMS, and push.',
        preview: 'Notification Center',
        previewDetail: '4,500 delivered · 0.2% bounce · 3 channels',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    icon: BarChart3,
    features: [
      {
        id: 'analytics',
        icon: BarChart3,
        name: 'Performance Analytics',
        description: 'Real-time dashboards tracking student performance, class trends, and exam difficulty. Identify knowledge gaps and improvement opportunities.',
        preview: 'Analytics Dashboard',
        previewDetail: '12 metrics · 6 subjects · Real-time updates',
      },
      {
        id: 'predictive-analytics',
        icon: Bot,
        name: 'Predictive Analytics',
        description: 'AI predicts student outcomes, identifies at-risk learners, and recommends targeted interventions before problems become critical.',
        preview: 'Prediction Engine',
        previewDetail: '89% accuracy · 45 at-risk flagged · 12 interventions',
      },
      {
        id: 'custom-reports',
        icon: BarChart3,
        name: 'Custom Reports',
        description: 'Build custom reports with drag-and-drop. Filter by class, subject, teacher, or any dimension. Export to PDF, Excel, or CSV.',
        preview: 'Report Builder',
        previewDetail: '28 templates · 5 formats · Schedule enabled',
      },
      {
        id: 'report-generation',
        icon: Bot,
        name: 'Report Generation',
        description: 'Automatically generate comprehensive student reports, term summaries, and school performance documents with AI-written narratives.',
        preview: 'AI Reports',
        previewDetail: '2,450 generated · 3.2s avg · Multi-language',
      },
    ],
  },
]

const planComparison = {
  plans: ['Starter', 'Professional', 'Enterprise'],
  features: [
    { name: 'AI CBT Exams', starter: true, professional: true, enterprise: true },
    { name: 'AI Question Generation', starter: '50/month', professional: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Auto Marking', starter: true, professional: true, enterprise: true },
    { name: 'Student Information System', starter: 'Up to 200', professional: 'Up to 2,000', enterprise: 'Unlimited' },
    { name: 'School ERP', starter: false, professional: true, enterprise: true },
    { name: 'Marketplace Access', starter: 'Browse only', professional: 'Browse + Publish', enterprise: 'Browse + Publish' },
    { name: 'AI Assistant', starter: false, professional: true, enterprise: true },
    { name: 'Performance Analytics', starter: 'Basic', professional: 'Advanced', enterprise: 'Advanced + Predictive' },
    { name: 'Custom Reports', starter: false, professional: true, enterprise: true },
    { name: 'Live Monitoring', starter: '1 hall', professional: '10 halls', enterprise: 'Unlimited' },
    { name: 'Billing & Payments', starter: false, professional: true, enterprise: true },
    { name: 'Priority Support', starter: false, professional: true, enterprise: true },
  ],
}

const whatsNew = [
  { version: 'v3.2', date: 'Feb 2025', title: 'AI Essay Marking', description: 'AI-powered marking for long-form and essay responses with detailed feedback.', badge: 'New' },
  { version: 'v3.1', date: 'Jan 2025', title: 'Predictive Analytics', description: 'Identify at-risk students before they fall behind with AI-powered predictions.', badge: 'Popular' },
  { version: 'v3.0', date: 'Dec 2024', title: 'Realtime Collaboration', description: 'Co-edit exams and documents with live cursor tracking and comments.', badge: null },
  { version: 'v2.9', date: 'Nov 2024', title: 'Multi-Language Reports', description: 'Generate student reports in Yoruba, Hausa, Igbo, and French.', badge: null },
]

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] },
  },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 p-6 h-full ${className}`}>
      {children}
    </div>
  )
}

export default function FeaturesPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' })
  const comparisonRef = useRef<HTMLDivElement>(null)
  const comparisonInView = useInView(comparisonRef, { once: true, margin: '-80px' })
  const whatsNewRef = useRef<HTMLDivElement>(null)
  const whatsNewInView = useInView(whatsNewRef, { once: true, margin: '-80px' })
  const [activeTab, setActiveTab] = useState('examination')

  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Products', href: '/features' }, { name: 'Features', href: '/features' }]} />

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative py-20 sm:py-28 lg:py-36 overflow-hidden" aria-labelledby="features-hero-heading">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-cyan-500/3" />
          <div className="absolute inset-0 bg-[#090909]/80" />
          <div className="absolute top-[10%] left-[5%] h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-[5%] right-[10%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-3xl mx-auto">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>10 Integrated Modules</span>
            </div>
            <h1 id="features-hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Everything your school needs,{' '}
              <GradientText preset="primary">powered by AI</GradientText>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              ExamForge AI brings together 10 integrated modules in one platform. Each feature
              is enhanced by AI to save time, reduce errors, and improve outcomes for students,
              teachers, and administrators.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="shadow-md shadow-primary/25 h-12 px-8 text-base" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Interactive Feature Tabs ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Explore by category</h2>
          <p className="text-muted-foreground leading-relaxed">
            Dive into each module and see how AI transforms every aspect of school operations.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="h-auto p-1.5 forge-glass-surface border-white/[0.04] rounded-xl">
              {featureCategories.map((category) => {
                const Icon = category.icon
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="px-4 sm:px-6 py-2.5 text-sm font-medium rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                  >
                    <Icon className="h-4 w-4 mr-2 hidden sm:inline-block" aria-hidden="true" />
                    <span className="hidden sm:inline">{category.title}</span>
                    <span className="sm:hidden">{category.title.split(' ')[0]}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {featureCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {category.features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <motion.div key={feature.name} variants={itemVariants}>
                      <GlassCard>
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 id={feature.id} className="text-base font-semibold mb-1.5">{feature.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                            {/* Mini Preview Area */}
                            <div className="rounded-lg bg-[#1D1D1D]/50 border border-white/[0.04] p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                                <span className="text-xs font-medium text-foreground">{feature.preview}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{feature.previewDetail}</p>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </SectionWrapper>

      {/* ── Feature Comparison ── */}
      <section ref={comparisonRef} className="py-20 sm:py-24 lg:py-32 bg-[#090909]" aria-labelledby="comparison-heading">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={comparisonInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 id="comparison-heading" className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Compare <GradientText preset="cool">plans & features</GradientText>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              See which features are available on each plan. Every plan includes core CBT functionality.
            </p>
          </div>

          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow max-w-4xl mx-auto overflow-hidden">
            <div className="rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Feature comparison across plans">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground" scope="col">Feature</th>
                      {planComparison.plans.map((plan) => (
                        <th key={plan} className="text-center p-4 text-sm font-semibold" scope="col">
                          <span className={plan === 'Professional' ? 'text-primary' : 'text-foreground'}>{plan}</span>
                          {plan === 'Professional' && (
                            <span className="block text-xs text-primary/70 mt-0.5">Most Popular</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planComparison.features.map((feature, i) => (
                      <tr key={feature.name} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <td className="p-4 text-sm font-medium">{feature.name}</td>
                        {([feature.starter, feature.professional, feature.enterprise] as (boolean | string)[]).map((value, j) => (
                          <td key={j} className="text-center p-4">
                            {value === true ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" aria-label="Included" />
                            ) : value === false ? (
                              <span className="text-foreground/30">—</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">{value}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-white/[0.04] text-center">
                <Button asChild className="shadow-md shadow-primary/25">
                  <Link href="/pricing">
                    View Full Pricing
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── What's New ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div ref={whatsNewRef} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={whatsNewInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
        >
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              What&apos;s <GradientText preset="warm">new</GradientText>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We ship new features every week. Here are the latest additions to the platform.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {whatsNew.map((item) => (
              <motion.div key={item.version} variants={itemVariants}>
                <GlassCard>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Zap className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{item.version}</span>
                        <span className="text-xs text-muted-foreground">· {item.date}</span>
                        {item.badge && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold mb-1.5">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/changelog">
                View Full Changelog
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
