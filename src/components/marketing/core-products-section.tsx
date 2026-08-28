'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Users, MonitorPlay, Building2, BarChart3, Store, CreditCard,
  Bot, MessageSquare, Radio, Bell, ArrowRight, Check
} from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import {
  SIScreen,
  CBTScreen,
  ERPScreen,
  AnalyticsScreen,
  MarketplaceScreen,
  BillingScreen,
  AIAssistantScreen,
  MessagingScreen,
  CollabScreen,
  NotificationsScreen,
  AdminDashboardScreen,
  CBTExamInterfaceScreen,
  AIQuestionGeneratorScreen,
  AnalyticsDashboardScreen,
  StudentPortalScreen,
  TeacherPortalScreen,
  ParentPortalScreen,
  MarketplacePreviewScreen,
} from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — Core Products Section (Premium Edition)
// ============================================================================
// Showcases the 10 core product modules with high-fidelity product screen
// previews, glassmorphism cards, animated gradient borders, icon animations,
// enhanced benefit items, and staggered entrance animations.
// ============================================================================

// ---------- Product Data ----------

const previewMap: Record<string, React.FC> = {
  'Student Information System': StudentPortalScreen,
  'AI CBT Platform': CBTExamInterfaceScreen,
  'School ERP': AdminDashboardScreen,
  'Analytics & Insights': AnalyticsDashboardScreen,
  'Marketplace': MarketplacePreviewScreen,
  'Billing & Payments': BillingScreen,
  'AI Assistant': AIQuestionGeneratorScreen,
  'Messaging': MessagingScreen,
  'Realtime Collaboration': CollabScreen,
  'Notifications': NotificationsScreen,
}

const products = [
  {
    icon: Users,
    title: 'Student Information System',
    description: 'Complete student lifecycle management — enrollment, attendance, grades, health records, and parent communication in one unified view.',
    benefits: ['360° student profiles', 'Automated enrollment workflows', 'Parent portal access'],
    color: 'bg-primary/100/10 text-primary',
    borderColor: 'from-blue-500/60 via-blue-400/40 to-cyan-500/60',
    glowColor: 'group-hover:shadow-blue-500/10',
    href: '/#features',
  },
  {
    icon: MonitorPlay,
    title: 'AI CBT Platform',
    description: 'Create, publish, and deliver computer-based exams with AI-powered question generation, live monitoring, and automatic marking.',
    benefits: ['AI question generation', 'Real-time exam monitoring', 'Instant auto-marking'],
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    borderColor: 'from-indigo-500/60 via-amber-400/40 to-cyan-400/60',
    glowColor: 'group-hover:shadow-violet-500/10',
    href: '/#cbt',
  },
  {
    icon: Building2,
    title: 'School ERP',
    description: 'End-to-end school administration — manage staff, timetables, facilities, departments, and daily operations from a single dashboard.',
    benefits: ['Staff management', 'Timetable scheduling', 'Facility booking'],
    color: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400',
    borderColor: 'from-emerald-500/60 via-green-400/40 to-teal-500/60',
    glowColor: 'group-hover:shadow-emerald-500/10',
    href: '/#features',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Transform raw data into actionable insights. Track student performance, exam trends, teacher effectiveness, and school-wide metrics.',
    benefits: ['Real-time dashboards', 'Predictive analytics', 'Custom report builder'],
    color: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400',
    borderColor: 'from-amber-500/60 via-orange-400/40 to-yellow-500/60',
    glowColor: 'group-hover:shadow-amber-500/10',
    href: '/#analytics',
  },
  {
    icon: Store,
    title: 'Marketplace',
    description: 'Browse and share exam templates, question banks, and educational resources. Download curated content or publish your own.',
    benefits: ['Pre-built exam templates', 'Community question banks', 'One-click import'],
    color: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400',
    borderColor: 'from-pink-500/60 via-rose-400/40 to-red-500/60',
    glowColor: 'group-hover:shadow-pink-500/10',
    href: '/#features',
  },
  {
    icon: CreditCard,
    title: 'Billing & Payments',
    description: 'Integrated payment processing with Flutterwave. Manage school fees, generate invoices, track payments, and automate reminders.',
    benefits: ['Flutterwave integration', 'Automated invoicing', 'Payment tracking'],
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    borderColor: 'from-cyan-500/60 via-sky-400/40 to-blue-500/60',
    glowColor: 'group-hover:shadow-cyan-500/10',
    href: '/#features',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description: 'An intelligent assistant that helps teachers create lesson plans, generate questions, analyze student data, and draft reports.',
    benefits: ['Natural language queries', 'Context-aware suggestions', 'Report generation'],
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    borderColor: 'from-indigo-500/60 via-cyan-400/40 to-indigo-500/60',
    glowColor: 'group-hover:shadow-violet-500/10',
    href: '/#ai-features',
  },
  {
    icon: MessageSquare,
    title: 'Messaging',
    description: 'Built-in messaging for teachers, students, and parents. Send announcements, schedule reminders, and facilitate group discussions.',
    benefits: ['Real-time messaging', 'Group channels', 'Announcement broadcasts'],
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    borderColor: 'from-teal-500/60 via-emerald-400/40 to-green-500/60',
    glowColor: 'group-hover:shadow-teal-500/10',
    href: '/#features',
  },
  {
    icon: Radio,
    title: 'Realtime Collaboration',
    description: 'Collaborate on exams, lesson plans, and documents in real-time. See who is online, track changes, and co-edit simultaneously.',
    benefits: ['Live co-editing', 'Presence indicators', 'Change tracking'],
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    borderColor: 'from-orange-500/60 via-amber-400/40 to-yellow-500/60',
    glowColor: 'group-hover:shadow-orange-500/10',
    href: '/#features',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Smart notification system with push, email, and in-app alerts. Keep everyone informed about exams, results, and important events.',
    benefits: ['Multi-channel delivery', 'Smart scheduling', 'Customizable preferences'],
    color: 'bg-destructive/100/10 text-destructive',
    borderColor: 'from-red-500/60 via-rose-400/40 to-pink-500/60',
    glowColor: 'group-hover:shadow-red-500/10',
    href: '/#features',
  },
]

