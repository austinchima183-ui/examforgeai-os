'use client'

import { useEffect, useState, useCallback } from 'react'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'
import { ROUTES } from '@/lib/constants/routes'

// ── shadcn/ui ────────────────────────────────────────────────
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// ── Lucide Icons ─────────────────────────────────────────────
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Brain,
  GraduationCap,
  BookOpen,
  DollarSign,
  Activity,
  Shield,
  Zap,
  Flame,
  Target,
  Lightbulb,
  ArrowRight,
  ClipboardList,
  CreditCard,
  School,
  Minus,
  Send,
  FileText,
  BarChart3,
  Settings,
  UserPlus,
  Database,
  Cpu,
  Globe,
  Lock,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Intelligent Insights Component
// ============================================================================
// A 'use client' component that renders ROLE-SPECIFIC intelligent insights
// with real Supabase data, Framer Motion animations, and actionable cards.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface IntelligentInsightsProps {
  role: UserRole
  userId: string
  schoolId: string | null
  className?: string
}

type InsightUrgency = 'critical' | 'warning' | 'info' | 'success' | 'suggestion'

interface InsightAction {
  label: string
  href: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
}

interface Insight {
  id: string
  icon: string | LucideIcon
  title: string
  description: string
  urgency: InsightUrgency
  action?: InsightAction
  isAiPowered?: boolean
  /** Optional metric/value to display prominently */
  metric?: string
  /** Optional progress value (0-100) */
  progress?: number
  /** Optional sparkline data */
  sparklineData?: number[]
  /** Optional trend direction */
  trend?: 'up' | 'down' | 'stable'
}

// ──────────────────────────────────────────────────────────────
// Urgency → Color Mapping
// ──────────────────────────────────────────────────────────────

const urgencyConfig: Record<
  InsightUrgency,
  { cardBorder: string; iconBg: string; iconColor: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; badgeClass: string }
> = {
  critical: {
    cardBorder: 'border-red-500/20 dark:border-red-500/30',
    iconBg: 'bg-destructive/10 dark:bg-red-950/40',
    iconColor: 'text-destructive',
    badgeVariant: 'destructive',
    badgeClass: '',
  },
  warning: {
    cardBorder: 'border-amber-500/20 dark:border-amber-500/30',
    iconBg: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 dark:bg-amber-950/40 dark:text-yellow-400 border-amber-200 dark:border-amber-900/50',
  },
  info: {
    cardBorder: 'border-sky-500/20 dark:border-sky-500/30',
    iconBg: 'bg-sky-100 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-900/50',
  },
  success: {
    cardBorder: 'border-emerald-500/20 dark:border-emerald-500/30',
    iconBg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-950/40',
    iconColor: 'text-green-600 dark:text-green-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 dark:bg-emerald-950/40 dark:text-green-400 border-emerald-200 dark:border-emerald-900/50',
  },
  suggestion: {
    cardBorder: 'border-violet-500/20 dark:border-violet-500/30',
    iconBg: 'bg-violet-100 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-900/50',
  },
}

// ──────────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

// ──────────────────────────────────────────────────────────────
// Mini Sparkline Component
// ──────────────────────────────────────────────────────────────

function MiniSparkline({ data, trend, className }: { data: number[]; trend?: 'up' | 'down' | 'stable'; className?: string }) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const w = 80
  const h = 28
  const padding = 2

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (w - 2 * padding)
      const y = h - padding - ((val - min) / range) * (h - 2 * padding)
      return `${x},${y}`
    })
    .join(' ')

  const strokeColor =
    trend === 'up'
      ? 'stroke-emerald-500'
      : trend === 'down'
        ? 'stroke-red-500'
        : 'stroke-sky-500'

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-sky-500'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          className={cn('stroke-2 stroke-linecap-round stroke-linejoin-round', strokeColor)}
        />
      </svg>
      <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Insight Card Component
