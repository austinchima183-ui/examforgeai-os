'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingDown, Clock, Users, GraduationCap, DollarSign, ArrowRight, Check } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { StaggerContainer, StaggerItem, springs, durations, easings } from '@/components/marketing/motion'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — ROI Calculator
// ============================================================================
// Interactive calculator that shows institutions how much they save
// by switching to ExamForge AI. Models paper costs, grading time,
// administrative overhead, and error reduction.
// ============================================================================

const studentTiers = [
  { label: 'Small (< 500)', value: 300 },
  { label: 'Medium (500–2,000)', value: 1000 },
  { label: 'Large (2,000–5,000)', value: 3500 },
  { label: 'University (5,000+)', value: 10000 },
]

const examFrequency = [
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Semester', value: 2 },
  { label: 'Annual', value: 1 },
]

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

interface CalculationResult {
  annualPaperCost: number
  annualGradingHours: number
  annualAdminHours: number
  gradingCostPerYear: number
  examforgeCost: number
  totalSavings: number
  timeSavedHours: number
  timeSavedPercent: number
  errorReduction: number
}

function calculateROI(students: number, examsPerYear: number): CalculationResult {
  // Paper-based exam costs (industry averages for African institutions)
  const paperPerExam = 3.50 // $ per student per exam (printing, paper, logistics)
  const annualPaperCost = students * examsPerYear * paperPerExam

  // Grading time: ~5 min per objective question × 50 questions × students / 60
  const gradingMinutesPerExam = students * 50 * 5
  const annualGradingHours = (gradingMinutesPerExam * examsPerYear) / 60

  // Admin hours for exam logistics (scheduling, invigilation, result compilation)
  const adminHoursPerExam = 40 + students * 0.02 // base + per-student overhead
  const annualAdminHours = adminHoursPerExam * examsPerYear

  // Cost of grading (average lecturer rate $15/hr in Africa)
  const gradingCostPerYear = annualGradingHours * 15

  // ExamForge AI cost (Professional plan)
  const basePlanCost = students <= 500 ? 39 * 12 : students <= 5000 ? 119 * 12 : 149 * 12
  const examforgeCost = basePlanCost

  // Savings
  const totalSavings = annualPaperCost + gradingCostPerYear - examforgeCost
  const timeSavedHours = annualGradingHours * 0.85 + annualAdminHours * 0.6 // AI auto-marking saves 85%, admin saves 60%
  const timeSavedPercent = 85
  const errorReduction = 95 // AI marking reduces human error by 95%

  return {
    annualPaperCost,
    annualGradingHours,
    annualAdminHours,
    gradingCostPerYear,
    examforgeCost,
    totalSavings,
    timeSavedHours,
    timeSavedPercent,
    errorReduction,
  }
}

