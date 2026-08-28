'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { BarChart3, TrendingUp, PieChart, Target, Download, Filter, Activity } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { AnalyticsChartIllustration, AnalyticsDashboardScreen } from '@/components/marketing/illustrations'
import { featureGradientPresets } from '@/components/marketing/design-system'

// ============================================================================
// ExamForge AI — Analytics Section (Premium AI OS)
// ============================================================================
// Showcases the analytics and reporting capabilities with animated mini
// charts, KPI cards with animated stat counters, forge-glass-surface cards,
// screenshot/mockup cards with gradient borders, and a subtle data
// visualization background pattern.
// ============================================================================

const analyticsFeatures = [
  { icon: BarChart3, title: 'Real-Time Dashboards', description: 'Live dashboards updated every second with student performance, exam progress, and institutional metrics.', gradient: 'from-indigo-500 to-cyan-500' },
  { icon: TrendingUp, title: 'Trend Analysis', description: 'Track performance trends across terms, years, and cohorts. Identify patterns before they become problems.', gradient: 'from-cyan-500 to-teal-600' },
  { icon: PieChart, title: 'Custom Reports', description: 'Build custom reports with drag-and-drop. Filter by class, subject, teacher, or any dimension you need.', gradient: 'from-emerald-500 to-teal-600' },
  { icon: Target, title: 'Predictive Insights', description: 'AI predicts student outcomes, identifies at-risk learners, and recommends targeted interventions.', gradient: 'from-indigo-500 to-amber-500' },
  { icon: Download, title: 'Export & Share', description: 'Export reports to PDF, Excel, or CSV. Share with stakeholders via email or secure links.', gradient: 'from-amber-500 to-orange-600' },
  { icon: Filter, title: 'Advanced Filtering', description: 'Slice and dice data by date range, department, class, subject, or custom criteria for precise analysis.', gradient: 'from-indigo-500 to-indigo-600' },
]

const chartData = [
  { label: 'Jan', value: 65 },
  { label: 'Feb', value: 72 },
  { label: 'Mar', value: 68 },
  { label: 'Apr', value: 78 },
  { label: 'May', value: 82 },
  { label: 'Jun', value: 75 },
  { label: 'Jul', value: 88 },
  { label: 'Aug', value: 91 },
  { label: 'Sep', value: 85 },
  { label: 'Oct', value: 94 },
  { label: 'Nov', value: 89 },
  { label: 'Dec', value: 96 },
]

const subjectData = [
  { label: 'Mathematics', value: 78, color: 'from-indigo-500 to-cyan-500' },
  { label: 'English', value: 85, color: 'from-cyan-500 to-teal-500' },
  { label: 'Physics', value: 72, color: 'from-emerald-500 to-teal-500' },
  { label: 'Chemistry', value: 68, color: 'from-amber-500 to-orange-500' },
  { label: 'Biology', value: 81, color: 'from-amber-500 to-orange-500' },
]

const kpis = [
  { label: 'Avg. Pass Rate', value: 94.7, suffix: '%', change: '+3.2%', up: true },
  { label: 'Student Growth', value: 12.5, suffix: '%', prefix: '+', change: 'vs last term', up: true },
  { label: 'Exam Completion', value: 98.3, suffix: '%', change: '+1.8%', up: true },
  { label: 'AI Accuracy', value: 99.1, suffix: '%', change: '+0.4%', up: true },
]

export function AnalyticsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="analytics" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            Analytics & Insights
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Data that drives{' '}
            <GradientText preset="neural">better decisions</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Transform raw exam data into actionable insights. Beautiful charts, real-time dashboards,
            and AI-powered recommendations help you make data-driven decisions that improve outcomes.
          </motion.p>
        </div>

        {/* Analytics Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex justify-center mb-10"
        >
          <AnalyticsChartIllustration className="h-32 w-auto sm:h-40" />
        </motion.div>

        {/* KPI Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                <AnimatedCounter target={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix as any} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${kpi.up ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>{kpi.change}</p>
            </div>
          ))}
        </motion.div>

        {/* Real Analytics Dashboard - Mockup Card with Gradient Border */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className="relative rounded-xl overflow-hidden forge-card-shadow">
            {/* Gradient border wrapper */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-indigo-500/20 via-transparent to-cyan-500/20" aria-hidden="true" />
            <div className="relative rounded-xl border border-white/[0.04] overflow-hidden">
              <AnalyticsDashboardScreen />
            </div>
          </div>
        </motion.div>

        {/* Feature Grid - Forge Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {analyticsFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.06 }}
                className="group relative"
              >
                {/* Gradient border glow on hover */}
                <div
                  className={`absolute -inset-px rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-25 transition-opacity duration-500 blur-[1px]`}
                  aria-hidden="true"
                />
                <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
