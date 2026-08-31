'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Landmark,
  School,
  Users,
  BarChart3,
  Shield,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface PerformanceDistribution {
  excellent: number
  good: number
  satisfactory: number
  belowStandard: number
}

interface AlertItem {
  type: 'critical' | 'warning' | 'info'
  message: string
}

interface DistrictResult {
  totalSchools: number
  totalStudents: number
  totalTeachers: number
  averagePerformance: number
  schoolPerformanceDistribution: PerformanceDistribution
  attendanceRate: number
  enrollmentTrend: 'growing' | 'stable' | 'declining'
  keyInsights: string[]
  recommendations: string[]
  alerts: AlertItem[]
}

interface SchoolMetrics {
  averagePerformance: number
  attendanceRate: number
  enrollment: number
  teacherStudentRatio: number
  feeCollectionRate: number
}

interface ComparisonSchool {
  id: string
  name: string
  metrics: SchoolMetrics
  rank: number
  strengths: string[]
  weaknesses: string[]
}

interface Outlier {
  schoolName: string
  metric: string
  value: number
  expected: string
}

interface ComparisonResult {
  schools: ComparisonSchool[]
  rankingCriteria: string
  insights: string[]
  outliers: Outlier[]
}

interface ComplianceSchool {
  id: string
  name: string
  complianceScore: number
  gaps: string[]
  recommendations: string[]
}

interface ComplianceResult {
  overallComplianceRate: number
  schools: ComplianceSchool[]
  commonGaps: string[]
  policyRecommendations: string[]
  trainingNeeds: string[]
}

interface TrendGroup {
  group: string
  values: Array<{ period: string; value: number }>
  trend: 'improving' | 'stable' | 'declining'
  changePercent: number
}

interface Prediction {
  period: string
  predictedValue: number
  confidence: number
}

interface TrendsResult {
  metric: string
  timeframe: string
  data: TrendGroup[]
  insights: string[]
  predictions: Prediction[]
  policyImplications: string[]
}

type ActiveTab = 'district' | 'compare' | 'compliance' | 'trends'

interface ApiError {
  error: string
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const NIGERIAN_REGIONS = [
  'North Central',
  'North East',
  'North West',
  'South East',
  'South South',
  'South West',
]

const NIGERIAN_STATES: Record<string, string[]> = {
  'North Central': ['Benue', 'FCT', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau'],
  'North East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  'North West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'South East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
}

const CURRICULUM_STANDARDS = ['NERDC', 'WAEC', 'NECO', 'UBEC', 'Cambridge']

const METRIC_OPTIONS = [
  { value: 'performance', label: 'Performance' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'teacher_quality', label: 'Teacher Quality' },
] as const

const TIMEFRAME_OPTIONS = [
  { value: 'last_year', label: 'Last Year' },
  { value: 'last_3_years', label: 'Last 3 Years' },
  { value: 'last_5_years', label: 'Last 5 Years' },
] as const

const GROUP_BY_OPTIONS = [
  { value: 'region', label: 'Region' },
  { value: 'state', label: 'State' },
  { value: 'school_type', label: 'School Type' },
] as const

// ──────────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariant = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
}

const tabContentVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.2 } },
}

// ──────────────────────────────────────────────────────────────
// Sub-Components
// ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color = 'indigo',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'stable'
  color?: string
}) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  }

  return (
    <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white', colorMap[color] ?? colorMap.indigo)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-rose-600' : 'text-muted-foreground')}>
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {trend === 'stable' && <span>&#8212;</span>}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )
}

