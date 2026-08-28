'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, X, Minus, Crown, Sparkles } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'

// ============================================================================
// ExamForge AI — Comparison Section (Premium)
// ============================================================================
// Premium comparison table with animated checkmarks/X marks, hover effects
// on rows, a "winner" highlight for ExamForge AI column, and category
// grouping for better visual design.
// ============================================================================

type FeatureStatus = 'yes' | 'no' | 'partial'

const comparisonData: {
  feature: string
  category: string
  examforge: FeatureStatus
  traditional: FeatureStatus
  manual: FeatureStatus
}[] = [
  { feature: 'AI Question Generation', category: 'AI', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Auto Marking', category: 'AI', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Predictive Analytics', category: 'AI', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'AI Study Assistant', category: 'AI', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'CBT Exam Delivery', category: 'Exams', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Live Exam Monitoring', category: 'Exams', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Automatic Certificate Generation', category: 'Exams', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Real-Time Results', category: 'Exams', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Student Information System', category: 'Management', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Integrated Billing & Payments', category: 'Management', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Parent Portal', category: 'Management', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Multi-School Management', category: 'Management', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Real-Time Collaboration', category: 'Platform', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Marketplace for Resources', category: 'Platform', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: 'Mobile Responsive', category: 'Platform', examforge: 'yes', traditional: 'partial', manual: 'no' },
  { feature: 'Role-Based Access Control', category: 'Security', examforge: 'yes', traditional: 'partial', manual: 'partial' },
  { feature: 'Audit Logging', category: 'Security', examforge: 'yes', traditional: 'no', manual: 'partial' },
  { feature: 'End-to-End Encryption', category: 'Security', examforge: 'yes', traditional: 'no', manual: 'no' },
  { feature: '99.9% Uptime SLA', category: 'Security', examforge: 'yes', traditional: 'no', manual: 'partial' },
  { feature: 'Setup Time', category: 'Setup', examforge: 'yes', traditional: 'partial', manual: 'no' },
]

const categories = ['AI', 'Exams', 'Management', 'Platform', 'Security', 'Setup']

function AnimatedStatusIcon({ status, delay }: { status: FeatureStatus; delay: number }) {
  if (status === 'yes') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4, delay }}
        className="flex items-center justify-center"
      >
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-green-50 dark:bg-green-9500/10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: delay + 0.1 }}
          >
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" strokeWidth={3} />
          </motion.div>
        </div>
      </motion.div>
    )
  }
  if (status === 'partial') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4, delay }}
        className="flex items-center justify-center"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-9500/10">
          <Minus className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
        </div>
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.4, delay }}
      className="flex items-center justify-center"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/100/10">
        <X className="h-3.5 w-3.5 text-destructive" />
      </div>
    </motion.div>
  )
}

export function ComparisonSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  // Group data by category
  const groupedData = categories.map((cat) => ({
    category: cat,
    items: comparisonData.filter((d) => d.category === cat),
  }))

  return (
    <SectionWrapper id="solutions">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            Why ExamForge
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            See how we{' '}
            <GradientText preset="ember">compare</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Traditional school software was built for the 2000s. Manual systems belong in the 1990s.
            ExamForge AI is built for the future of education.
          </motion.p>
        </div>

        {/* Premium Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="overflow-x-auto"
        >
          <div className="min-w-[640px] forge-glass-surface rounded-2xl border border-white/[0.04] forge-card-shadow p-2 sm:p-4">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_120px_120px_120px] gap-0 border-b border-white/[0.04] pb-4 mb-2">
              <div className="px-4 py-2">
                <span className="text-sm font-semibold text-muted-foreground">Feature</span>
              </div>
              <div className="px-4 py-2 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-1.5">
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">ExamForge AI</span>
                </div>
              </div>
              <div className="px-4 py-2 text-center">
                <span className="text-sm font-medium text-muted-foreground">Traditional</span>
              </div>
              <div className="px-4 py-2 text-center">
                <span className="text-sm font-medium text-muted-foreground">Manual</span>
              </div>
            </div>

            {/* Table Body - Grouped by Category */}
            {groupedData.map((group, groupIdx) => (
              <div key={group.category}>
                {/* Category Header */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.4 + groupIdx * 0.05 }}
                  className="grid grid-cols-[1fr_120px_120px_120px] gap-0 mt-4 mb-1"
                >
                  <div className="px-4 py-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      {group.category}
                    </span>
                  </div>
                </motion.div>

                {/* Feature Rows */}
                {group.items.map((row, i) => (
                  <motion.div
                    key={row.feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.3, delay: 0.5 + groupIdx * 0.05 + i * 0.03 }}
                    className="group grid grid-cols-[1fr_120px_120px_120px] gap-0 rounded-lg hover:bg-white/[0.02] transition-colors duration-200"
                  >
                    <div className="px-4 py-3 text-sm">{row.feature}</div>
                    <div className="px-4 py-3 text-center relative">
                      {/* Winner highlight column */}
                      <div className="absolute inset-0 bg-primary/[0.03] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      <AnimatedStatusIcon
                        status={row.examforge}
                        delay={0.5 + groupIdx * 0.05 + i * 0.03}
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <AnimatedStatusIcon
                        status={row.traditional}
                        delay={0.5 + groupIdx * 0.05 + i * 0.03 + 0.02}
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <AnimatedStatusIcon
                        status={row.manual}
                        delay={0.5 + groupIdx * 0.05 + i * 0.03 + 0.04}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 dark:bg-green-9500/10">
              <Check className="h-3 w-3 text-green-600 dark:text-green-400" strokeWidth={3} />
            </div>
            Full support
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-9500/10">
              <Minus className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
            </div>
            Partial / limited
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/100/10">
              <X className="h-3 w-3 text-destructive" />
            </div>
            Not available
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-primary" />
            Winner
          </span>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
