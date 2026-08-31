'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — Parent AI Advisor Page
// ============================================================================
// AI-powered parent advisor with:
// - Child progress analysis
// - Weekly summaries
// - Home learning recommendations
// ============================================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Home,
  GraduationCap,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  BookOpen,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type AdvisorTab = 'progress' | 'weekly' | 'home-learning'

interface ProgressData {
  summary: string
  academicPerformance: Array<{
    subject: string
    averageScore: number
    trend: 'improving' | 'stable' | 'declining'
    grade: string
  }>
  attendanceSummary: {
    rate: number
    absencesThisPeriod: number
    trend: 'improving' | 'stable' | 'declining'
  }
  strengths: string[]
  concerns: string[]
  recommendations: string[]
}

interface WeeklyData {
  greeting: string
  highlights: string[]
  academicUpdates: Array<{ subject: string; update: string }>
  attendanceNote: string
  upcomingThisWeek: string[]
  homeActivities: string[]
  encouragementNote: string
}

interface HomeLearningData {
  dailyActivities: Array<{
    day: string
    activities: Array<{
      subject: string
      activity: string
      duration: string
      materials: string
      howTo: string
    }>
  }>
  freeResources: Array<{ name: string; type: string; url: string; description: string }>
  conversationStarters: string[]
  monitoringTips: string[]
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function AIAdvisorPage() {
  const [activeTab, setActiveTab] = useState<AdvisorTab>('progress')
  const [childId, setChildId] = useState('')
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null)
  const [homeLearningData, setHomeLearningData] = useState<HomeLearningData | null>(null)

  const callAPI = async (action: string, data: Record<string, unknown>) => {
    const response = await apiFetch('/api/ai/parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Failed')
    return result.data
  }

