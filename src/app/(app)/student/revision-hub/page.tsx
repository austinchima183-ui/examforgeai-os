'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — Student Revision Hub Page
// ============================================================================
// Aggregates content a student needs to review: weak topics from past exams,
// flagged questions, AI-recommended revision areas. Shows revision cards
// grouped by subject with priority levels and quick stats.
// ============================================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Lucide Icons ──
import {
  AlertTriangle, BookOpen, CheckCircle2, Flag, Sparkles,
  Brain, Loader2, AlertCircle, Clock, Target,
  ArrowRight, BarChart3, Lightbulb, RefreshCw,
  ChevronDown, ChevronUp, Flame, Zap,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ExamSession {
  id: string
  exam_id: string
  percentage: number | null
  grade: string | null
  submitted_at: string | null
  exams?: {
    id: string
    title: string
    subject_id: string | null
    subjects?: { id: string; name: string } | null
  } | null
}

interface FlaggedAnswer {
  id: string
  question_id: string
  is_correct: boolean | null
  questions?: {
    id: string
    content: string
    subject_id: string | null
    difficulty: string
    subjects?: { id: string; name: string } | null
  } | null
}

interface Subject {
  id: string
  name: string
  code: string
}

interface RevisionTopic {
  subjectId: string
  subjectName: string
  score: number
  priority: 'high' | 'medium' | 'low'
  source: 'exam_result' | 'flagged' | 'ai_recommended'
  title: string
  description: string
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function RevisionHubPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [flaggedAnswers, setFlaggedAnswers] = useState<FlaggedAnswer[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revisionTopics, setRevisionTopics] = useState<RevisionTopic[]>([])
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  // ── Fetch data ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('/api/student/revision-hub')
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        setSessions(data.sessions ?? [])
        setFlaggedAnswers(data.flaggedAnswers ?? [])
        setSubjects(data.subjects ?? [])
      } catch (err) {
        setError('Could not load revision data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Process data into revision topics ──
  useEffect(() => {
    const topics: RevisionTopic[] = []
    const subjectScores: Record<string, { name: string; scores: number[] }> = {}

    // Group exam sessions by subject
    for (const session of sessions) {
      const subject = session.exams?.subjects
      if (!subject) continue

      if (!subjectScores[subject.id]) {
        subjectScores[subject.id] = { name: subject.name, scores: [] }
      }
      if (session.percentage != null) {
        subjectScores[subject.id].scores.push(session.percentage)
      }
    }

    // Create topics for weak subjects (score < 60%)
    for (const [subjectId, data] of Object.entries(subjectScores)) {
      const avgScore = data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0
      let priority: 'high' | 'medium' | 'low' = 'low'
      if (avgScore < 40) priority = 'high'
      else if (avgScore < 60) priority = 'medium'
      else if (avgScore < 75) priority = 'low'
      else continue // Skip strong subjects

      topics.push({
        subjectId,
        subjectName: data.name,
        score: Math.round(avgScore),
        priority,
        source: 'exam_result',
        title: `${data.name} — Weak Area`,
        description: `Average score: ${Math.round(avgScore)}%. Needs focused revision to improve.`,
      })
    }

    // Add flagged questions as revision topics
    const flaggedBySubject: Record<string, { name: string; count: number }> = {}
    for (const answer of flaggedAnswers) {
      const subject = answer.questions?.subjects
      if (!subject) continue
      if (!flaggedBySubject[subject.id]) {
        flaggedBySubject[subject.id] = { name: subject.name, count: 0 }
      }
      flaggedBySubject[subject.id].count++
    }

    for (const [subjectId, data] of Object.entries(flaggedBySubject)) {
      topics.push({
        subjectId,
        subjectName: data.name,
        score: 0,
        priority: 'medium',
        source: 'flagged',
        title: `${data.name} — ${data.count} Flagged Question${data.count > 1 ? 's' : ''}`,
        description: `You flagged ${data.count} question${data.count > 1 ? 's' : ''} in this subject for review.`,
      })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    topics.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    setRevisionTopics(topics)
  }, [sessions, flaggedAnswers])

  // ── Start AI revision for a topic ──
  const startAIRevision = async (topic: RevisionTopic) => {
    setAiLoading(topic.subjectId)
    try {
      const res = await apiFetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Explain the key concepts of ${topic.subjectName} that a student scoring ${topic.score}% would need to review. Provide a structured revision guide with: 1) Key topics to focus on 2) Common mistakes to avoid 3) Study tips 4) Quick practice questions (3-5)`,
          mode: 'explain',
        }),
      })
      const data = await res.json()
      // In a real app, this would navigate to the AI tutor with the explanation
      // For now, we'll add it as an AI recommended topic
      setRevisionTopics((prev) => [
        ...prev,
        {
          subjectId: topic.subjectId,
          subjectName: topic.subjectName,
          score: topic.score,
          priority: 'medium',
          source: 'ai_recommended',
          title: `${topic.subjectName} — AI Revision Guide`,
          description: data.result ?? data.content ?? 'AI revision guide generated. Visit AI Tutor for detailed explanation.',
        },
      ])
    } catch (err) {
      setError('Failed to generate AI revision guide.')
    } finally {
      setAiLoading(null)
    }
  }

  // ── Stats ──
  const highPriorityCount = revisionTopics.filter((t) => t.priority === 'high').length
  const mediumPriorityCount = revisionTopics.filter((t) => t.priority === 'medium').length
  const lowPriorityCount = revisionTopics.filter((t) => t.priority === 'low').length
  const estimatedHours = revisionTopics.length > 0 ? Math.max(1, Math.round(revisionTopics.length * 1.5)) : 0

  // Group by subject
  const groupedBySubject = revisionTopics.reduce<Record<string, RevisionTopic[]>>((acc, topic) => {
    if (!acc[topic.subjectName]) acc[topic.subjectName] = []
    acc[topic.subjectName].push(topic)
    return acc
  }, {})

  const priorityColors = {
    high: 'text-destructive bg-destructive/10 border-destructive/20',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700',
    low: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-emerald-200 dark:border-emerald-800',
  }

  const priorityBadges = {
    high: 'bg-destructive/100 text-white',
    medium: 'bg-yellow-50 dark:bg-yellow-950 text-white',
    low: 'bg-green-50 dark:bg-green-950 text-white',
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /></div>
        <Skeleton className="h-64 forge-skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 neural-glow" />
            Revision Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Focus your revision on areas that need the most improvement</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 border border-white/[0.04] flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/100/10 border border-white/[0.04] flex items-center justify-center"><Flame className="h-4 w-4 text-destructive" /></div>
            <div><p className="text-xl font-bold">{highPriorityCount}</p><p className="text-xs text-foreground/60">High priority</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-xl font-bold">{mediumPriorityCount}</p><p className="text-xs text-foreground/60">Medium priority</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><Target className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-xl font-bold">{lowPriorityCount}</p><p className="text-xs text-foreground/60">Low priority</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><Clock className="h-4 w-4 text-primary" /></div>
            <div><p className="text-xl font-bold">{estimatedHours}h</p><p className="text-xs text-foreground/60">Est. revision time</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Distribution */}
      {revisionTopics.length > 0 && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Priority Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><span className="text-sm w-12">High</span><div className="flex-1"><Progress value={revisionTopics.length > 0 ? (highPriorityCount / revisionTopics.length) * 100 : 0} className="h-3" /></div><span className="text-sm text-muted-foreground w-8">{highPriorityCount}</span></div>
              <div className="flex items-center gap-3"><span className="text-sm w-12">Med</span><div className="flex-1"><Progress value={revisionTopics.length > 0 ? (mediumPriorityCount / revisionTopics.length) * 100 : 0} className="h-3" /></div><span className="text-sm text-muted-foreground w-8">{mediumPriorityCount}</span></div>
              <div className="flex items-center gap-3"><span className="text-sm w-12">Low</span><div className="flex-1"><Progress value={revisionTopics.length > 0 ? (lowPriorityCount / revisionTopics.length) * 100 : 0} className="h-3" /></div><span className="text-sm text-muted-foreground w-8">{lowPriorityCount}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {revisionTopics.length === 0 && !loading && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow text-center"><CardContent className="p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/50 border border-white/[0.04] backdrop-blur-sm neural-glow"><CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" /></div>
            <h3 className="text-lg font-semibold mb-2">You&apos;re on Track!</h3>
            <p className="text-sm text-muted-foreground">No weak areas detected. Keep up the great work!</p>
          </CardContent>
        </Card>
      )}

      {/* Revision Cards by Subject */}
      <div className="space-y-4">
        {Object.entries(groupedBySubject).map(([subjectName, topics]) => {
          const isExpanded = expandedSubject === subjectName
          const worstPriority = topics.reduce((worst, t) => {
            const order = { high: 0, medium: 1, low: 2 }
            return order[t.priority] < order[worst] ? t.priority : worst
          }, 'low' as 'high' | 'medium' | 'low')

          return (
            <motion.div key={subjectName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className={cn('overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all', isExpanded && 'ring-1 ring-primary/20')}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedSubject(isExpanded ? null : subjectName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary neural-glow" />
                      <div>
                        <CardTitle className="text-base">{subjectName}</CardTitle>
                        <CardDescription>{topics.length} area{topics.length > 1 ? 's' : ''} to review</CardDescription>
                      </div>
                      <Badge className={priorityBadges[worstPriority]}>{worstPriority}</Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }}>
                      <CardContent className="space-y-3 pt-0">
                        {topics.map((topic, i) => (
                          <div key={i} className={cn('p-3 rounded-lg border', priorityColors[topic.priority])}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium">{topic.title}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {topic.source === 'exam_result' ? 'Exam Result' : topic.source === 'flagged' ? 'Flagged' : 'AI Guide'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{topic.description}</p>
                                {topic.score > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Progress value={topic.score} className="h-1.5 flex-1" />
                                    <span className="text-xs text-muted-foreground">{topic.score}%</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startAIRevision(topic)}
                                disabled={aiLoading === topic.subjectId}
                              >
                                {aiLoading === topic.subjectId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <><Sparkles className="h-3.5 w-3.5 mr-1" /> Start Revision</>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
