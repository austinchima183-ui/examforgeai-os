'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — School Admin AI Insights Page
// ============================================================================
// AI-powered school management insights with 5 analysis modules:
// Staffing, Enrollment, Revenue, Risks, Attendance
// ============================================================================

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Users,
  GraduationCap,
  DollarSign,
  ShieldAlert,
  CalendarCheck,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type AnalysisAction = 'staffing' | 'enrollment' | 'revenue' | 'risks' | 'attendance'

interface StaffingResult {
  currentRatio: number
  recommendedRatio: number
  additionalTeachersNeeded: number
  subjectGaps: Array<{
    subject: string
    currentTeachers: number
    needed: number
    priority: 'low' | 'medium' | 'high'
  }>
  hiringTimeline: string
  budgetEstimate: string
  recommendations: string[]
}

interface EnrollmentResult {
  currentEnrollment: number
  capacity: number
  utilizationPercent: number
  forecast: Array<{ term: string; projectedEnrollment: number; confidence: number }>
  trendAnalysis: string
  recommendations: string[]
  capacityAlert: 'none' | 'approaching' | 'near_capacity' | 'over_capacity'
}

interface RevenueResult {
  currentRevenue: number
  projectedAnnual: number
  collectionRate: number
  forecast: Array<{ month: string; projected: number; lower: number; upper: number }>
  riskAreas: string[]
  recommendations: string[]
  overdueAction: string[]
}

interface RiskResult {
  overallRiskScore: number
  risks: Array<{
    category: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    affectedCount: number
    recommendation: string
  }>
  atRiskStudents: Array<{ id: string; name: string; risk: string; action: string }>
  teacherBurnoutRisk: Array<{ id: string; name: string; factors: string[] }>
  quickWins: string[]
}

interface AttendanceResult {
  overallRate: number
  predictions: Array<{ date: string; predictedRate: number; factors: string[] }>
  patterns: {
    dayOfWeek: Record<string, number>
    monthly: Record<string, number>
  }
  chronicAbsentees: Array<{ studentId: string; name: string; rate: number; intervention: string }>
  recommendations: string[]
}

type AnalysisResult = StaffingResult | EnrollmentResult | RevenueResult | RiskResult | AttendanceResult

interface AnalysisState {
  loading: boolean
  error: string | null
  result: AnalysisResult | null
}

type AnalysisStates = Record<AnalysisAction, AnalysisState>

// ──────────────────────────────────────────────────────────────
// Tab Configuration
// ──────────────────────────────────────────────────────────────

interface TabConfig {
  action: AnalysisAction
  label: string
  icon: React.ReactNode
  description: string
  color: string
  bgClass: string
}

const TAB_CONFIGS: TabConfig[] = [
  {
    action: 'staffing',
    label: 'Staffing',
    icon: <Users className="h-4 w-4" />,
    description: 'Teacher-student ratios, subject gaps & hiring needs',
    color: 'text-primary dark:text-primary',
    bgClass: 'bg-primary/5 dark:bg-primary/5',
  },
  {
    action: 'enrollment',
    label: 'Enrollment',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Capacity utilization & enrollment forecasts',
    color: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-950/30',
  },
  {
    action: 'revenue',
    label: 'Revenue',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Revenue projections & collection analysis',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/30',
  },
  {
    action: 'risks',
    label: 'Risks',
    icon: <ShieldAlert className="h-4 w-4" />,
    description: 'Risk scores, alerts & early warnings',
    color: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
  },
  {
    action: 'attendance',
    label: 'Attendance',
    icon: <CalendarCheck className="h-4 w-4" />,
    description: 'Attendance patterns & absentee predictions',
    color: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/30',
  },
]

