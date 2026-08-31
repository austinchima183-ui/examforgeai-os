'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — Student Study Planner Page
// ============================================================================
// Students select upcoming exams, set study goals, get AI-generated
// schedules, calendar view, mark sessions as completed, track progress.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format, addDays, parseISO, isToday, isFuture, differenceInDays } from 'date-fns'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ── Lucide Icons ──
import {
  CalendarDays, Plus, CheckCircle2, Circle, Sparkles,
  Brain, Loader2, AlertCircle, Trash2, Clock, BookOpen,
  Edit, Target, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface StudyPlan {
  id: string
  title: string
  subject_id: string | null
  date: string
  duration_minutes: number
  notes: string | null
  exam_id: string | null
  is_completed: boolean
  created_at: string
}

interface Exam {
  id: string
  title: string
  subject_id: string | null
  starts_at: string | null
  duration_minutes: number
  total_marks: number
}

interface Subject {
  id: string
  name: string
  code: string
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function StudyPlannerPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1)
  })

  // New plan form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newDuration, setNewDuration] = useState('60')
  const [newNotes, setNewNotes] = useState('')

  // ── Fetch data ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('/api/student/study-planner')
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        setExams(data.exams ?? [])
        setStudyPlans(data.studyPlans ?? [])
        setSubjects(data.subjects ?? [])
      } catch (err) {
        setError('Could not load study planner data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Create plan ──
  const createPlan = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await apiFetch('/api/student/study-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          subject_id: newSubject || null,
          date: newDate,
          duration_minutes: parseInt(newDuration) || 60,
          notes: newNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create plan')
      const data = await res.json()
      setStudyPlans((prev) => [data.plan, ...prev])
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      setError('Failed to create study plan.')
    }
  }

  // ── Toggle completion ──
  const toggleComplete = async (plan: StudyPlan) => {
    try {
      const res = await apiFetch('/api/student/study-planner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, is_completed: !plan.is_completed }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setStudyPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, is_completed: !p.is_completed } : p))
    } catch (err) {
      setError('Failed to update study plan.')
    }
  }

  // ── Delete plan ──
  const deletePlan = async (id: string) => {
    try {
      const res = await apiFetch(`/api/student/study-planner?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setStudyPlans((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError('Failed to delete study plan.')
    }
  }

  // ── AI Generate Schedule ──
  const generateAISchedule = async () => {
    if (exams.length === 0) {
      setError('No upcoming exams to plan for.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const examInfo = exams.map((e) => ({
        title: e.title,
        date: e.starts_at,
        daysUntil: e.starts_at ? differenceInDays(parseISO(e.starts_at), new Date()) : null,
      }))

      const res = await apiFetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a study schedule for these upcoming exams: ${JSON.stringify(examInfo)}. Today is ${format(new Date(), 'yyyy-MM-dd')}. Return a JSON array of study sessions: {title, date (YYYY-MM-DD), duration_minutes (30-120), notes}. Distribute study time proportionally, prioritize sooner exams. Include review sessions. Max 14 days out.`,
          mode: 'study_plan',
        }),
      })

      const data = await res.json()
      const parsed = JSON.parse(data.result ?? data.content ?? '[]')

      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const session of parsed) {
          await apiFetch('/api/student/study-planner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: session.title,
              date: session.date,
              duration_minutes: session.duration_minutes ?? 60,
              notes: session.notes ?? null,
            }),
          })
        }
        // Reload plans
        const plansRes = await fetch('/api/student/study-planner')
        const plansData = await plansRes.json()
        setStudyPlans(plansData.studyPlans ?? [])
      }
    } catch (err) {
      setError('Failed to generate AI schedule. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const resetForm = () => {
    setNewTitle(''); setNewSubject(''); setNewDate(format(new Date(), 'yyyy-MM-dd')); setNewDuration('60'); setNewNotes('')
  }

  // ── Week navigation ──
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const completedCount = studyPlans.filter((p) => p.is_completed).length
  const totalCount = studyPlans.length
  const totalMinutes = studyPlans.reduce((sum, p) => sum + p.duration_minutes, 0)

  const getSubjectName = (id: string | null) => {
    if (!id) return null
    return subjects.find((s) => s.id === id)?.name ?? null
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /></div>
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
            <CalendarDays className="h-6 w-6 text-primary neural-glow" />
            Study Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Plan your study sessions and stay on track</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateAISchedule} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            AI Schedule
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Study Session</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Session title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" />
                <Select value={newSubject} onValueChange={setNewSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject (optional)" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No subject</SelectItem>{subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <div><label htmlFor="sp-date" className="text-sm font-medium">Date</label><Input id="sp-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
                  <div><label htmlFor="sp-duration" className="text-sm font-medium">Duration (min)</label><Input id="sp-duration" type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} min="15" max="300" /></div>
                </div>
                <Textarea placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} />
                <Button onClick={createPlan} disabled={!newTitle.trim()} className="w-full forge-glow">Create Session</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-xl font-bold">{completedCount}/{totalCount}</p><p className="text-xs text-foreground/60">Sessions completed</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><Clock className="h-4 w-4 text-primary" /></div>
            <div><p className="text-xl font-bold">{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</p><p className="text-xs text-foreground/60">Total planned</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Target className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-xl font-bold">{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</p><p className="text-xs text-foreground/60">Progress</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <Progress value={(completedCount / totalCount) * 100} />
          <p className="text-xs text-muted-foreground text-right">{completedCount} of {totalCount} sessions done</p>
        </div>
      )}

      {/* Upcoming Exams */}
      {exams.length > 0 && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Upcoming Exams</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {exams.slice(0, 5).map((exam) => (
                <div key={exam.id} className="shrink-0 p-3 rounded-lg forge-glass-surface border-white/[0.04] min-w-48 hover:bg-white/[0.02] hover:border-white/[0.06] transition-colors">
                  <p className="font-medium text-sm truncate">{exam.title}</p>
                  {exam.starts_at && <p className="text-xs text-muted-foreground mt-1">{format(parseISO(exam.starts_at), 'MMM d, yyyy')}</p>}
                  <p className="text-xs text-muted-foreground">{exam.duration_minutes} min · {exam.total_marks} marks</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> This Week</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium">{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-7">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const dayPlans = studyPlans.filter((p) => p.date === dayStr)
              const isTodayDate = isToday(day)

              return (
                <div key={dayStr} className={cn('min-h-24 p-2 rounded-lg border border-white/[0.04]', isTodayDate ? 'border-primary bg-primary/5' : 'bg-muted/20')}>
                  <p className={cn('text-xs font-medium mb-1', isTodayDate ? 'text-primary' : 'text-muted-foreground')}>
                    {format(day, 'EEE')} {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={cn(
                          'text-xs p-1.5 rounded border cursor-pointer transition-all hover:bg-white/[0.02]',
                          plan.is_completed ? 'bg-green-50 dark:bg-green-950 border-emerald-200 dark:bg-green-950 dark:border-emerald-800' : 'bg-background border-border',
                        )}
                        onClick={() => toggleComplete(plan)}
                      >
                        <div className="flex items-start gap-1">
                          {plan.is_completed ? <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0 mt-0.5" /> : <Circle className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
                          <span className={cn('truncate', plan.is_completed && 'line-through text-muted-foreground')}>{plan.title}</span>
                        </div>
                        <span className="text-muted-foreground">{plan.duration_minutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Sessions List */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> All Study Sessions</CardTitle></CardHeader>
        <CardContent>
          {studyPlans.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No study sessions yet. Add one or generate an AI schedule.</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {studyPlans.map((plan) => (
                <div key={plan.id} className="flex items-center gap-3 py-3 hover:bg-white/[0.02] transition-colors">
                  <button onClick={() => toggleComplete(plan)} className="shrink-0">
                    {plan.is_completed ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', plan.is_completed && 'line-through text-muted-foreground')}>{plan.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{plan.date}</span>
                      <span>·</span>
                      <span>{plan.duration_minutes} min</span>
                      {getSubjectName(plan.subject_id) && (<><span>·</span><span>{getSubjectName(plan.subject_id)}</span></>)}
                    </div>
                    {plan.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
