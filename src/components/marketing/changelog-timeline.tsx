'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Bug, Zap, Shield, Palette, Globe, Users,
  Filter, Mail, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'

// ============================================================================
// ExamForge AI — Changelog Timeline (Client Component)
// ============================================================================

type ChangeCategory = 'feature' | 'improvement' | 'bugfix'
type ReleaseType = 'major' | 'feature' | 'improvement'
type FilterType = 'all' | 'major' | 'feature' | 'improvement' | 'bugfix'

interface Change {
  category: ChangeCategory
  text: string
}

interface Release {
  version: string
  date: string
  type: ReleaseType
  title: string
  description: string
  changes: Change[]
  current?: boolean
}

const CATEGORY_CONFIG: Record<ChangeCategory, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  feature: { icon: Sparkles, label: 'Features', color: 'text-green-600 dark:text-green-400' },
  improvement: { icon: Zap, label: 'Improvements', color: 'text-primary' },
  bugfix: { icon: Bug, label: 'Bug Fixes', color: 'text-yellow-600 dark:text-yellow-400' },
}

const TYPE_COLORS: Record<ReleaseType, string> = {
  major: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  feature: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-200 dark:border-emerald-800',
  improvement: 'bg-primary/100/10 text-primary border-primary/20',
}

const TYPE_LABELS: Record<ReleaseType, string> = {
  major: 'Major Release',
  feature: 'New Feature',
  improvement: 'Improvement',
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'major', label: 'Major' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'bugfix', label: 'Bug Fix' },
]

const releases: Release[] = [
  {
    version: 'v3.2.0',
    date: 'January 28, 2026',
    type: 'feature',
    title: 'AI Question Generation v2',
    description: 'A complete overhaul of our AI question generation engine with dramatically improved performance, accuracy, and curriculum alignment.',
    current: true,
    changes: [
      { category: 'feature', text: 'New AI question generation engine with 3x faster response times and improved accuracy' },
      { category: 'feature', text: 'Redesigned exam creation wizard with step-by-step guided flow' },
      { category: 'feature', text: 'Multi-school analytics dashboard for school groups and chains' },
      { category: 'improvement', text: 'Dashboard loads 40% faster with optimized data fetching and caching' },
      { category: 'improvement', text: 'AI question quality scores now visible in the question bank' },
      { category: 'bugfix', text: 'Fixed: Curriculum alignment dropdown not loading for WAEC standards' },
    ],
  },
  {
    version: 'v3.1.0',
    date: 'January 14, 2026',
    type: 'feature',
    title: 'Marketplace Launch',
    description: 'The ExamForge AI Marketplace is here — browse, share, and download exam templates and question banks from educators worldwide.',
    changes: [
      { category: 'feature', text: 'ExamForge AI Marketplace: browse, share, and download exam templates and question banks' },
      { category: 'feature', text: 'Two-factor authentication (2FA) for all admin accounts' },
      { category: 'improvement', text: 'Enhanced search with fuzzy matching and subject-specific filters' },
      { category: 'bugfix', text: 'Fixed: CBT timer not pausing correctly on network interruption' },
      { category: 'bugfix', text: 'Fixed: Student report PDF generation failing for large datasets' },
    ],
  },
  {
    version: 'v3.0.0',
    date: 'December 28, 2025',
    type: 'major',
    title: 'ExamForge AI 3.0',
    description: 'The biggest release in ExamForge AI history. A complete redesign, AI Assistant, real-time collaboration, and SOC 2 certification.',
    changes: [
      { category: 'feature', text: 'Complete UI redesign with new design system and dark mode support' },
      { category: 'feature', text: 'AI Assistant: natural language queries for data analysis and report generation' },
      { category: 'feature', text: 'Real-time collaboration: co-edit exams, lesson plans, and documents' },
      { category: 'feature', text: 'Parent portal with real-time student progress tracking' },
      { category: 'improvement', text: 'SOC 2 Type II certification achieved for data security compliance' },
      { category: 'improvement', text: 'API v3 with improved rate limits and new webhook events' },
      { category: 'bugfix', text: 'Fixed: 23 reported issues across CBT, analytics, and billing modules' },
    ],
  },
  {
    version: 'v2.8.0',
    date: 'December 10, 2025',
    type: 'improvement',
    title: 'Analytics Overhaul',
    description: 'Predictive analytics, custom report builder, and significant performance improvements across the analytics module.',
    changes: [
      { category: 'feature', text: 'Predictive analytics: identify at-risk students with AI-powered early warning system' },
      { category: 'feature', text: 'Custom report builder with drag-and-drop interface' },
      { category: 'improvement', text: 'Dashboard performance optimization: 60% faster data loading' },
      { category: 'improvement', text: 'Chart rendering engine rewritten for smoother visualizations' },
      { category: 'bugfix', text: 'Fixed: Attendance chart not displaying correctly for multi-term periods' },
    ],
  },
  {
    version: 'v2.7.0',
    date: 'November 28, 2025',
    type: 'feature',
    title: 'Billing & Payments',
    description: 'Comprehensive billing module with Flutterwave integration, automated reminders, and payment audit trail.',
    changes: [
      { category: 'feature', text: 'Flutterwave integration for school fee collection and invoice management' },
      { category: 'feature', text: 'Automated payment reminders and overdue notifications' },
      { category: 'improvement', text: 'Payment audit trail and reconciliation dashboard' },
      { category: 'bugfix', text: 'Fixed: Student enrollment count discrepancy in billing reports' },
      { category: 'bugfix', text: 'Fixed: Invoice numbers not generating sequentially for multi-school accounts' },
    ],
  },
  {
    version: 'v2.6.0',
    date: 'November 10, 2025',
    type: 'improvement',
    title: 'CBT Enhancements',
    description: 'Offline exam delivery, advanced anti-cheating measures, and mobile rendering fixes for a more robust CBT experience.',
    changes: [
      { category: 'feature', text: 'Offline exam delivery: students can take exams without internet connection' },
      { category: 'improvement', text: 'Advanced anti-cheating: tab-switch detection, copy-paste prevention, webcam monitoring' },
      { category: 'improvement', text: 'CBT exam player rewritten for better performance on low-end devices' },
      { category: 'bugfix', text: 'Fixed: Exam timer continuing after student submission' },
      { category: 'bugfix', text: 'Fixed: Image-based questions not rendering on mobile devices' },
    ],
  },
  {
    version: 'v2.5.0',
    date: 'October 22, 2025',
    type: 'feature',
    title: 'Communication Hub',
    description: 'Unified communication platform with WhatsApp, email, and SMS integration for seamless school-to-parent messaging.',
    changes: [
      { category: 'feature', text: 'WhatsApp Business API integration for parent notifications' },
      { category: 'feature', text: 'Email template builder with drag-and-drop editor' },
      { category: 'feature', text: 'SMS notifications for exam reminders and urgent announcements' },
      { category: 'improvement', text: 'Contact management with smart groups and segmentation' },
      { category: 'bugfix', text: 'Fixed: Email delivery failures for schools with custom domains' },
    ],
  },
  {
    version: 'v2.4.0',
    date: 'October 5, 2025',
    type: 'improvement',
    title: 'Developer Platform',
    description: 'Official SDKs, webhook system, and Postman collection launch — everything developers need to build on ExamForge AI.',
    changes: [
      { category: 'feature', text: 'Official SDKs released for JavaScript/TypeScript, Python, and PHP' },
      { category: 'feature', text: 'Webhook event system with 6 event types and retry logic' },
      { category: 'feature', text: 'Postman collection with pre-configured authentication and examples' },
      { category: 'improvement', text: 'API documentation rewritten with interactive examples and response previews' },
      { category: 'improvement', text: 'Rate limiting improved with burst allowance and clearer 429 error messages' },
      { category: 'bugfix', text: 'Fixed: OAuth token refresh failing silently after 24 hours' },
      { category: 'bugfix', text: 'Fixed: Webhook payloads missing event timestamp in non-UTC timezones' },
    ],
  },
]

