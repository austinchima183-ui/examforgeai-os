'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar, Plus, Sparkles, Trash2, Edit3, Share2, Download,
  Clock, BookOpen, Target, Loader2, ChevronLeft, ChevronRight,
  FileText, CheckCircle2, AlertCircle, GripVertical,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Lesson Planner Page
// ============================================================================

interface LessonPlan {
  id: string
  teacherId: string
  subject: string
  topic: string
  className: string
  duration: number
  objectives: string[]
  materials: string[]
  activities: { name: string; duration: number; description: string }[]
  assessment: string[]
  scheduledAt: string | null
  status: string
  notes: string | null
  isShared: boolean
  createdAt: string
}

const SUBJECTS = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 'Music', 'Physical Education']
const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PERIODS = ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00']

function parseJSON<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return fallback
}

export default function LessonPlannerPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'list' | 'week'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [editPlan, setEditPlan] = useState<LessonPlan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [className, setClassName] = useState('')
  const [duration, setDuration] = useState(40)
  const [objectives, setObjectives] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [activities, setActivities] = useState<{ name: string; duration: number; description: string }[]>([])
  const [assessment, setAssessment] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [objectiveInput, setObjectiveInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')

  const fetchPlans = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher/lesson-plans?teacherId=${user.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPlans(data.map((p: Record<string, unknown>) => ({
        ...p,
        objectives: parseJSON<string[]>(p.objectives, []),
        materials: parseJSON<string[]>(p.materials, []),
        activities: parseJSON<(typeof activities)>(p.activities, []),
        assessment: parseJSON<string[]>(p.assessment, []),
      })) as LessonPlan[])
    } catch {
      toast({ title: 'Error', description: 'Failed to load lesson plans', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const resetForm = () => {
    setSubject(''); setTopic(''); setClassName(''); setDuration(40)
    setObjectives([]); setMaterials([]); setActivities([]); setAssessment([])
    setScheduledAt(''); setNotes(''); setEditPlan(null)
    setObjectiveInput(''); setMaterialInput('')
  }

  const openEdit = (plan: LessonPlan) => {
    setEditPlan(plan)
    setSubject(plan.subject); setTopic(plan.topic); setClassName(plan.className)
    setDuration(plan.duration); setObjectives(plan.objectives)
    setMaterials(plan.materials); setActivities(plan.activities)
    setAssessment(plan.assessment)
    setScheduledAt(plan.scheduledAt ? new Date(plan.scheduledAt).toISOString().slice(0, 16) : '')
    setNotes(plan.notes || '')
    setDialogOpen(true)
  }

  const handleAIGenerate = async () => {
    if (!topic) { toast({ title: 'Enter a topic', description: 'Topic is required for AI generation', variant: 'destructive' }); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a lesson plan for: Subject="${subject}", Topic="${topic}", Class="${className}", Duration=${duration}min.
Return JSON only: { "objectives": ["..."], "materials": ["..."], "activities": [{ "name": "...", "duration": 10, "description": "..." }], "assessment": ["..."] }`,
          max_tokens: 800,
        }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || data?.text || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.objectives) setObjectives(parsed.objectives)
        if (parsed.materials) setMaterials(parsed.materials)
        if (parsed.activities) setActivities(parsed.activities)
        if (parsed.assessment) setAssessment(parsed.assessment)
        toast({ title: 'AI Generated!', description: 'Lesson plan content generated successfully' })
      }
    } catch {
      toast({ title: 'AI Error', description: 'Failed to generate content', variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!subject || !topic || !className) { toast({ title: 'Missing fields', description: 'Subject, topic, and class are required', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = { teacherId: user!.id, schoolId: user!.schoolId ?? undefined, subject, topic, className, duration, objectives, materials, activities, assessment, scheduledAt: scheduledAt || undefined, status: scheduledAt ? 'scheduled' : 'draft', notes }
      if (editPlan) {
        await fetch('/api/teacher/lesson-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editPlan.id, ...payload }) })
        toast({ title: 'Updated!', description: 'Lesson plan updated successfully' })
      } else {
        await fetch('/api/teacher/lesson-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast({ title: 'Created!', description: 'Lesson plan created successfully' })
      }
      setDialogOpen(false); resetForm(); fetchPlans()
    } catch {
      toast({ title: 'Error', description: 'Failed to save lesson plan', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lesson plan?')) return
    try {
      await fetch(`/api/teacher/lesson-plans?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Lesson plan deleted' }); fetchPlans()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleShare = async (plan: LessonPlan) => {
    try {
      await fetch('/api/teacher/lesson-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: plan.id, isShared: !plan.isShared }) })
      toast({ title: plan.isShared ? 'Unshared' : 'Shared!', description: plan.isShared ? 'Lesson plan unshared' : 'Lesson plan shared with other teachers' })
      fetchPlans()
    } catch {
      toast({ title: 'Error', description: 'Failed to share', variant: 'destructive' })
    }
  }

  const getWeekDates = () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d
    })
  }

  const weekDates = getWeekDates()
  const getPlansForDayPeriod = (day: Date, period: string) => {
    return plans.filter(p => {
      if (!p.scheduledAt) return false
      const s = new Date(p.scheduledAt)
      return s.getDay() === day.getDay() && s.getHours() === parseInt(period)
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" /><Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 42 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neural/10 border-white/[0.04] neural-glow">
            <Calendar className="h-5 w-5 text-neural" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lesson Planner</h1>
            <p className="text-sm text-muted-foreground mt-1">Plan, schedule, and share your lessons with AI assistance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'week')}>
            <TabsList><TabsTrigger value="week">Weekly</TabsTrigger><TabsTrigger value="list">List</TabsTrigger></TabsList>
          </Tabs>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editPlan ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Subject</Label><Select value={subject} onValueChange={setSubject}><SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Class</Label><Select value={className} onValueChange={setClassName}><SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Quadratic Equations" className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
                  <div><Label>Schedule</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
                </div>
                <Button variant="outline" onClick={handleAIGenerate} disabled={aiLoading} className="w-full border-primary/30 text-primary hover:bg-primary/5 neural-glow">
                  {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI Generate Content
                </Button>
                <div>
                  <Label>Learning Objectives</Label>
                  <div className="flex gap-2 mb-2"><Input value={objectiveInput} onChange={(e) => setObjectiveInput(e.target.value)} placeholder="Add objective..." className="flex-1" /><Button size="sm" variant="outline" onClick={() => { if (objectiveInput) { setObjectives([...objectives, objectiveInput]); setObjectiveInput('') } }}>Add</Button></div>
                  <div className="space-y-1">{objectives.map((o, i) => <div key={i} className="flex items-center gap-2 text-sm"><Target className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" /><span className="flex-1">{o}</span><Button size="sm" variant="ghost" onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button></div>)}</div>
                </div>
                <div>
                  <Label>Materials Needed</Label>
                  <div className="flex gap-2 mb-2"><Input value={materialInput} onChange={(e) => setMaterialInput(e.target.value)} placeholder="Add material..." className="flex-1" /><Button size="sm" variant="outline" onClick={() => { if (materialInput) { setMaterials([...materials, materialInput]); setMaterialInput('') } }}>Add</Button></div>
                  <div className="flex flex-wrap gap-1">{materials.map((m, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setMaterials(materials.filter((_, j) => j !== i))}>{m} ×</Badge>)}</div>
                </div>
                <div>
                  <Label>Activities</Label>
                  <div className="space-y-2">{activities.map((a, i) => <Card key={i} className="p-3"><div className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-muted-foreground" /><Input value={a.name} onChange={(e) => { const u = [...activities]; u[i] = { ...u[i], name: e.target.value }; setActivities(u) }} placeholder="Activity name" className="flex-1" /><Input type="number" value={a.duration} onChange={(e) => { const u = [...activities]; u[i] = { ...u[i], duration: +e.target.value }; setActivities(u) }} className="w-20" /><span className="text-xs text-muted-foreground">min</span><Button size="sm" variant="ghost" onClick={() => setActivities(activities.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button></div><Textarea value={a.description} onChange={(e) => { const u = [...activities]; u[i] = { ...u[i], description: e.target.value }; setActivities(u) }} placeholder="Description" className="mt-2 text-sm" rows={2} /></Card>)}</div>
                  <Button size="sm" variant="outline" onClick={() => setActivities([...activities, { name: '', duration: 10, description: '' }])} className="mt-2"><Plus className="h-3 w-3 mr-1" /> Add Activity</Button>
                </div>
                <div><Label>Assessment Ideas</Label><Textarea value={assessment.join('\n')} onChange={(e) => setAssessment(e.target.value.split('\n').filter(Boolean))} placeholder="One per line" rows={3} /></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} /></div>
              </div>
              <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} {editPlan ? 'Update' : 'Create'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-12 text-center"><AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No lesson plans yet</h3><p className="text-muted-foreground mb-4">Create your first lesson plan to get started</p><Button onClick={() => setDialogOpen(true)} className="forge-glow"><Plus className="h-4 w-4 mr-1" /> Create Plan</Button></Card>
      ) : view === 'week' ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle className="text-base">Week of {weekDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[5]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden min-w-[700px]">
              <div className="bg-background p-2 text-xs font-medium text-muted-foreground">Time</div>
              {DAYS.map((d, i) => <div key={d} className="bg-background p-2 text-xs font-medium text-center">{d}<br /><span className="text-[10px] text-muted-foreground">{weekDates[i]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>)}
              {PERIODS.map(period => (
                <>
                  <div key={`t-${period}`} className="bg-background p-2 text-xs font-medium text-muted-foreground flex items-center">{period}</div>
                  {DAYS.map((day, di) => {
                    const dayPlans = getPlansForDayPeriod(weekDates[di], period)
                    return (
                      <div key={`${day}-${period}`} className="bg-background p-1 min-h-[60px]">
                        {dayPlans.map(p => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              'rounded p-1 cursor-pointer mb-1',
                              p.status === 'completed' ? 'bg-green-50 dark:bg-green-950 text-emerald-800' : 'bg-yellow-50 dark:bg-yellow-950 text-amber-800'
                            )}
                            onClick={() => openEdit(p)}
                          >
                            <div className="font-medium truncate">{p.topic}</div>
                            <div className="opacity-75">{p.className}</div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>{plans.map((plan) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div><CardTitle className="text-base">{plan.topic}</CardTitle><CardDescription>{plan.subject} • {plan.className}</CardDescription></div>
                    <Badge variant={plan.status === 'completed' ? 'default' : plan.status === 'scheduled' ? 'secondary' : 'outline'} className={plan.status === 'completed' ? 'bg-green-50 dark:bg-green-950 text-emerald-800' : ''}>{plan.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{plan.duration} min{plan.scheduledAt && <><Separator orientation="vertical" className="h-3" /><Calendar className="h-3.5 w-3.5" />{new Date(plan.scheduledAt).toLocaleDateString()}</>}</div>
                  {plan.objectives.length > 0 && <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Objectives</p>{plan.objectives.slice(0, 2).map((o, i) => <p key={i} className="text-xs flex items-start gap-1"><Target className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />{o}</p>)}{plan.objectives.length > 2 && <p className="text-xs text-muted-foreground">+{plan.objectives.length - 2} more</p>}</div>}
                  <div className="flex items-center gap-1 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}><Edit3 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleShare(plan)}><Share2 className="h-3 w-3" />{plan.isShared ? '✓' : ''}</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}</AnimatePresence>
        </div>
      )}
    </div>
  )
}