function DistributionBarChart({ distribution }: { distribution: PerformanceDistribution }) {
  const total = distribution.excellent + distribution.good + distribution.satisfactory + distribution.belowStandard
  if (total === 0) return null

  const segments = [
    { label: 'Excellent', value: distribution.excellent, color: 'bg-green-50 dark:bg-green-950', pct: (distribution.excellent / total) * 100 },
    { label: 'Good', value: distribution.good, color: 'bg-indigo-500', pct: (distribution.good / total) * 100 },
    { label: 'Satisfactory', value: distribution.satisfactory, color: 'bg-yellow-50 dark:bg-yellow-950', pct: (distribution.satisfactory / total) * 100 },
    { label: 'Below Standard', value: distribution.belowStandard, color: 'bg-rose-500', pct: (distribution.belowStandard / total) * 100 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn(seg.color, 'transition-all duration-500')}
            style={{ width: `${seg.pct}%` }}
            title={`${seg.label}: ${seg.value} (${seg.pct.toFixed(1)}%)`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <div className={cn('h-2.5 w-2.5 rounded-sm', seg.color)} />
            <span className="text-muted-foreground">{seg.label}:</span>
            <span className="font-semibold">{seg.value}</span>
            <span className="text-muted-foreground">({seg.pct.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightList({ items, icon: Icon = Sparkles, variant = 'default' }: { items: string[]; icon?: React.ComponentType<{ className?: string }>; variant?: 'default' | 'warning' | 'success' }) {
  const variantStyles = {
    default: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30',
    warning: 'border-amber-200 bg-yellow-50 dark:bg-yellow-950/50 dark:border-amber-900 dark:bg-amber-950/30',
    success: 'border-emerald-200 bg-green-50 dark:bg-green-950/50 dark:border-emerald-900 dark:bg-emerald-950/30',
  }

  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <motion.li
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-sm', variantStyles[variant])}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Section Components
// ──────────────────────────────────────────────────────────────

function DistrictSection() {
  const [region, setRegion] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DistrictResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableStates = region ? (NIGERIAN_STATES[region] ?? []) : []

  async function handleAnalyze() {
    if (!region) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await apiFetch('/api/ai/government', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'district',
          data: { region, state: state || undefined },
        }),
      })
      if (!res.ok) {
        const errData = (await res.json()) as ApiError
        throw new Error(errData.error ?? 'Failed to fetch district intelligence')
      }
      const json = (await res.json()) as { success: boolean; data: DistrictResult }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const enrollmentTrendIcon = result?.enrollmentTrend === 'growing' ? TrendingUp : result?.enrollmentTrend === 'declining' ? TrendingDown : BarChart3

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Input Form */}
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
        <h3 className="text-base font-semibold">District Parameters</h3>
        <p className="mt-1 text-sm text-muted-foreground">Select a geopolitical region and optionally a state to analyze.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="district-region" className="text-sm font-medium">Region</label>
            <select
              id="district-region"
              value={region}
              onChange={(e) => { setRegion(e.target.value); setState('') }}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select region...</option>
              {NIGERIAN_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label htmlFor="district-state" className="text-sm font-medium">State (optional)</label>
            <select
              id="district-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={!region}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All states</option>
              {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!region || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="forge-glass-surface border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={School} label="Total Schools" value={result.totalSchools.toLocaleString()} color="indigo" />
              <StatCard icon={Users} label="Total Students" value={result.totalStudents.toLocaleString()} color="emerald" />
              <StatCard icon={Landmark} label="Total Teachers" value={result.totalTeachers.toLocaleString()} color="amber" />
              <StatCard icon={BarChart3} label="Avg Performance" value={`${result.averagePerformance.toFixed(1)}%`} trend={result.averagePerformance >= 60 ? 'up' : 'down'} color="rose" />
            </div>

            {/* Performance Distribution */}
            <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
              <h3 className="text-base font-semibold">Performance Distribution</h3>
              <p className="mt-1 text-sm text-muted-foreground">Student performance across the district</p>
              <div className="mt-4">
                <DistributionBarChart distribution={result.schoolPerformanceDistribution} />
              </div>
            </motion.div>

            {/* Attendance & Enrollment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Attendance Rate</h3>
                  <span className={cn('text-2xl font-bold', result.attendanceRate >= 0.85 ? 'text-green-600 dark:text-green-400' : result.attendanceRate >= 0.7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600')}>
                    {(result.attendanceRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.attendanceRate * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', result.attendanceRate >= 0.85 ? 'bg-green-50 dark:bg-green-950' : result.attendanceRate >= 0.7 ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-rose-500')}
                  />
                </div>
              </motion.div>

              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Enrollment Trend</h3>
                <div className="mt-3 flex items-center gap-3">
                  {result.enrollmentTrend === 'growing' && <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />}
                  {result.enrollmentTrend === 'declining' && <TrendingDown className="h-8 w-8 text-rose-500" />}
                  {result.enrollmentTrend === 'stable' && <BarChart3 className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />}
                  <span className="text-lg font-bold capitalize">{result.enrollmentTrend}</span>
                </div>
              </motion.div>
            </div>

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Active Alerts
                </h3>
                <div className="mt-3 space-y-2">
                  {result.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
                        alert.type === 'critical' && 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950',
                        alert.type === 'warning' && 'border-amber-200 bg-yellow-50 dark:bg-yellow-950 dark:border-amber-900 dark:bg-amber-950',
                        alert.type === 'info' && 'border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950',
                      )}
                    >
                      {alert.type === 'critical' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                      {alert.type === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />}
                      {alert.type === 'info' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />}
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Key Insights */}
            {result.keyInsights.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Key Insights</h3>
                <div className="mt-3">
                  <InsightList items={result.keyInsights} icon={Sparkles} variant="default" />
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Recommendations</h3>
                <div className="mt-3">
                  <InsightList items={result.recommendations} icon={CheckCircle2} variant="success" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComparisonSection() {
  const [schoolIdsInput, setSchoolIdsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    const ids = schoolIdsInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length < 2) {
      setError('Enter at least 2 school IDs separated by commas')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await apiFetch('/api/ai/government', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compare', data: { schoolIds: ids } }),
      })
      if (!res.ok) {
        const errData = (await res.json()) as ApiError
        throw new Error(errData.error ?? 'Failed to compare schools')
      }
      const json = (await res.json()) as { success: boolean; data: ComparisonResult }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
        <h3 className="text-base font-semibold">School IDs to Compare</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enter school IDs separated by commas (minimum 2).</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="compare-ids" className="text-sm font-medium">School IDs</label>
            <input
              id="compare-ids"
              type="text"
              value={schoolIdsInput}
              onChange={(e) => setSchoolIdsInput(e.target.value)}
              placeholder="e.g. sch-001, sch-002, sch-003"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!schoolIdsInput.trim() || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="forge-glass-surface border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </motion.div>
      )}

      {loading && <LoadingSkeleton />}

      <AnimatePresence>
        {result && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {/* Ranking Criteria */}
            <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
              <h3 className="text-base font-semibold">Ranking Criteria</h3>
              <p className="mt-1 text-sm text-muted-foreground">{result.rankingCriteria}</p>
            </motion.div>

            {/* Ranked Comparison Table */}
            <motion.div variants={cardVariant} className="overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="p-5">
                <h3 className="text-base font-semibold">School Rankings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Rank</th>
                      <th className="px-4 py-3 text-left font-medium">School</th>
                      <th className="px-4 py-3 text-right font-medium">Performance</th>
                      <th className="px-4 py-3 text-right font-medium">Attendance</th>
                      <th className="px-4 py-3 text-right font-medium">Enrollment</th>
                      <th className="px-4 py-3 text-right font-medium">T:S Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schools.map((school) => (
                      <tr key={school.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                            school.rank === 1 ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 dark:bg-amber-900 dark:text-yellow-400' :
                            school.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' :
                            school.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                            'bg-muted text-muted-foreground',
                          )}>
                            {school.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{school.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('font-semibold', school.metrics.averagePerformance >= 70 ? 'text-green-600 dark:text-green-400' : school.metrics.averagePerformance >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600')}>
                            {school.metrics.averagePerformance.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{(school.metrics.attendanceRate * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right">{school.metrics.enrollment.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">1:{school.metrics.teacherStudentRatio.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 lg:grid-cols-2">
              {result.schools.map((school) => (
                <motion.div key={school.id} variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                  <h4 className="font-semibold">{school.name}</h4>
                  <div className="mt-3 space-y-3">
                    {school.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Strengths</p>
                        <ul className="mt-1 space-y-1">
                          {school.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {school.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-rose-600">Weaknesses</p>
                        <ul className="mt-1 space-y-1">
                          {school.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Outliers */}
            {result.outliers.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Statistical Outliers
                </h3>
                <div className="mt-3 space-y-2">
                  {result.outliers.map((outlier, idx) => (
                    <div key={idx} className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 text-sm">
                      <span className="font-medium">{outlier.schoolName}</span> — {outlier.metric}: <span className="font-semibold">{outlier.value}</span> (expected: {outlier.expected})
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Insights */}
            {result.insights.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Insights</h3>
                <div className="mt-3">
                  <InsightList items={result.insights} icon={Sparkles} variant="default" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComplianceSection() {
  const [standard, setStandard] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplianceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!standard) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await apiFetch('/api/ai/government', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compliance', data: { curriculumStandard: standard } }),
      })
      if (!res.ok) {
        const errData = (await res.json()) as ApiError
        throw new Error(errData.error ?? 'Failed to check compliance')
      }
      const json = (await res.json()) as { success: boolean; data: ComplianceResult }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
        <h3 className="text-base font-semibold">Curriculum Standard</h3>
        <p className="mt-1 text-sm text-muted-foreground">Select the national curriculum standard to audit against.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="compliance-standard" className="text-sm font-medium">Standard</label>
            <select
              id="compliance-standard"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select standard...</option>
              {CURRICULUM_STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!standard || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? 'Checking...' : 'Check Compliance'}
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="forge-glass-surface border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </motion.div>
      )}

      {loading && <LoadingSkeleton />}

      <AnimatePresence>
        {result && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {/* Overall Compliance */}
            <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Overall Compliance Rate</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Against {standard} standard</p>
                </div>
                <span className={cn(
                  'text-3xl font-bold',
                  result.overallComplianceRate >= 80 ? 'text-green-600 dark:text-green-400' :
                  result.overallComplianceRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600',
                )}>
                  {result.overallComplianceRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.overallComplianceRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    result.overallComplianceRate >= 80 ? 'bg-green-50 dark:bg-green-950' :
                    result.overallComplianceRate >= 60 ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-rose-500',
                  )}
                />
              </div>
            </motion.div>

            {/* Per-School Compliance */}
            <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
              <h3 className="text-base font-semibold">Per-School Compliance</h3>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {result.schools.map((school) => (
                  <div key={school.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{school.name}</span>
                      <span className={cn(
                        'text-sm font-bold',
                        school.complianceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        school.complianceScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600',
                      )}>
                        {school.complianceScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          school.complianceScore >= 80 ? 'bg-green-50 dark:bg-green-950' :
                          school.complianceScore >= 60 ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-rose-500',
                        )}
                        style={{ width: `${school.complianceScore}%` }}
                      />
                    </div>
                    {school.gaps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {school.gaps.map((gap, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                            {gap}
                          </span>
                        ))}
                      </div>
                    )}
                    {school.recommendations.length > 0 && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {school.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Common Gaps */}
            {result.commonGaps.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  Common Gaps
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.commonGaps.map((gap, i) => (
                    <span key={i} className="inline-flex items-center rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-400">
                      {gap}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Policy Recommendations */}
            {result.policyRecommendations.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Policy Recommendations</h3>
                <div className="mt-3">
                  <InsightList items={result.policyRecommendations} icon={Landmark} variant="warning" />
                </div>
              </motion.div>
            )}

            {/* Training Needs */}
            {result.trainingNeeds.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Training Needs</h3>
                <div className="mt-3">
                  <InsightList items={result.trainingNeeds} icon={Users} variant="default" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrendsSection() {
  const [metric, setMetric] = useState<string>('')
  const [timeframe, setTimeframe] = useState<string>('')
  const [groupBy, setGroupBy] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrendsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!metric || !timeframe) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await apiFetch('/api/ai/government', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trends',
          data: { metric, timeframe, groupBy: groupBy || undefined },
        }),
      })
      if (!res.ok) {
        const errData = (await res.json()) as ApiError
        throw new Error(errData.error ?? 'Failed to analyze trends')
      }
      const json = (await res.json()) as { success: boolean; data: TrendsResult }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
        <h3 className="text-base font-semibold">Trend Parameters</h3>
        <p className="mt-1 text-sm text-muted-foreground">Select the metric, timeframe, and grouping for national trend analysis.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="trend-metric" className="text-sm font-medium">Metric</label>
            <select
              id="trend-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select metric...</option>
              {METRIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="trend-timeframe" className="text-sm font-medium">Timeframe</label>
            <select
              id="trend-timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select timeframe...</option>
              {TIMEFRAME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="trend-group" className="text-sm font-medium">Group By</label>
            <select
              id="trend-group"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Default</option>
              {GROUP_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={!metric || !timeframe || loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {loading ? 'Analyzing...' : 'Analyze Trends'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="forge-glass-surface border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </motion.div>
      )}

      {loading && <LoadingSkeleton />}

      <AnimatePresence>
        {result && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {/* Overview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={BarChart3} label="Metric" value={result.metric} color="indigo" />
              <StatCard icon={Globe} label="Timeframe" value={result.timeframe} color="emerald" />
            </div>

            {/* Trend Data Per Group */}
            <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
              <h3 className="text-base font-semibold">Trend Data by Group</h3>
              <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                {result.data.map((group, idx) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{group.group}</span>
                        {group.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
                        {group.trend === 'declining' && <TrendingDown className="h-4 w-4 text-rose-500" />}
                        {group.trend === 'stable' && <span className="text-xs font-medium text-muted-foreground">Stable</span>}
                      </div>
                      <span className={cn(
                        'text-sm font-bold',
                        group.changePercent > 0 ? 'text-green-600 dark:text-green-400' : group.changePercent < 0 ? 'text-rose-600' : 'text-muted-foreground',
                      )}>
                        {group.changePercent > 0 ? '+' : ''}{group.changePercent.toFixed(1)}%
                      </span>
                    </div>
                    {/* Mini bar chart of values over time */}
                    <div className="mt-3 flex items-end gap-1">
                      {group.values.map((v, vi) => {
                        const maxVal = Math.max(...group.values.map((x) => x.value), 1)
                        const heightPct = (v.value / maxVal) * 100
                        return (
                          <div key={vi} className="flex flex-1 flex-col items-center gap-1">
                            <div className="relative w-full">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ duration: 0.5, delay: vi * 0.05 }}
                                className={cn(
                                  'w-full rounded-t-sm min-h-[4px]',
                                  group.trend === 'improving' ? 'bg-emerald-400' :
                                  group.trend === 'declining' ? 'bg-rose-400' : 'bg-indigo-400',
                                )}
                                style={{ maxHeight: '80px' }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{v.period}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Predictions */}
            {result.predictions.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Predictions
                </h3>
                <div className="mt-4 space-y-3">
                  {result.predictions.map((pred, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-3">
                      <div>
                        <p className="text-sm font-medium">{pred.period}</p>
                        <p className="text-xs text-muted-foreground">Predicted value: <span className="font-semibold">{pred.predictedValue.toFixed(1)}</span></p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-sm font-bold',
                          pred.confidence >= 0.8 ? 'text-green-600 dark:text-green-400' :
                          pred.confidence >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600',
                        )}>
                          {(pred.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Policy Implications */}
            {result.policyImplications.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Landmark className="h-5 w-5 text-indigo-500" />
                  Policy Implications
                </h3>
                <div className="mt-3">
                  <InsightList items={result.policyImplications} icon={Landmark} variant="warning" />
                </div>
              </motion.div>
            )}

            {/* Insights */}
            {result.insights.length > 0 && (
              <motion.div variants={cardVariant} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5">
                <h3 className="text-base font-semibold">Key Insights</h3>
                <div className="mt-3">
                  <InsightList items={result.insights} icon={Sparkles} variant="default" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────────────────────

const TABS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'district', label: 'District Intelligence', icon: Landmark },
  { id: 'compare', label: 'School Comparison', icon: School },
  { id: 'compliance', label: 'Curriculum Compliance', icon: Shield },
  { id: 'trends', label: 'National Trends', icon: Globe },
]

export default function DistrictIntelligencePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('district')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    District Intelligence Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Government &amp; Ministry Education Analytics — ExamForge
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <Shield className="h-3.5 w-3.5" />
                Restricted Access
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-8">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Sidebar Tabs */}
            <nav className="flex shrink-0 flex-col gap-1 lg:w-56">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </nav>

            {/* Tab Content */}
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabContentVariant}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {activeTab === 'district' && <DistrictSection />}
                  {activeTab === 'compare' && <ComparisonSection />}
                  {activeTab === 'compliance' && <ComplianceSection />}
                  {activeTab === 'trends' && <TrendsSection />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