// ──────────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
}

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
}

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
    case 'medium':
      return 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/40 dark:text-yellow-400'
    case 'low':
      return 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/40 dark:text-green-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    case 'medium':
      return 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/40 dark:text-yellow-400'
    case 'low':
      return 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/40 dark:text-green-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function capacityAlertBadge(alert: string): { label: string; className: string } {
  switch (alert) {
    case 'over_capacity':
      return { label: 'Over Capacity', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' }
    case 'near_capacity':
      return { label: 'Near Capacity', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' }
    case 'approaching':
      return { label: 'Approaching', className: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/40 dark:text-yellow-400' }
    default:
      return { label: 'OK', className: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/40 dark:text-green-400' }
  }
}

function riskScoreColor(score: number): string {
  if (score >= 75) return 'text-rose-600 dark:text-rose-400'
  if (score >= 50) return 'text-orange-600 dark:text-orange-400'
  if (score >= 25) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

function riskScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-rose-500'
  if (score >= 50) return 'bg-orange-500'
  if (score >= 25) return 'bg-yellow-50 dark:bg-yellow-950'
  return 'bg-green-50 dark:bg-green-950'
}

// ──────────────────────────────────────────────────────────────
// Sub-Components
// ──────────────────────────────────────────────────────────────

function LoadingSpinner({ label }: { label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 dark:border-primary/20" />
        <Loader2 className="h-12 w-12 text-primary dark:text-primary animate-spin absolute inset-0" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Running {label} Analysis</p>
        <p className="text-xs text-muted-foreground mt-1">AI is analyzing your school data...</p>
      </div>
    </motion.div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 gap-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-foreground">Analysis Failed</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </motion.div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: {
  title: string
  value: string
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}) {
  return (
    <motion.div variants={staggerItem} className={cn('rounded-xl forge-glass-surface border-white/[0.04] p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-500" />}
          {trend === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground" />}
          {icon && <div className="h-8 w-8 rounded-lg bg-primary/5 dark:bg-primary/5 flex items-center justify-center">{icon}</div>}
        </div>
      </div>
    </motion.div>
  )
}

function RecommendationList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Recommendations
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            className="flex items-start gap-2 text-sm text-muted-foreground"
            variants={staggerItem}
          >
            <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Tab Result Renderers
// ──────────────────────────────────────────────────────────────

function StaffingResults({ data }: { data: StaffingResult }) {
  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="initial" animate="animate">
        <MetricCard
          title="Current Ratio"
          value={`1:${Math.round(data.currentRatio)}`}
          subtitle="Students per teacher"
          icon={<Users className="h-4 w-4 text-primary dark:text-primary" />}
        />
        <MetricCard
          title="Recommended Ratio"
          value={`1:${Math.round(data.recommendedRatio)}`}
          subtitle="Optimal target"
          icon={<Target className="h-4 w-4 text-primary dark:text-primary" />}
        />
        <MetricCard
          title="Teachers Needed"
          value={String(data.additionalTeachersNeeded)}
          subtitle="Additional hires"
          trend={data.additionalTeachersNeeded > 0 ? 'up' : 'neutral'}
          icon={<Users className="h-4 w-4 text-primary dark:text-primary" />}
        />
        <MetricCard
          title="Budget Estimate"
          value={data.budgetEstimate || 'N/A'}
          subtitle="For new hires"
          icon={<DollarSign className="h-4 w-4 text-primary dark:text-primary" />}
        />
      </motion.div>

      {data.subjectGaps.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Subject Coverage Gaps</CardTitle>
              <CardDescription>Subjects needing additional teaching staff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.subjectGaps.map((gap, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium truncate">{gap.subject}</span>
                      <Badge variant="outline" className={priorityColor(gap.priority)}>
                        {gap.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm text-muted-foreground">
                      <span>{gap.currentTeachers} current</span>
                      <span className="text-foreground font-medium">{gap.needed} needed</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.hiringTimeline && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Hiring Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.hiringTimeline}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.recommendations.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardContent className="pt-6">
              <RecommendationList items={data.recommendations} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function EnrollmentResults({ data }: { data: EnrollmentResult }) {
  const alertBadge = capacityAlertBadge(data.capacityAlert)

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="initial" animate="animate">
        <MetricCard
          title="Current Enrollment"
          value={String(data.currentEnrollment)}
          subtitle="Active students"
          icon={<GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />}
        />
        <MetricCard
          title="Capacity"
          value={String(data.capacity)}
          subtitle="Maximum seats"
          icon={<Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
        />
        <MetricCard
          title="Utilization"
          value={`${data.utilizationPercent.toFixed(1)}%`}
          subtitle="Seats filled"
          trend={data.utilizationPercent > 90 ? 'up' : data.utilizationPercent > 70 ? 'neutral' : 'down'}
          icon={<Target className="h-4 w-4 text-green-600 dark:text-green-400" />}
        />
        <MetricCard
          title="Capacity Alert"
          value={alertBadge.label}
          subtitle={`Capacity status`}
          icon={<AlertTriangle className="h-4 w-4 text-green-600 dark:text-green-400" />}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Utilization</CardTitle>
                <CardDescription>Current seat usage</CardDescription>
              </div>
              <Badge variant="outline" className={alertBadge.className}>{alertBadge.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(data.utilizationPercent, 100)} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.currentEnrollment} of {data.capacity} seats occupied ({data.utilizationPercent.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {data.forecast.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Enrollment Forecast</CardTitle>
              <CardDescription>Projected enrollment by term</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.forecast.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{f.term}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">{f.projectedEnrollment}</span>
                      <Badge variant="outline" className="text-xs">
                        {(f.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.trendAnalysis && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.trendAnalysis}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.recommendations.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardContent className="pt-6">
              <RecommendationList items={data.recommendations} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function RevenueResults({ data }: { data: RevenueResult }) {
  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="initial" animate="animate">
        <MetricCard
          title="Current Revenue"
          value={formatCurrency(data.currentRevenue)}
          subtitle="Collected to date"
          icon={<DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
        />
        <MetricCard
          title="Projected Annual"
          value={formatCurrency(data.projectedAnnual)}
          subtitle="End of year estimate"
          trend="up"
          icon={<TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
        />
        <MetricCard
          title="Collection Rate"
          value={formatPercent(data.collectionRate)}
          subtitle="Fees collected vs due"
          trend={data.collectionRate >= 0.9 ? 'up' : data.collectionRate >= 0.7 ? 'neutral' : 'down'}
          icon={<Target className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
        />
        <MetricCard
          title="Forecast Months"
          value={String(data.forecast.length)}
          subtitle="Monthly projections"
          icon={<CalendarCheck className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Collection Rate</CardTitle>
            <CardDescription>Percentage of fees successfully collected</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(data.collectionRate * 100, 100)} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatPercent(data.collectionRate)} of assigned fees collected
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {data.forecast.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Forecast</CardTitle>
              <CardDescription>Projected revenue with confidence bands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.forecast.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-2.5 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium truncate">{f.month}</span>
                    <span className="font-bold text-foreground">{formatCurrency(f.projected)}</span>
                    <span className="text-xs text-muted-foreground">Low: {formatCurrency(f.lower)}</span>
                    <span className="text-xs text-muted-foreground">High: {formatCurrency(f.upper)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.riskAreas.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Risk Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {data.riskAreas.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.overdueAction.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border-yellow-300 dark:border-yellow-700 forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Overdue Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {data.overdueAction.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.recommendations.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardContent className="pt-6">
              <RecommendationList items={data.recommendations} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function RiskResults({ data }: { data: RiskResult }) {
  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      {/* Risk Score Gauge */}
      <motion.div variants={staggerItem}>
        <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Overall Risk Score</CardTitle>
            <CardDescription>Composite score across all risk categories (0-100)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.overallRiskScore / 100) * 314.16} 314.16`}
                    className={riskScoreBarColor(data.overallRiskScore)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn('text-3xl font-bold', riskScoreColor(data.overallRiskScore))}>
                    {data.overallRiskScore}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className={cn('text-lg font-semibold', riskScoreColor(data.overallRiskScore))}>
                  {data.overallRiskScore >= 75 ? 'Critical Risk' : data.overallRiskScore >= 50 ? 'High Risk' : data.overallRiskScore >= 25 ? 'Moderate Risk' : 'Low Risk'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.risks.length} risk categories identified, {data.atRiskStudents.length} at-risk students, {data.teacherBurnoutRisk.length} teachers with burnout indicators
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Categorized Risks */}
      {data.risks.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Categorized Risks</CardTitle>
              <CardDescription>Risks grouped by severity and category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.risks.map((risk, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{risk.category}</span>
                        <Badge variant="outline" className={severityColor(risk.severity)}>{risk.severity}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{risk.affectedCount} affected</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5">{risk.description}</p>
                    <p className="text-xs text-primary dark:text-primary mt-1">
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {risk.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* At-Risk Students */}
      {data.atRiskStudents.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border-rose-200 dark:border-rose-800 forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                At-Risk Students
              </CardTitle>
              <CardDescription>{data.atRiskStudents.length} students flagged for intervention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.atRiskStudents.map((student, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.risk}</p>
                    </div>
                    <p className="text-xs text-primary dark:text-primary shrink-0">{student.action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Teacher Burnout Risk */}
      {data.teacherBurnoutRisk.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border-orange-200 dark:border-orange-800 forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Teacher Burnout Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.teacherBurnoutRisk.map((teacher, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                    <p className="text-sm font-medium">{teacher.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.factors.map((factor, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Wins */}
      {data.quickWins.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border-emerald-200 dark:border-emerald-800 forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                Quick Wins
              </CardTitle>
              <CardDescription>Immediate actions that can reduce risk</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {data.quickWins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function AttendanceResults({ data }: { data: AttendanceResult }) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const dayOfWeekEntries = dayNames
    .filter((d) => d in data.patterns.dayOfWeek)
    .map((d) => [d, data.patterns.dayOfWeek[d]] as const)

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer} initial="initial" animate="animate">
        <MetricCard
          title="Overall Attendance"
          value={formatPercent(data.overallRate)}
          subtitle="School-wide rate"
          trend={data.overallRate >= 0.95 ? 'up' : data.overallRate >= 0.85 ? 'neutral' : 'down'}
          icon={<CalendarCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
        />
        <MetricCard
          title="Chronic Absentees"
          value={String(data.chronicAbsentees.length)}
          subtitle="Below 85% attendance"
          trend={data.chronicAbsentees.length > 0 ? 'down' : 'up'}
          icon={<AlertTriangle className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
        />
        <MetricCard
          title="Predictions"
          value={String(data.predictions.length)}
          subtitle="Upcoming day forecasts"
          icon={<Brain className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
        />
      </motion.div>

      {/* Day-of-Week Patterns */}
      {dayOfWeekEntries.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Day-of-Week Patterns</CardTitle>
              <CardDescription>Attendance rate by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dayOfWeekEntries.map(([day, rate]) => (
                  <div key={day} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day}</span>
                      <span className={cn(
                        'font-semibold',
                        rate >= 0.95 ? 'text-green-600 dark:text-green-400' :
                        rate >= 0.85 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-rose-600 dark:text-rose-400'
                      )}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={rate * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Predictions */}
      {data.predictions.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Upcoming Predictions</CardTitle>
              <CardDescription>AI-predicted attendance for upcoming school days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {data.predictions.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">{p.date}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-semibold',
                        p.predictedRate >= 0.95 ? 'text-green-600 dark:text-green-400' :
                        p.predictedRate >= 0.85 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-rose-600 dark:text-rose-400'
                      )}>
                        {(p.predictedRate * 100).toFixed(1)}%
                      </span>
                      {p.factors.length > 0 && (
                        <Badge variant="outline" className="text-xs">{p.factors[0]}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Chronic Absentees */}
      {data.chronicAbsentees.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border-rose-200 dark:border-rose-800 forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Chronic Absentees
              </CardTitle>
              <CardDescription>Students with attendance below 85%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.chronicAbsentees.map((student, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400">{(student.rate * 100).toFixed(1)}% attendance</p>
                    </div>
                    {student.intervention && (
                      <p className="text-xs text-primary dark:text-primary shrink-0 max-w-[200px]">{student.intervention}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.recommendations.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardContent className="pt-6">
              <RecommendationList items={data.recommendations} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const [schoolId, setSchoolId] = useState('')
  const [activeTab, setActiveTab] = useState<AnalysisAction>('staffing')
  const [states, setStates] = useState<AnalysisStates>({
    staffing: { loading: false, error: null, result: null },
    enrollment: { loading: false, error: null, result: null },
    revenue: { loading: false, error: null, result: null },
    risks: { loading: false, error: null, result: null },
    attendance: { loading: false, error: null, result: null },
  })

  const runAnalysis = useCallback(async (action: AnalysisAction) => {
    if (!schoolId.trim()) return

    setStates((prev) => ({
      ...prev,
      [action]: { loading: true, error: null, result: prev[action].result },
    }))

    try {
      const response = await apiFetch('/api/ai/school-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          data: { schoolId: schoolId.trim(), schoolName: schoolId.trim() },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.error || 'Analysis failed')
      }

      setStates((prev) => ({
        ...prev,
        [action]: { loading: false, error: null, result: json.data as AnalysisResult },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setStates((prev) => ({
        ...prev,
        [action]: { loading: false, error: message, result: prev[action].result },
      }))
    }
  }, [schoolId])

  const currentTab = TAB_CONFIGS.find((t) => t.action === activeTab)!
  const currentState = states[activeTab]

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 animate-fade-in forge-ambient-bg">
        {/* Premium Page Header */}
        <motion.div {...fadeIn} className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-neural/15 backdrop-blur-sm border border-white/[0.04] flex items-center justify-center neural-glow">
                  <Brain className="h-5 w-5 text-neural" />
                </div>
                AI Insights
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5">
                AI-powered analysis for data-driven school management decisions
              </p>
            </div>
            <Badge variant="secondary" className="w-fit text-sm gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              School Admin
            </Badge>
          </div>
        </motion.div>

        {/* School ID Input */}
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Building2 className="h-4 w-4 text-primary dark:text-primary" />
                  <label htmlFor="school-id" className="text-sm font-medium whitespace-nowrap">
                    School ID
                  </label>
                </div>
                <Input
                  id="school-id"
                  type="text"
                  placeholder="Enter your school ID to unlock AI analysis"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="flex-1 max-w-md forge-input-glow"
                />
                {!schoolId.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Enter your school ID above to start running AI analyses
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisAction)}>
          <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
            <TabsList className="w-full sm:w-auto flex-wrap h-auto p-1 gap-1">
              {TAB_CONFIGS.map((tab) => (
                <TabsTrigger
                  key={tab.action}
                  value={tab.action}
                  className="gap-1.5 data-[state=active]:shadow-sm"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {states[tab.action].loading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {states[tab.action].result && !states[tab.action].loading && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-50 dark:bg-green-950" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Tab Content Area */}
          {TAB_CONFIGS.map((tab) => (
            <TabsContent key={tab.action} value={tab.action} className="space-y-4 mt-4">
              {/* Tab Header with Run Button */}
              <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className={tab.color}>{tab.icon}</span>
                    {tab.label} Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground">{tab.description}</p>
                </div>
                <Button
                  onClick={() => runAnalysis(tab.action)}
                  disabled={!schoolId.trim() || states[tab.action].loading}
                  className={cn(
                    'gap-2 shrink-0',
                    'bg-primary hover:bg-primary text-white dark:bg-primary/50 dark:hover:bg-primary'
                  )}
                >
                  {states[tab.action].loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </motion.div>

              {/* State Content */}
              <AnimatePresence mode="wait">
                {states[tab.action].loading && (
                  <LoadingSpinner key={`${tab.action}-loading`} label={tab.label} />
                )}

                {states[tab.action].error && !states[tab.action].loading && (
                  <ErrorState
                    key={`${tab.action}-error`}
                    message={states[tab.action].error!}
                    onRetry={() => runAnalysis(tab.action)}
                  />
                )}

                {!states[tab.action].loading && !states[tab.action].error && !states[tab.action].result && (
                  <motion.div
                    key={`${tab.action}-empty`}
                    className="flex flex-col items-center justify-center py-16 gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center', tab.bgClass)}>
                      <div className={cn('scale-150', tab.color)}>{tab.icon}</div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">No Analysis Yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        {schoolId.trim()
                          ? `Click "Run Analysis" to generate AI-powered ${tab.label.toLowerCase()} insights`
                          : 'Enter your School ID above to get started'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {!states[tab.action].loading && !states[tab.action].error && states[tab.action].result && (
                  <motion.div
                    key={`${tab.action}-result`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {tab.action === 'staffing' && <StaffingResults data={states.staffing.result as StaffingResult} />}
                    {tab.action === 'enrollment' && <EnrollmentResults data={states.enrollment.result as EnrollmentResult} />}
                    {tab.action === 'revenue' && <RevenueResults data={states.revenue.result as RevenueResult} />}
                    {tab.action === 'risks' && <RiskResults data={states.risks.result as RiskResult} />}
                    {tab.action === 'attendance' && <AttendanceResults data={states.attendance.result as AttendanceResult} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