// ---------- Product Card ----------

function ProductCard({
  product,
  index,
  isInView,
}: {
  product: typeof products[number]
  index: number
  isInView: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = product.icon
  const PreviewComponent = previewMap[product.title]

  return (
    <motion.div
      key={product.title}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.07, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${product.title} product card`}
    >
      {/* Animated gradient border layer */}
      <div
        className={`absolute -inset-[1px] rounded-xl bg-gradient-to-br ${product.borderColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[0.5px]`}
        aria-hidden="true"
      />

      {/* Glow effect */}
      <div
        className={`absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${product.glowColor} group-hover:shadow-xl`}
        aria-hidden="true"
      />

      {/* Main card */}
      <div
        className={`relative rounded-xl border border-white/[0.04] forge-glass-surface p-6 h-full forge-card-shadow
          group-hover:-translate-y-0.5 group-hover:border-white/[0.08] group-hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]
          transition-all duration-300
          focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-background`}
      >
        {/* Icon with animation */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] mb-4
          group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ease-out`}>
          <Icon className="h-6 w-6 transition-transform duration-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 group-hover:text-foreground transition-colors duration-300">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{product.description}</p>

        {/* Benefits with animated checkmarks */}
        <ul className="space-y-2" role="list" aria-label={`${product.title} benefits`}>
          {product.benefits.map((benefit, bIndex) => (
            <li
              key={benefit}
              className="flex items-center gap-2.5 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300"
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 flex-shrink-0
                  group-hover:bg-primary/20 transition-all duration-300"
                aria-hidden="true"
              >
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isHovered ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25, delay: bIndex * 0.08 }}
                >
                  <Check className="h-2.5 w-2.5 text-primary" />
                </motion.span>
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Interactive preview area */}
        <AnimatePresence>
          {isHovered && PreviewComponent && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
              className="overflow-hidden"
              aria-hidden="true"
            >
              <div className="rounded-lg border border-white/[0.04] forge-glass-surface p-3">
                <PreviewComponent />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA link */}
        <div className="mt-5 pt-4 border-t border-white/[0.04]">
          <Link
            href={product.href}
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label={`Learn more about ${product.title}`}
          >
            Learn more
            <motion.span
              className="ml-1 inline-flex"
              animate={isHovered ? { x: 4 } : { x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Main Section ----------

export function CoreProductsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="features">
      <div ref={ref}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            Core Products
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Everything your school needs.{' '}
            <GradientText preset="ember">Nothing it doesn&apos;t.</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Ten integrated modules that work together seamlessly. Start with what you need
            today and unlock the rest as your school grows.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, i) => (
            <ProductCard
              key={product.title}
              product={product}
              index={i}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