function categorizeChanges(changes: Change[]): Record<ChangeCategory, Change[]> {
  const result: Record<ChangeCategory, Change[]> = { feature: [], improvement: [], bugfix: [] }
  for (const change of changes) {
    result[change.category].push(change)
  }
  return result
}

function filterReleases(releases: Release[], filter: FilterType): Release[] {
  if (filter === 'all') return releases
  if (filter === 'bugfix') {
    return releases
      .map((r) => ({
        ...r,
        changes: r.changes.filter((c) => c.category === 'bugfix'),
      }))
      .filter((r) => r.changes.length > 0)
  }
  return releases.filter((r) => r.type === filter)
}

export function ChangelogTimeline() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const filteredReleases = filterReleases(releases, activeFilter)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.includes('@')) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <>
      {/* Filter Bar */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Release <GradientText preset="forge">Timeline</GradientText>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Filter releases by type">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="tab"
                aria-selected={activeFilter === opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  activeFilter === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50 md:left-8" aria-hidden="true" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {filteredReleases.map((release) => {
                  const categorized = categorizeChanges(release.changes)
                  return (
                    <div key={release.version} className="relative pl-12 md:pl-16">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 md:left-6.5 ${
                          release.current
                            ? 'border-primary bg-primary animate-pulse'
                            : 'border-primary bg-background'
                        }`}
                        aria-hidden="true"
                      />

                      <div className="rounded-xl border border-border/50 bg-card/80 p-6">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <Badge variant="outline" className="font-mono text-sm font-bold">
                            {release.version}
                          </Badge>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[release.type]}`}>
                            {TYPE_LABELS[release.type]}
                          </span>
                          <span className="text-xs text-muted-foreground">{release.date}</span>
                          {release.current && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{release.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                          {release.description}
                        </p>

                        {/* Categorized Changes */}
                        <div className="space-y-4">
                          {(Object.entries(categorized) as [ChangeCategory, Change[]][]).map(
                            ([category, changes]) => {
                              if (changes.length === 0) return null
                              const config = CATEGORY_CONFIG[category]
                              const CategoryIcon = config.icon
                              return (
                                <div key={category}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <CategoryIcon className={`h-3.5 w-3.5 ${config.color}`} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                                      {config.label}
                                    </span>
                                  </div>
                                  <ul className="space-y-2 ml-5">
                                    {changes.map((change, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current text-muted-foreground/40 flex-shrink-0" />
                                        <span className="text-muted-foreground leading-relaxed">{change.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>

            {filteredReleases.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No releases match the selected filter.</p>
              </div>
            )}
          </div>
        </div>
      </SectionWrapper>

      {/* Subscribe to Updates */}
      <SectionWrapper>
        <div className="max-w-xl mx-auto text-center">
          <div className="rounded-xl border border-border/50 bg-card/80 p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Subscribe to Updates
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Get notified when we ship new features, improvements, and fixes.
              No spam — just release notes.
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Subscribed! You will receive release updates.
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email address for changelog updates"
                  className="flex-1"
                />
                <Button type="submit" size="default" className="whitespace-nowrap">
                  Subscribe
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </SectionWrapper>
    </>
  )
}