export function ROICalculatorSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [studentTier, setStudentTier] = useState(1)
  const [examFreq, setExamFreq] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const students = studentTiers[studentTier].value
  const examsPerYear = examFrequency[examFreq].value
  const results = calculateROI(students, examsPerYear)

  return (
    <SectionWrapper id="roi-calculator" backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-primary uppercase tracking-wider mb-4"
          >
            <Calculator className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Savings Calculator
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Calculate your{' '}
            <GradientText preset="forge">ROI</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            See how much your institution saves with ExamForge AI. Real numbers, real impact.
          </motion.p>
        </div>

        {/* Calculator */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 sm:p-8"
          >
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Student tier */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  <GraduationCap className="inline h-4 w-4 mr-1.5 -mt-0.5 text-primary" />
                  Number of Students
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {studentTiers.map((tier, i) => (
                    <button
                      key={tier.label}
                      onClick={() => { setStudentTier(i); setShowResults(true) }}
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-xs font-medium border transition-all duration-200',
                        studentTier === i
                          ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                          : 'border-white/[0.04] bg-[#1D1D1D]/50 text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.02]'
                      )}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exam frequency */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  <Clock className="inline h-4 w-4 mr-1.5 -mt-0.5 text-primary" />
                  Exam Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {examFrequency.map((freq, i) => (
                    <button
                      key={freq.label}
                      onClick={() => { setExamFreq(i); setShowResults(true) }}
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-xs font-medium border transition-all duration-200',
                        examFreq === i
                          ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                          : 'border-white/[0.04] bg-[#1D1D1D]/50 text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.02]'
                      )}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <AnimatePresence mode="wait">
              {showResults && (
                <motion.div
                  key={`${studentTier}-${examFreq}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: durations.normal, ease: easings.premium }}
                  className="space-y-6"
                >
                  {/* Big savings number */}
                  <div className="text-center py-6 rounded-xl bg-gradient-to-br from-primary/5 via-amber-400/3 to-cyan-400/5 border border-primary/10">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Annual Savings</p>
                    <motion.p
                      className="text-4xl sm:text-5xl font-bold text-primary"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ ...springs.bouncy, delay: 0.1 }}
                    >
                      {formatCurrency(Math.max(0, results.totalSavings))}
                    </motion.p>
                    <p className="text-xs text-muted-foreground mt-2">
                      vs. traditional paper-based examination process
                    </p>
                  </div>

                  {/* Detailed breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ResultCard
                      icon={TrendingDown}
                      label="Paper & Printing"
                      value={formatCurrency(results.annualPaperCost)}
                      subtitle="saved annually"
                      delay={0}
                      color="text-green-600 dark:text-green-400"
                    />
                    <ResultCard
                      icon={Clock}
                      label="Grading Time"
                      value={`${results.timeSavedPercent}%`}
                      subtitle={`${Math.round(results.timeSavedHours).toLocaleString()} hrs saved/yr`}
                      delay={0.1}
                      color="text-primary"
                    />
                    <ResultCard
                      icon={Users}
                      label="Error Reduction"
                      value={`${results.errorReduction}%`}
                      subtitle="fewer marking errors"
                      delay={0.2}
                      color="text-purple-500"
                    />
                  </div>

                  {/* Current vs ExamForge comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.04] bg-[#1D1D1D]/50 p-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Without ExamForge AI</p>
                      <div className="space-y-2">
                        <ComparisonLine label="Paper & printing" value={formatCurrency(results.annualPaperCost)} />
                        <ComparisonLine label="Manual grading" value={formatCurrency(results.gradingCostPerYear)} />
                        <ComparisonLine label="Admin overhead" value={`${Math.round(results.annualAdminHours)} hrs`} />
                        <div className="pt-2 border-t border-white/[0.04]">
                          <ComparisonLine label="Total annual cost" value={formatCurrency(results.annualPaperCost + results.gradingCostPerYear)} bold />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">With ExamForge AI</p>
                      <div className="space-y-2">
                        <ComparisonLine label="Platform subscription" value={formatCurrency(results.examforgeCost)} />
                        <ComparisonLine label="Grading time" value="85% less" highlight />
                        <ComparisonLine label="Admin overhead" value="60% less" highlight />
                        <div className="pt-2 border-t border-primary/20">
                          <ComparisonLine label="Total annual cost" value={formatCurrency(results.examforgeCost)} bold highlight />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center pt-2"
                  >
                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                    >
                      Start Saving Today
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-3">14-day free trial · No credit card required</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showResults && (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select your institution size and exam frequency to see your savings</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}

/* ─── Sub-components ─── */

function ResultCard({
  icon: Icon,
  label,
  value,
  subtitle,
  delay,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtitle: string
  delay: number
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, delay, ease: easings.premium }}
      className="rounded-xl border border-white/[0.04] bg-[#1D1D1D]/50 p-5 text-center"
    >
      <Icon className={cn('h-5 w-5 mx-auto mb-2', color)} />
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  )
}

function ComparisonLine({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn('text-muted-foreground', bold && 'font-medium text-foreground')}>{label}</span>
      <span className={cn(
        bold ? 'font-bold' : 'font-medium',
        highlight ? 'text-primary' : 'text-foreground'
      )}>{value}</span>
    </div>
  )
}