  const handleProgress = async () => {
    if (!childId) return
    setLoading(true)
    setError(null)
    try {
      const data = await callAPI('progress', { parentId: '', childId, childName, period: 'month' })
      setProgressData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWeekly = async () => {
    if (!childId) return
    setLoading(true)
    setError(null)
    try {
      const data = await callAPI('weekly-summary', { parentId: '', childId, childName })
      setWeeklyData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleHomeLearning = async () => {
    if (!childId) return
    setLoading(true)
    setError(null)
    try {
      const data = await callAPI('home-learning', {
        childId,
        childName,
        subjects: ['Mathematics', 'English', 'Science'],
        weakAreas: [],
        availableTime: '1-2 hours',
        gradeLevel: 'Secondary',
      })
      setHomeLearningData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3.5 w-3.5 text-green-600" />
      case 'declining': return <TrendingDown className="h-3.5 w-3.5 text-destructive" />
      default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const tabs: Array<{ id: AdvisorTab; label: string; icon: React.ReactNode }> = [
    { id: 'progress', label: 'Child Progress', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'weekly', label: 'Weekly Summary', icon: <Calendar className="h-4 w-4" /> },
    { id: 'home-learning', label: 'Home Learning', icon: <Home className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-white/[0.04] neural-glow">
          <Brain className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Parent Advisor</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Intelligent insights to support your child&apos;s learning journey</p>
        </div>
      </div>

      {/* Child Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ai-advisor-child-id" className="mb-1.5 block text-sm font-medium">Child ID</label>
          <input
            id="ai-advisor-child-id"
            type="text"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            placeholder="Enter your child's student ID"
            className="w-full rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-sm forge-input-glow"
          />
        </div>
        <div>
          <label htmlFor="ai-advisor-child-name" className="mb-1.5 block text-sm font-medium">Child Name</label>
          <input
            id="ai-advisor-child-name"
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="e.g., Adaeze"
            className="w-full rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-sm forge-input-glow"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/[0.04]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white/[0.06] text-primary shadow-sm border border-white/[0.06]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <button
              onClick={handleProgress}
              disabled={loading || !childId}
              className="inline-flex items-center gap-2 rounded-lg bg-primary neural-glow px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="animate-ai-think">Thinking...</span></> : <Sparkles className="h-4 w-4" />}
              Analyze My Child&apos;s Progress
            </button>

            {progressData && (
              <div className="space-y-4">
                <Card className="forge-glass-surface border-cyan-500/20 rounded-xl forge-card-shadow">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-400">{progressData.summary}</p>
                  </CardContent>
                </Card>

                {/* Academic Performance */}
                <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Academic Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {progressData.academicPerformance.map((subject, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                          <span className="text-sm font-medium">{subject.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{subject.averageScore.toFixed(0)}%</span>
                            {trendIcon(subject.trend)}
                            <span className="text-xs text-muted-foreground">{subject.grade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance & Strengths */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Attendance Rate</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{(progressData.attendanceSummary.rate * 100).toFixed(0)}%</span>
                        {trendIcon(progressData.attendanceSummary.trend)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{progressData.attendanceSummary.absencesThisPeriod} absences this period</p>
                    </CardContent>
                  </Card>
                  <Card className="forge-glass-surface border-emerald-500/20 rounded-xl forge-card-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Strengths
                      </div>
                      <ul className="mt-2 space-y-1">
                        {progressData.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground">{s}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Concerns & Recommendations */}
                {progressData.concerns.length > 0 && (
                  <Card className="forge-glass-surface border-amber-500/20 rounded-xl forge-card-shadow">
                    <CardContent className="p-4">
                      <h3 className="flex items-center gap-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="h-4 w-4" /> Areas of Concern
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {progressData.concerns.map((c, i) => (
                          <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400">{c}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {progressData.recommendations.length > 0 && (
                  <Card className="forge-glass-surface border-cyan-500/20 rounded-xl forge-card-shadow">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold">Recommendations</h3>
                      <ul className="mt-2 space-y-2">
                        {progressData.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Weekly Summary Tab */}
        {activeTab === 'weekly' && (
          <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <button
              onClick={handleWeekly}
              disabled={loading || !childId}
              className="inline-flex items-center gap-2 rounded-lg bg-primary neural-glow px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="animate-ai-think">Thinking...</span></> : <Calendar className="h-4 w-4" />}
              Get This Week&apos;s Summary
            </button>

            {weeklyData && (
              <div className="space-y-4">
                <Card className="forge-glass-surface border-cyan-500/20 rounded-xl forge-card-shadow">
                  <CardContent className="p-6">
                    <p className="text-lg font-medium text-cyan-400">{weeklyData.greeting}</p>
                  </CardContent>
                </Card>

                {weeklyData.highlights.length > 0 && (
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-1 text-sm font-semibold">
                        <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /> Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {weeklyData.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-green-500" />{h}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {weeklyData.academicUpdates.length > 0 && (
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-1 text-sm font-semibold">
                        <BookOpen className="h-4 w-4" /> Academic Updates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {weeklyData.academicUpdates.map((u, i) => (
                          <div key={i} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                            <span className="text-xs font-medium text-cyan-400">{u.subject}</span>
                            <p className="mt-0.5 text-sm text-muted-foreground">{u.update}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="forge-glass-surface border-emerald-500/20 rounded-xl forge-card-shadow">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-400">{weeklyData.encouragementNote}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}

        {/* Home Learning Tab */}
        {activeTab === 'home-learning' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <button
              onClick={handleHomeLearning}
              disabled={loading || !childId}
              className="inline-flex items-center gap-2 rounded-lg bg-primary neural-glow px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="animate-ai-think">Thinking...</span></> : <Home className="h-4 w-4" />}
              Get Home Learning Plan
            </button>

            {homeLearningData && (
              <div className="space-y-4">
                {/* Daily Activities */}
                {homeLearningData.dailyActivities.map((day, i) => (
                  <Card key={i} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-cyan-400" /> {day.day}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {day.activities.map((act, j) => (
                          <div key={j} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-cyan-400">{act.subject}</span>
                              <span className="text-xs text-muted-foreground">{act.duration}</span>
                            </div>
                            <p className="mt-1 text-sm">{act.activity}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Materials: {act.materials}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">How to: {act.howTo}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Conversation Starters */}
                {homeLearningData.conversationStarters.length > 0 && (
                  <Card className="forge-glass-surface border-cyan-500/20 rounded-xl forge-card-shadow">
                    <CardContent className="p-4">
                      <h3 className="flex items-center gap-1 text-sm font-semibold text-cyan-400">
                        <MessageSquare className="h-4 w-4" /> Things to Ask Your Child
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {homeLearningData.conversationStarters.map((s, i) => (
                          <li key={i} className="text-sm text-cyan-400/80">{s}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