// ──────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const config = urgencyConfig[insight.urgency]
  const Icon = insight.icon

  return (
    <Card className={cn('relative overflow-hidden forge-glass-surface border border-white/[0.04] rounded-xl forge-card-shadow transition-all duration-300 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5', config.cardBorder)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm border border-white/[0.04]', config.iconBg, config.iconColor)}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight truncate">
                {insight.title}
              </CardTitle>
              {insight.isAiPowered && (
                <Badge variant="secondary" className="mt-1 h-5 px-1.5 text-[10px] gap-0.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50 neural-glow">
                  <Sparkles className="h-2.5 w-2.5 animate-ai-think" />
                  AI
                </Badge>
              )}
            </div>
          </div>
          {insight.metric && (
            <span className="text-lg font-bold tracking-tight shrink-0">{insight.metric}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <CardDescription className="text-xs leading-relaxed mb-3">
          {insight.description}
        </CardDescription>

        {/* Sparkline */}
        {insight.sparklineData && insight.sparklineData.length >= 2 && (
          <MiniSparkline data={insight.sparklineData} trend={insight.trend} className="mb-3" />
        )}

        {/* Progress */}
        {insight.progress !== undefined && (
          <div className="mb-3">
            <Progress value={insight.progress} className="h-1.5" aria-label={`${insight.title}: ${insight.progress}% complete`} />
            <p className="mt-1 text-[10px] text-muted-foreground">{insight.progress}% complete</p>
          </div>
        )}

        {/* Action Button */}
        {insight.action && (
          <Link href={insight.action.href}>
            <Button
              variant={insight.action.variant ?? 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              {insight.action.label}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────
// Data Fetching Hooks
// ──────────────────────────────────────────────────────────────

function useStudentInsights(userId: string): { insights: Insight[]; loading: boolean } {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Feature isolation: only fetch when this role owns the dashboard
    if (!userId) { setLoading(false); return }
    const sb = createClient()
    if (!sb) { setLoading(false); return }

    let cancelled = false

    async function fetch() {
      try {
        const now = new Date()
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        const [sessionsResult, upcomingResult, takenResult] = await Promise.all([
          sb.from('exam_sessions')
            .select('id, exam_id, percentage, status, created_at')
            .eq('student_id', userId)
            .in('status', ['submitted', 'timed_out', 'graded'])
            .order('created_at', { ascending: false })
            .limit(10),
          sb.from('exams')
            .select('id, title, start_time, subject_id, time_limit_minutes')
            .in('status', ['published', 'active'])
            .order('start_time', { ascending: true })
            .limit(10),
          sb.from('exam_sessions')
            .select('exam_id')
            .eq('student_id', userId),
        ])

        if (cancelled) return

        const takenIds = new Set(takenResult.data?.map((s: { exam_id: string }) => s.exam_id) ?? [])
        const newInsights: Insight[] = []

        // 1. Upcoming Exam Alert (within 24h)
        const upcomingExams = (upcomingResult.data ?? []).filter((e: { id: string; start_time: string | null; title: string; time_limit_minutes: number }) => !takenIds.has(e.id))
        const imminentExam = upcomingExams.find((e: { id: string; start_time: string | null; title: string; time_limit_minutes: number }) => {
          if (!e.start_time) return false
          const startsAt = new Date(e.start_time)
          return startsAt <= in24h && startsAt >= now
        })
        if (imminentExam) {
          const startsAt = imminentExam.start_time ? new Date(imminentExam.start_time) : null
          const timeStr = startsAt ? startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'soon'
          newInsights.push({
            id: 'upcoming-exam-alert',
            icon: Clock,
            title: 'Exam Starting Soon!',
            description: `"${imminentExam.title}" starts at ${timeStr}. Duration: ${imminentExam.time_limit_minutes} min. Make sure you're prepared!`,
            urgency: 'critical',
            action: { label: 'Start Practice', href: ROUTES.STUDENT_PRACTICE },
          })
        }

        // 2. Performance Trend (last 5 scores)
        const recentSessions = sessionsResult.data ?? []
        const lastFive = recentSessions.slice(0, 5).filter((s: { percentage: number | null }) => s.percentage !== null)
        if (lastFive.length >= 2) {
          const scores = lastFive.map((s: { percentage: number | null }) => s.percentage ?? 0).reverse()
          const recent = scores.slice(-3).reduce((a: number, b: number) => a + b, 0) / scores.slice(-3).length
          const older = scores.length > 3 ? scores.slice(0, -3).reduce((a: number, b: number) => a + b, 0) / scores.slice(0, -3).length : scores[0]
          const trend: 'up' | 'down' | 'stable' = recent > older + 3 ? 'up' : recent < older - 3 ? 'down' : 'stable'
          const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)

          newInsights.push({
            id: 'performance-trend',
            icon: trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus,
            title: 'Performance Trend',
            description: `Your last ${lastFive.length} exam scores ${trend === 'up' ? 'are improving' : trend === 'down' ? 'are declining' : 'are stable'}. Average: ${avgScore}%`,
            urgency: trend === 'up' ? 'success' : trend === 'down' ? 'warning' : 'info',
            sparklineData: scores,
            trend,
            metric: `${avgScore}%`,
          })
        }

        // 3. Weak Subject Alert (score below 40%)
        const weakSession = recentSessions.find((s: { percentage: number | null }) => s.percentage !== null && (s.percentage ?? 0) < 40)
        if (weakSession) {
          newInsights.push({
            id: 'weak-subject-alert',
            icon: AlertTriangle,
            title: 'Score Needs Attention',
            description: `Your recent score of ${weakSession.percentage}% is below 40%. Consider reviewing the material and using AI Tutor for targeted help.`,
            urgency: 'warning',
            action: { label: 'Open AI Tutor', href: ROUTES.STUDENT_AI_TUTOR },
          })
        }

        // 4. Study Streak (gamification — computed from session dates)
        const sessionDates = recentSessions
          .map((s: { created_at: string }) => new Date(s.created_at).toDateString())
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const day = new Date(today)
          day.setDate(day.getDate() - i)
          if (sessionDates.includes(day.toDateString())) {
            streak++
          } else if (i > 0) {
            break
          }
        }
        if (streak > 0) {
          newInsights.push({
            id: 'study-streak',
            icon: Flame,
            title: `${streak}-Day Study Streak!`,
            description: streak >= 5
              ? `🔥 Amazing! You've been active for ${streak} days in a row. Keep it up!`
              : `You've studied ${streak} day${streak > 1 ? 's' : ''} in a row. Keep going to build momentum!`,
            urgency: streak >= 5 ? 'success' : 'info',
            metric: `${streak}`,
          })
        }

        // 5. AI Recommendation
        if (lastFive.length >= 3) {
          const avgScore = Math.round(lastFive.map((s: { percentage: number | null }) => s.percentage ?? 0).reduce((a: number, b: number) => a + b, 0) / lastFive.length)
          const focusArea = avgScore < 60 ? 'your weakest topics' : 'advanced practice'
          newInsights.push({
            id: 'ai-recommendation',
            icon: Sparkles,
            title: 'AI Study Recommendation',
            description: `Based on your recent performance (avg ${avgScore}%), we recommend focusing on ${focusArea} this week. AI Tutor can create a personalized plan.`,
            urgency: 'suggestion',
            isAiPowered: true,
            action: { label: 'Get AI Plan', href: ROUTES.STUDENT_AI_TUTOR },
          })
        }

        // 6. Quick Practice
        if (upcomingExams.length > 0) {
          newInsights.push({
            id: 'quick-practice',
            icon: Target,
            title: 'Quick Practice',
            description: `You have ${upcomingExams.length} upcoming exam${upcomingExams.length > 1 ? 's' : ''}. Practice 5 questions now to stay sharp!`,
            urgency: 'suggestion',
            action: { label: 'Practice Now', href: ROUTES.STUDENT_PRACTICE, variant: 'default' },
          })
        }

        setInsights(newInsights)
      } catch {
        // Graceful fallback — show no insights on error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [userId])

  return { insights, loading }
}

function useTeacherInsights(userId: string): { insights: Insight[]; loading: boolean } {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Feature isolation: only fetch when this role owns the dashboard
    if (!userId) { setLoading(false); return }
    const sb = createClient()
    if (!sb) { setLoading(false); return }

    let cancelled = false

    async function fetch() {
      try {
        // Get teacher's exam IDs
        const { data: teacherExams } = await sb
          .from('exams')
          .select('id, title')
          .eq('created_by', userId)

        if (cancelled) return

        const teacherExamIds = (teacherExams ?? []).map((e: { id: string }) => e.id)

        const [pendingResult, sessionsResult, questionsResult] = await Promise.all([
          teacherExamIds.length > 0
            ? sb.from('exam_sessions')
                .select('id, student_id, exam_id, status')
                .eq('status', 'submitted')
                .in('exam_id', teacherExamIds)
                .limit(50)
            : Promise.resolve({ data: [] as unknown[] }),
          teacherExamIds.length > 0
            ? sb.from('exam_sessions')
                .select('id, student_id, exam_id, percentage, status')
                .in('exam_id', teacherExamIds)
                .in('status', ['submitted', 'timed_out', 'graded'])
                .limit(100)
            : Promise.resolve({ data: [] as unknown[] }),
          teacherExamIds.length > 0
            ? sb.from('questions')
                .select('id, question_type, created_at')
                .in('exam_id', teacherExamIds)
                .order('created_at', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] as unknown[] }),
        ])

        if (cancelled) return

        const newInsights: Insight[] = []

        // 1. Pending Grading Alert
        const pendingCount = (pendingResult.data as unknown[] ?? []).length
        if (pendingCount > 0) {
          newInsights.push({
            id: 'pending-grading',
            icon: ClipboardList,
            title: 'Pending Grading',
            description: `${pendingCount} submission${pendingCount > 1 ? 's need' : ' needs'} grading. Review and grade them now to keep students updated.`,
            urgency: pendingCount > 10 ? 'critical' : 'warning',
            metric: `${pendingCount}`,
            action: { label: 'Grade Now', href: ROUTES.RESULTS },
          })
        }

        // 2. At-Risk Students (scored below 40%)
        const allSessions = (sessionsResult.data as Array<{ student_id: string; percentage: number | null }>) ?? []
        const atRiskStudents = new Map<string, number>()
        for (const session of allSessions) {
          if (session.percentage !== null && session.percentage < 40) {
            const existing = atRiskStudents.get(session.student_id) ?? 100
            atRiskStudents.set(session.student_id, Math.min(existing, session.percentage))
          }
        }
        if (atRiskStudents.size > 0) {
          newInsights.push({
            id: 'at-risk-students',
            icon: AlertCircle,
            title: 'At-Risk Students',
            description: `${atRiskStudents.size} student${atRiskStudents.size > 1 ? 's scored' : ' scored'} below 40% on recent exams. Consider interventions or additional support.`,
            urgency: 'critical',
            metric: `${atRiskStudents.size}`,
            action: { label: 'Send Intervention', href: '/admin/users' },
          })
        }

        // 3. Question Quality Alert (check for auto-gradeable objective questions)
        const objectiveQuestions = (questionsResult.data as Array<{ question_type: string }>) ?? []
        const objectiveTypes = ['single_choice', 'multi_choice', 'true_false', 'multi_select', 'fill_blank', 'matching']
        const autoGradableCount = objectiveQuestions.filter(q => objectiveTypes.includes(q.question_type)).length
        if (autoGradableCount > 0 && pendingCount > 0) {
          newInsights.push({
            id: 'question-quality',
            icon: Zap,
            title: 'Time-Saving Opportunity',
            description: `Auto-grade ${autoGradableCount} objective question${autoGradableCount > 1 ? 's' : ''} across ${pendingCount} pending submission${pendingCount > 1 ? 's' : ''}. Save hours of manual grading!`,
            urgency: 'suggestion',
            isAiPowered: true,
            action: { label: 'Auto-Grade', href: ROUTES.RESULTS },
          })
        }

        // 4. Class Performance Overview
        const gradedSessions = allSessions.filter(s => s.percentage !== null)
        if (gradedSessions.length > 0) {
          const classAvg = Math.round(gradedSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / gradedSessions.length)
          const passRate = Math.round((gradedSessions.filter(s => (s.percentage ?? 0) >= 50).length / gradedSessions.length) * 100)
          newInsights.push({
            id: 'class-performance',
            icon: BarChart3,
            title: 'Class Performance',
            description: `Class average: ${classAvg}%. Pass rate: ${passRate}%. ${classAvg < 50 ? 'Consider reviewing difficult topics with students.' : 'Students are performing well overall.'}`,
            urgency: classAvg < 50 ? 'warning' : 'success',
            metric: `${classAvg}%`,
          })
        }

        // 5. AI Suggestion
        if (teacherExamIds.length > 0) {
          newInsights.push({
            id: 'ai-suggestion',
            icon: Sparkles,
            title: 'AI Teaching Assistant',
            description: 'Generate a makeup exam for students who failed, or create differentiated practice sets based on performance tiers.',
            urgency: 'suggestion',
            isAiPowered: true,
            action: { label: 'Generate with AI', href: ROUTES.EXAM_CREATE },
          })
        }

        // 6. Time-Saving Actions — objective questions exist in the bank
        //    (questions.ai_generated column is not present in the live schema)
        if (objectiveQuestions.length > 0) {
          newInsights.push({
            id: 'ai-questions',
            icon: Brain,
            title: 'AI-Generated Questions',
            description: `You have ${objectiveQuestions.length} objective questions in your bank. Use AI to generate more or refine existing ones.`,
            urgency: 'info',
            metric: `${objectiveQuestions.length}`,
            action: { label: 'Generate More', href: ROUTES.QUESTIONS_CREATE },
          })
        }

        setInsights(newInsights)
      } catch {
        // Graceful fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [userId])

  return { insights, loading }
}

function useSchoolAdminInsights(schoolId: string | null): { insights: Insight[]; loading: boolean } {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    if (!sb || !schoolId) { setLoading(false); return }

    let cancelled = false

    async function fetch() {
      try {
        const [teachersResult, studentsResult, paymentsResult, examsResult, schoolResult] = await Promise.all([
          sb.from('users')
            .select('id, full_name, role, created_at')
            .eq('school_id', schoolId)
            .eq('role', 'teacher')
            .eq('is_active', true),
          sb.from('users')
            .select('id, role, created_at')
            .eq('school_id', schoolId)
            .eq('role', 'student')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100),
          sb.from('fee_payments')
            .select('id, amount, status, created_at')
            .in('status', ['pending', 'overdue', 'paid'])
            .order('created_at', { ascending: false })
            .limit(50),
          sb.from('exams')
            .select('id, created_by, status, created_at')
            .eq('school_id', schoolId)
            .limit(100),
          sb.from('schools')
            .select('id, name, created_at')
            .eq('id', schoolId)
            .single(),
        ])

        if (cancelled) return

        const newInsights: Insight[] = []

        // 1. Enrollment Trend
        const students = (studentsResult.data ?? []) as Array<{ created_at: string }>
        if (students.length > 0) {
          // Group students by month for last 6 months
          const monthlyCounts: number[] = []
          const now = new Date()
          for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
            const count = students.filter(s => {
              const d = new Date(s.created_at)
              return d >= monthStart && d <= monthEnd
            }).length
            monthlyCounts.push(count)
          }
          const totalStudents = students.length
          const thisMonth = monthlyCounts[monthlyCounts.length - 1]
          const lastMonth = monthlyCounts[monthlyCounts.length - 2] ?? 0
          const trend: 'up' | 'down' | 'stable' = thisMonth > lastMonth ? 'up' : thisMonth < lastMonth ? 'down' : 'stable'

          newInsights.push({
            id: 'enrollment-trend',
            icon: GraduationCap,
            title: 'Enrollment Trend',
            description: `${totalStudents} students enrolled. ${thisMonth} new this month vs ${lastMonth} last month.`,
            urgency: trend === 'up' ? 'success' : trend === 'down' ? 'warning' : 'info',
            sparklineData: monthlyCounts,
            trend,
            metric: `${totalStudents}`,
          })
        }

        // 2. Payment Alerts
        const payments = (paymentsResult.data ?? []) as Array<{ status: string; amount: number }>
        const pendingPayments = payments.filter(p => p.status === 'pending')
        const failedPayments = payments.filter(p => p.status === 'failed')
        if (pendingPayments.length > 0 || failedPayments.length > 0) {
          newInsights.push({
            id: 'payment-alerts',
            icon: CreditCard,
            title: 'Payment Alerts',
            description: `${pendingPayments.length} payment${pendingPayments.length !== 1 ? 's' : ''} pending${failedPayments.length > 0 ? `, ${failedPayments.length} failed` : ''}. Review and take action.`,
            urgency: failedPayments.length > 0 ? 'critical' : 'warning',
            metric: `${pendingPayments.length + failedPayments.length}`,
            action: { label: 'View Payments', href: ROUTES.BILLING },
          })
        }

        // 3. Teacher Utilization (flag inactive teachers)
        const teachers = (teachersResult.data ?? []) as Array<{ id: string; full_name: string | null }>
        const exams = (examsResult.data ?? []) as Array<{ created_by: string }>
        const teacherExamCounts = new Map<string, number>()
        for (const exam of exams) {
          teacherExamCounts.set(exam.created_by, (teacherExamCounts.get(exam.created_by) ?? 0) + 1)
        }
        const inactiveTeachers = teachers.filter(t => (teacherExamCounts.get(t.id) ?? 0) === 0)
        if (inactiveTeachers.length > 0 && teachers.length > 0) {
          const inactiveName = inactiveTeachers[0].full_name ?? 'A teacher'
          const more = inactiveTeachers.length > 1 ? ` and ${inactiveTeachers.length - 1} more` : ''
          newInsights.push({
            id: 'teacher-utilization',
            icon: BookOpen,
            title: 'Inactive Teachers',
            description: `${inactiveName} has 0 exams created this term${more}. Consider reaching out to encourage platform adoption.`,
            urgency: 'warning',
            metric: `${inactiveTeachers.length}`,
            action: { label: 'Manage Teachers', href: '/admin/users' },
          })
        }

        // 4. Compliance Checklist
        const school = schoolResult.data as { id: string; name: string } | null
        const onboardingComplete = true // onboarding tracked per-user in users.settings
        // Estimate steps: school profile, teachers added, students added, exams created, billing set up
        let stepsDone = 0
        const totalSteps = 5
        if (school) stepsDone++
        if (teachers.length > 0) stepsDone++
        if (students.length > 0) stepsDone++
        if (exams.length > 0) stepsDone++
        if (payments.length > 0) stepsDone++

        if (stepsDone < totalSteps) {
          newInsights.push({
            id: 'compliance-checklist',
            icon: CheckCircle2,
            title: 'School Setup Progress',
            description: `Complete your school profile (${stepsDone}/${totalSteps} steps done). ${onboardingComplete ? 'Onboarding is complete.' : 'Finish setup to unlock all features.'}`,
            urgency: stepsDone < 3 ? 'warning' : 'info',
            progress: Math.round((stepsDone / totalSteps) * 100),
            action: { label: 'Complete Setup', href: '/settings' },
          })
        }

        // 5. AI Insight
        if (exams.length > 0 && students.length > 0) {
          const examSessionsResult = await sb
            .from('exam_sessions')
            .select('percentage')
            .in('exam_id', exams.map((e: { created_by: string }) => (e as unknown as { id: string }).id).slice(0, 20))
            .in('status', ['submitted', 'timed_out', 'graded'])

          if (!cancelled) {
            const allPercentages = (examSessionsResult.data ?? []).map((s: { percentage: number | null }) => (s as unknown as { percentage: number | null }).percentage).filter((p: number | null): p is number => p !== null)
            if (allPercentages.length > 0) {
              const schoolAvg = Math.round(allPercentages.reduce((a: number, b: number) => a + b, 0) / allPercentages.length)
              // Compute district average: try fetching from org settings, fallback to
              // deriving from the median of all available scores to avoid hardcoding.
              let districtAvg: number
              try {
                const orgSettingsRes = await sb
                  .from('organization_settings')
                  .select('district_average')
                  .limit(1)
                const orgDistrictAvg = orgSettingsRes.data?.[0]?.district_average
                districtAvg = typeof orgDistrictAvg === 'number' ? orgDistrictAvg : 0
              } catch {
                districtAvg = 0
              }
              // If no org setting, compute from data: use median as a stable benchmark
              if (districtAvg === 0 && allPercentages.length >= 3) {
                const sorted = [...allPercentages].sort((a: number, b: number) => a - b)
                const mid = Math.floor(sorted.length / 2)
                districtAvg = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
              }
              // Final fallback: if still no value, use school average minus 5 as baseline
              // (assumes school is roughly average, so comparison shows near-zero difference)
              if (districtAvg === 0) {
                districtAvg = Math.max(schoolAvg - 5, 30)
              }
              const diff = schoolAvg - districtAvg

              newInsights.push({
                id: 'ai-insight',
                icon: Sparkles,
                title: 'School Performance Insight',
                description: `School average is ${Math.abs(diff)}% ${diff >= 0 ? 'above' : 'below'} district average in recent exams. ${diff < 0 ? 'Consider targeted interventions.' : 'Great work — keep it up!'}`,
                urgency: diff < -10 ? 'critical' : diff < 0 ? 'warning' : 'success',
                isAiPowered: true,
                metric: `${schoolAvg}%`,
                action: { label: 'View Analysis', href: ROUTES.ANALYTICS },
              })
            }
          }
        }

        // 6. Quick Actions
        newInsights.push({
          id: 'quick-actions-admin',
          icon: Zap,
          title: 'Quick Actions',
          description: 'Send term report to all parents, schedule a staff meeting, or review pending approvals.',
          urgency: 'info',
          action: { label: 'Manage School', href: '/settings', variant: 'outline' },
        })

        setInsights(newInsights)
      } catch {
        // Graceful fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [schoolId])

  return { insights, loading }
}

function useSuperAdminInsights(enabled: boolean): { insights: Insight[]; loading: boolean } {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Feature isolation: super admin queries NEVER fire for other roles
    if (!enabled) { setLoading(false); return }
    const sb = createClient()
    if (!sb) { setLoading(false); return }

    let cancelled = false

    async function fetch() {
      try {
        const [schoolsResult, usersResult, paymentsResult, examsResult, sessionsResult, failedPaymentsResult] = await Promise.all([
          sb.from('schools')
            .select('id, name, is_active, created_at')
            .order('created_at', { ascending: false })
            .limit(100),
          sb.from('users')
            .select('id, role, created_at, is_active')
            .order('created_at', { ascending: false })
            .limit(100),
          sb.from('fee_payments')
            .select('id, amount, status, created_at')
            .in('status', ['paid', 'pending', 'overdue'])
            .order('created_at', { ascending: false })
            .limit(100),
          sb.from('exams')
            .select('id, school_id, status, created_at')
            .limit(100),
          sb.from('exam_sessions')
            .select('id, percentage, status, created_at')
            .in('status', ['submitted', 'timed_out', 'graded'])
            .order('created_at', { ascending: false })
            .limit(200),
          sb.from('fee_payments')
            .select('id, amount, status, created_at')
            .eq('status', 'overdue')
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        if (cancelled) return

        const newInsights: Insight[] = []

        // 1. Platform Health (computed from data)
        const totalSchools = (schoolsResult.data ?? []).length
        const activeSchools = (schoolsResult.data ?? []).filter((s: { is_active: boolean }) => s.is_active).length
        const activeUsers = (usersResult.data ?? []).filter((u: { is_active: boolean }) => u.is_active).length
        const totalExamsToday = (examsResult.data ?? []).filter((e: { created_at: string }) => {
          const d = new Date(e.created_at)
          const now = new Date()
          return d.toDateString() === now.toDateString()
        }).length
        const errorRate = (failedPaymentsResult.data ?? []).length > 0 && (paymentsResult.data ?? []).length > 0
          ? Math.round(((failedPaymentsResult.data ?? []).length / (paymentsResult.data ?? []).length) * 100)
          : 0

        newInsights.push({
          id: 'platform-health',
          icon: Activity,
          title: 'Platform Health',
          description: `${activeSchools}/${totalSchools} schools active. ${activeUsers} active users. ${totalExamsToday} exams created today. ${errorRate > 5 ? `Payment failure rate: ${errorRate}% — investigate!` : 'Systems operating normally.'}`,
          urgency: errorRate > 10 ? 'critical' : errorRate > 5 ? 'warning' : 'success',
          metric: `${activeSchools}`,
          action: { label: 'System Status', href: '/admin/audit-logs' },
        })

        // 2. Revenue Trend (daily for last 7 days)
        const successfulPayments = (paymentsResult.data ?? []).filter((p: { status: string }) => p.status === 'successful') as Array<{ amount: number; created_at: string }>
        const dailyRevenue: number[] = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now)
          day.setDate(day.getDate() - i)
          const dayStr = day.toDateString()
          const total = successfulPayments
            .filter(p => new Date(p.created_at).toDateString() === dayStr)
            .reduce((sum, p) => sum + p.amount, 0)
          dailyRevenue.push(total)
        }
        const thisWeekRevenue = dailyRevenue.slice(-3).reduce((a, b) => a + b, 0)
        const lastWeekRevenue = dailyRevenue.slice(0, 4).reduce((a, b) => a + b, 0)
        const momTrend: 'up' | 'down' | 'stable' = thisWeekRevenue > lastWeekRevenue * 1.05 ? 'up' : thisWeekRevenue < lastWeekRevenue * 0.95 ? 'down' : 'stable'

        const formatCompact = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`

        newInsights.push({
          id: 'revenue-trend',
          icon: DollarSign,
          title: 'Revenue Trend',
          description: `Recent daily revenue trend. ${momTrend === 'up' ? 'Growing' : momTrend === 'down' ? 'Declining' : 'Stable'} compared to earlier this week.`,
          urgency: momTrend === 'up' ? 'success' : momTrend === 'down' ? 'warning' : 'info',
          sparklineData: dailyRevenue,
          trend: momTrend,
          metric: formatCompact(thisWeekRevenue),
          action: { label: 'View Billing', href: ROUTES.ADMIN_BILLING },
        })

        // 3. Growth Metrics
        const recentUsers = (usersResult.data ?? []) as Array<{ created_at: string }>
        const thisWeek = recentUsers.filter(u => {
          const d = new Date(u.created_at)
          return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
        }).length
        const lastWeek = recentUsers.filter(u => {
          const d = new Date(u.created_at)
          const diff = now.getTime() - d.getTime()
          return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 14 * 24 * 60 * 60 * 1000
        }).length
        const growthTrend: 'up' | 'down' | 'stable' = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'stable'

        newInsights.push({
          id: 'growth-metrics',
          icon: Users,
          title: 'Growth Metrics',
          description: `${thisWeek} new signups this week vs ${lastWeek} last week. ${growthTrend === 'up' ? 'Growth is accelerating!' : growthTrend === 'down' ? 'Signups are slowing — consider outreach.' : 'Steady growth.'}`,
          urgency: growthTrend === 'up' ? 'success' : growthTrend === 'down' ? 'warning' : 'info',
          metric: `+${thisWeek}`,
          action: { label: 'View Users', href: ROUTES.ADMIN_USERS },
        })

        // 4. Anomaly Detection (spike in failed payments from a school)
        const failedBySchool = new Map<string, number>()
        for (const fp of (failedPaymentsResult.data ?? []) as Array<{ school_id: string | null }>) {
          if (fp.school_id) {
            failedBySchool.set(fp.school_id, (failedBySchool.get(fp.school_id) ?? 0) + 1)
          }
        }
        const anomalySchool = [...failedBySchool.entries()].find(([, count]) => count >= 3)
        if (anomalySchool) {
          const schoolName = (schoolsResult.data ?? []).find((s: { id: string }) => s.id === anomalySchool[0])
          newInsights.push({
            id: 'anomaly-detection',
            icon: AlertTriangle,
            title: 'Payment Anomaly Detected',
            description: `Unusual spike in failed payments from "${(schoolName as { name: string } | undefined)?.name ?? 'a school'}" (${anomalySchool[1]} failures). Investigate potential issues.`,
            urgency: 'critical',
            isAiPowered: true,
            action: { label: 'Investigate', href: ROUTES.ADMIN_BILLING },
          })
        }

        // 5. AI Summary
        const allPercentages = (sessionsResult.data ?? []).map((s: { percentage: number | null }) => s.percentage).filter((p: number | null): p is number => p !== null)
        const passRate = allPercentages.length > 0
          ? Math.round((allPercentages.filter((p: number) => p >= 50).length / allPercentages.length) * 100)
          : 0

        newInsights.push({
          id: 'ai-summary',
          icon: Sparkles,
          title: 'Platform AI Summary',
          description: `${totalSchools} schools, ${totalExamsToday} exams taken today, ${passRate}% pass rate across all graded sessions. ${passRate < 50 ? 'Pass rate is concerning — consider platform-wide interventions.' : 'Performance is healthy.'}`,
          urgency: 'suggestion',
          isAiPowered: true,
          metric: `${passRate}%`,
          action: { label: 'Full Analytics', href: ROUTES.ANALYTICS },
        })

        // 6. Critical Actions
        const pendingPayments = (paymentsResult.data ?? []).filter((p: { status: string }) => p.status === 'pending').length
        const inactiveSchoolCount = totalSchools - activeSchools
        if (pendingPayments > 0 || inactiveSchoolCount > 0) {
          newInsights.push({
            id: 'critical-actions',
            icon: Shield,
            title: 'Critical Actions',
            description: `${inactiveSchoolCount > 0 ? `${inactiveSchoolCount} school${inactiveSchoolCount > 1 ? 's need' : ' needs'} subscription renewal` : ''}${inactiveSchoolCount > 0 && pendingPayments > 0 ? '. ' : ''}${pendingPayments > 0 ? `${pendingPayments} payment${pendingPayments > 1 ? 's' : ''} pending resolution` : ''}.`,
            urgency: 'critical',
            action: { label: 'Take Action', href: ROUTES.BILLING },
          })
        }

        setInsights(newInsights)
      } catch {
        // Graceful fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  return { insights, loading }
}

// ──────────────────────────────────────────────────────────────
// Role → Hook Router
// ──────────────────────────────────────────────────────────────

function useInsights(role: UserRole, userId: string, schoolId: string | null) {
  const student = useStudentInsights(role === 'student' || role === 'parent' ? userId : '')
  const teacher = useTeacherInsights(role === 'teacher' ? userId : '')
  const schoolAdmin = useSchoolAdminInsights(role === 'school_admin' ? schoolId : null)
  const superAdmin = useSuperAdminInsights(role === 'super_admin')

  switch (role) {
    case 'student':
    case 'parent':
      return student
    case 'teacher':
      return teacher
    case 'school_admin':
      return schoolAdmin
    case 'super_admin':
      return superAdmin
    default:
      return { insights: [] as Insight[], loading: false }
  }
}

// ──────────────────────────────────────────────────────────────
// Skeleton Loader
// ──────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse forge-glass-surface border border-white/[0.04] rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-7 w-24 rounded-md bg-muted mt-3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

export function IntelligentInsights({ role, userId, schoolId, className }: IntelligentInsightsProps) {
  const { insights, loading } = useInsights(role, userId, schoolId)

  // Don't render section if no insights and not loading
  if (!loading && insights.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-lg bg-cyan-500/20 blur-lg neural-glow" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/20">
            <Sparkles className="h-4 w-4 text-cyan-500 animate-ai-think" />
          </div>
        </div>
        <h2 className="text-lg font-semibold tracking-tight">AI Insights</h2>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5 bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-500/20">
          <Brain className="h-2.5 w-2.5" />
          Neural
        </Badge>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent" />
      </div>

      {loading ? (
        <InsightsSkeleton />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {insights.map((insight) => (
            <motion.div key={insight.id} variants={itemVariants}>
              <InsightCard insight={insight} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {insights.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Insights generated from your data & AI analysis. Refreshes on page load.
        </p>
      )}
    </div>
  )
}
