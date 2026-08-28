'use client'

// ============================================================================
// ExamForge AI — Predictive Analytics Dashboard
// ============================================================================
// School admin access to AI-powered predictive analytics:
// - Dropout prediction
// - Failure prediction
// - Attendance prediction
// - Revenue prediction
// ============================================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendingDown,
  AlertTriangle,
  Users,
  DollarSign,
  CalendarClock,
  GraduationCap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type PredictionTab = 'dropout' | 'failure' | 'attendance' | 'revenue'

interface DropoutResult {
  studentId: string
  studentName: string
  dropoutProbability: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  primaryFactors: Array<{ factor: string; weight: number; currentValue: string; threshold: string }>
  recommendedActions: string[]
}

interface FailureResult {
  studentId: string
  studentName: string
  examTitle: string
  failureProbability: number
  predictedScore: number
  confidence: number
  weakAreas: string[]
  studyRecommendations: string[]
}

interface AttendanceResult {
  studentName: string
  chronicAbsenceRisk: number
  patternType: string
  interventions: string[]
}

interface RevenueResult {
  month: string
  projectedRevenue: number
  lowerBound: number
  upperBound: number
  confidence: number
  collectionRate: number
  riskFactors: string[]
}

interface TabState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function PredictiveAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<PredictionTab>('dropout')
  const [dropout, setDropout] = useState<TabState<DropoutResult[]>>({ data: null, loading: false, error: null })
  const [failure, setFailure] = useState<TabState<FailureResult[]>>({ data: null, loading: false, error: null })
  const [attendance, setAttendance] = useState<TabState<AttendanceResult>>({ data: null, loading: false, error: null })
  const [revenue, setRevenue] = useState<TabState<RevenueResult[]>>({ data: null, loading: false, error: null })
  const [examId, setExamId] = useState('')
  const [studentId, setStudentId] = useState('')

  // ── API Call Helper ──
  const callAPI = async (action: string, data: Record<string, unknown> = {}) => {
    const response = await fetch('/api/ai/predictive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Prediction failed')
    return result.data
  }

  // ── Run Predictions ──
  const runDropoutPrediction = async () => {
    setDropout({ data: null, loading: true, error: null })
    try {
      const data = await callAPI('dropout')
      setDropout({ data, loading: false, error: null })
    } catch (err) {
      setDropout({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const runFailurePrediction = async () => {
    if (!examId) return
    setFailure({ data: null, loading: true, error: null })
    try {
      const data = await callAPI('failure', { examId })
      setFailure({ data, loading: false, error: null })
    } catch (err) {
      setFailure({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const runAttendancePrediction = async () => {
    if (!studentId) return
    setAttendance({ data: null, loading: true, error: null })
    try {
      const data = await callAPI('attendance', { studentId, daysToPredict: 14 })
      setAttendance({ data, loading: false, error: null })
    } catch (err) {
      setAttendance({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const runRevenuePrediction = async () => {
    setRevenue({ data: null, loading: true, error: null })
    try {
      const data = await callAPI('revenue', { monthsToPredict: 6 })
      setRevenue({ data, loading: false, error: null })
    } catch (err) {
      setRevenue({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const tabs: Array<{ id: PredictionTab; label: string; icon: React.ReactNode }> = [
    { id: 'dropout', label: 'Dropout Risk', icon: <TrendingDown className="h-4 w-4" /> },
    { id: 'failure', label: 'Failure Prediction', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4" /> },
  ]

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-destructive bg-destructive/10 dark:text-destructive'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/50 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400'
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neural/15 backdrop-blur-sm border border-white/[0.04] neural-glow">
            <Brain className="h-5 w-5 text-neural" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Predictive Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1.5">AI-powered predictions for student outcomes and school metrics</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Dropout Prediction */}
        {activeTab === 'dropout' && (
          <motion.div key="dropout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <h2 className="text-lg font-semibold text-foreground">Dropout Risk Prediction</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI analyzes attendance, performance, and engagement data to predict which students are at risk of dropping out.
              </p>
              <button
                onClick={runDropoutPrediction}
                disabled={dropout.loading}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
              >
                {dropout.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Run Dropout Prediction
              </button>
            </div>

            {dropout.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Analyzing student data...</span>
              </div>
            )}

            {dropout.error && (
              <div className="rounded-lg bg-destructive/10 p-4 dark:bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{dropout.error}</span>
                </div>
              </div>
            )}

            {dropout.data && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{dropout.data.length} students analyzed</span>
                </div>
                {dropout.data
                  .sort((a, b) => b.dropoutProbability - a.dropoutProbability)
                  .map((student, i) => (
                    <motion.div
                      key={student.studentId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="forge-glass-surface border-white/[0.04] rounded-lg forge-card-shadow p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{student.studentName}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', riskColor(student.riskLevel))}>
                              {student.riskLevel.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(student.dropoutProbability * 100).toFixed(0)}% dropout probability
                            </span>
                          </div>
                        </div>
                        <div className="relative h-12 w-12">
                          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none" stroke="#e5e7eb" strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={student.dropoutProbability > 0.7 ? '#ef4444' : student.dropoutProbability > 0.4 ? '#f59e0b' : '#22c55e'}
                              strokeWidth="3"
                              strokeDasharray={`${student.dropoutProbability * 100}, 100`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                            {(student.dropoutProbability * 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      {student.primaryFactors.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {student.primaryFactors.slice(0, 3).map((f, j) => (
                            <span key={j} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              {f.factor} ({(f.weight * 100).toFixed(0)}%)
                            </span>
                          ))}
                        </div>
                      )}
                      {student.recommendedActions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">Recommended Actions:</p>
                          <ul className="mt-1 space-y-0.5">
                            {student.recommendedActions.slice(0, 2).map((action, j) => (
                              <li key={j} className="flex items-start gap-1 text-xs text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Failure Prediction */}
        {activeTab === 'failure' && (
          <motion.div key="failure" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <h2 className="text-lg font-semibold text-foreground">Exam Failure Prediction</h2>
              <p className="mt-1 text-sm text-muted-foreground">Predict which students are likely to fail an upcoming exam.</p>
              <div className="mt-4 flex gap-3">
                <input
                  type="text"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  placeholder="Enter Exam ID"
                  className="flex-1 forge-glass-surface border-white/[0.04] rounded-lg px-3 py-2 text-sm forge-input-glow"
                />
                <button
                  onClick={runFailurePrediction}
                  disabled={failure.loading || !examId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary neural-glow px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
                >
                  {failure.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Predict
                </button>
              </div>
            </div>

            {failure.data && (
              <div className="space-y-3">
                {failure.data.sort((a, b) => b.failureProbability - a.failureProbability).map((student, i) => (
                  <div key={student.studentId} className="forge-glass-surface border-white/[0.04] rounded-lg forge-card-shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{student.studentName}</h3>
                        <p className="text-xs text-muted-foreground">Predicted: {student.predictedScore.toFixed(0)}% | Failure risk: {(student.failureProbability * 100).toFixed(0)}% | Confidence: {(student.confidence * 100).toFixed(0)}%</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', student.failureProbability > 0.6 ? 'text-destructive bg-destructive/10' : student.failureProbability > 0.3 ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100')}>
                        {student.failureProbability > 0.6 ? 'High Risk' : student.failureProbability > 0.3 ? 'Medium Risk' : 'Low Risk'}
                      </span>
                    </div>
                    {student.weakAreas.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {student.weakAreas.map((area, j) => (
                          <span key={j} className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive dark:bg-destructive/10 dark:text-destructive">{area}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Attendance Prediction */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <h2 className="text-lg font-semibold text-foreground">Attendance Prediction</h2>
              <p className="mt-1 text-sm text-muted-foreground">Predict future attendance patterns for individual students.</p>
              <div className="mt-4 flex gap-3">
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter Student ID"
                  className="flex-1 forge-glass-surface border-white/[0.04] rounded-lg px-3 py-2 text-sm forge-input-glow"
                />
                <button
                  onClick={runAttendancePrediction}
                  disabled={attendance.loading || !studentId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary neural-glow px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
                >
                  {attendance.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Predict
                </button>
              </div>
            </div>

            {attendance.data && (
              <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-primary/10 p-4 dark:bg-blue-950/30">
                    <p className="text-xs text-primary">Student</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{attendance.data.studentName}</p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 dark:bg-amber-950/30">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Chronic Absence Risk</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{(attendance.data.chronicAbsenceRisk * 100).toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Pattern</p>
                    <p className="mt-1 text-lg font-bold capitalize text-foreground">{attendance.data.patternType}</p>
                  </div>
                </div>
                {attendance.data.interventions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">Recommended Interventions</h3>
                    <ul className="mt-2 space-y-1">
                      {attendance.data.interventions.map((intervention: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {intervention}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Revenue Prediction */}
        {activeTab === 'revenue' && (
          <motion.div key="revenue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <h2 className="text-lg font-semibold text-foreground">Revenue Prediction</h2>
              <p className="mt-1 text-sm text-muted-foreground">6-month revenue forecast based on historical payment patterns.</p>
              <button
                onClick={runRevenuePrediction}
                disabled={revenue.loading}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
              >
                {revenue.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Revenue Forecast
              </button>
            </div>

            {revenue.data && (
              <div className="space-y-3">
                {revenue.data.map((month, i) => (
                  <motion.div
                    key={month.month}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="forge-glass-surface border-white/[0.04] rounded-lg forge-card-shadow p-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{month.month}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence: {(month.confidence * 100).toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">Collection: {(month.collectionRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary dark:text-primary">
                        {month.projectedRevenue.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({month.lowerBound.toLocaleString()} - {month.upperBound.toLocaleString()})
                      </span>
                    </div>
                    {month.riskFactors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {month.riskFactors.map((factor, j) => (
                          <span key={j} className="rounded bg-yellow-50 dark:bg-yellow-950 px-2 py-0.5 text-[10px] text-yellow-700 dark:text-yellow-400 dark:bg-amber-950/30 dark:text-yellow-400">
                            <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />{factor}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
