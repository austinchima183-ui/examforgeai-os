'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Table as TableIcon, Plus, Sparkles, Trash2, Edit3, Copy,
  Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  FileText, Calculator,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Rubric Builder Page
// ============================================================================

interface Criteria { id: string; name: string; description: string }
interface PerformanceLevel { id: string; name: string; points: number }
interface RubricCell { criteriaId: string; levelId: string; description: string; points: number }

interface Rubric {
  id: string
  teacherId: string
  title: string
  subject: string | null
  topic: string | null
  assessmentType: string
  criteria: Criteria[]
  performanceLevels: PerformanceLevel[]
  cells: RubricCell[]
  totalPoints: number
  isTemplate: boolean
  createdAt: string
}

const ASSESSMENT_TYPES = [
  { value: 'essay', label: 'Essay' },
  { value: 'project', label: 'Project' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'group_work', label: 'Group Work' },
]

function parseJSON<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return fallback
}

const TEMPLATES: Record<string, { criteria: Criteria[]; levels: PerformanceLevel[]; cells: RubricCell[] }> = {
  essay: {
    criteria: [
      { id: 'c1', name: 'Content & Ideas', description: 'Quality and depth of ideas' },
      { id: 'c2', name: 'Organization', description: 'Logical structure and flow' },
      { id: 'c3', name: 'Language & Style', description: 'Vocabulary, grammar, tone' },
      { id: 'c4', name: 'Mechanics', description: 'Spelling, punctuation, formatting' },
    ],
    levels: [
      { id: 'l1', name: 'Excellent', points: 4 },
      { id: 'l2', name: 'Good', points: 3 },
      { id: 'l3', name: 'Satisfactory', points: 2 },
      { id: 'l4', name: 'Needs Work', points: 1 },
    ],
    cells: [],
  },
  project: {
    criteria: [
      { id: 'c1', name: 'Research & Content', description: 'Depth and accuracy of research' },
      { id: 'c2', name: 'Creativity', description: 'Originality and innovation' },
      { id: 'c3', name: 'Presentation', description: 'Visual appeal and clarity' },
      { id: 'c4', name: 'Completion', description: 'All requirements met' },
    ],
    levels: [
      { id: 'l1', name: 'Exemplary', points: 5 },
      { id: 'l2', name: 'Proficient', points: 4 },
      { id: 'l3', name: 'Developing', points: 3 },
      { id: 'l4', name: 'Beginning', points: 2 },
    ],
    cells: [],
  },
  presentation: {
    criteria: [
      { id: 'c1', name: 'Content Knowledge', description: 'Subject mastery' },
      { id: 'c2', name: 'Delivery', description: 'Voice, pace, eye contact' },
      { id: 'c3', name: 'Visual Aids', description: 'Slides and materials quality' },
      { id: 'c4', name: 'Engagement', description: 'Audience interaction' },
    ],
    levels: [
      { id: 'l1', name: 'Outstanding', points: 4 },
      { id: 'l2', name: 'Commendable', points: 3 },
      { id: 'l3', name: 'Acceptable', points: 2 },
      { id: 'l4', name: 'Inadequate', points: 1 },
    ],
    cells: [],
  },
  lab_report: {
    criteria: [
      { id: 'c1', name: 'Hypothesis', description: 'Clear testable hypothesis' },
      { id: 'c2', name: 'Methodology', description: 'Proper experimental design' },
      { id: 'c3', name: 'Data Analysis', description: 'Accurate data and analysis' },
      { id: 'c4', name: 'Conclusion', description: 'Logical conclusions from data' },
    ],
    levels: [
      { id: 'l1', name: 'Excellent', points: 5 },
      { id: 'l2', name: 'Good', points: 4 },
      { id: 'l3', name: 'Satisfactory', points: 3 },
      { id: 'l4', name: 'Poor', points: 1 },
    ],
    cells: [],
  },
  group_work: {
    criteria: [
      { id: 'c1', name: 'Collaboration', description: 'Teamwork and communication' },
      { id: 'c2', name: 'Contribution', description: 'Individual effort and input' },
      { id: 'c3', name: 'Problem Solving', description: 'Critical thinking and solutions' },
      { id: 'c4', name: 'Output Quality', description: 'Final deliverable quality' },
    ],
    levels: [
      { id: 'l1', name: 'Excellent', points: 4 },
      { id: 'l2', name: 'Good', points: 3 },
      { id: 'l3', name: 'Fair', points: 2 },
      { id: 'l4', name: 'Poor', points: 1 },
    ],
    cells: [],
  },
}

function uid() { return `id_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` }

function buildCells(criteria: Criteria[], levels: PerformanceLevel[], existingCells: RubricCell[]): RubricCell[] {
  const cellMap = new Map<string, boolean>(existingCells.map(c => [`${c.criteriaId}-${c.levelId}`, true]))
  return criteria.flatMap(c => levels.map(l => {
    const key = `${c.id}-${l.id}`
    const existing = existingCells.find(ec => ec.criteriaId === c.id && ec.levelId === l.id)
    return cellMap.has(key) && existing ? existing : { criteriaId: c.id, levelId: l.id, description: '', points: l.points }
  }))
}

function calcTotal(criteria: Criteria[], levels: PerformanceLevel[], cells: RubricCell[]): number {
  return criteria.reduce((sum, c) => {
    const maxCell = Math.max(...levels.map(l => {
      const cell = cells.find(cc => cc.criteriaId === c.id && cc.levelId === l.id)
      return cell?.points ?? l.points
    }))
    return sum + (isFinite(maxCell) ? maxCell : 0)
  }, 0)
}

export default function RubricBuilderPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRubric, setEditRubric] = useState<Rubric | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [assessmentType, setAssessmentType] = useState('essay')
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [levels, setLevels] = useState<PerformanceLevel[]>([])
  const [cells, setCells] = useState<RubricCell[]>([])

  const fetchRubrics = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher/rubrics?teacherId=${user.id}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRubrics(data.map((r: Record<string, unknown>) => ({
        ...r,
        criteria: parseJSON<Criteria[]>(r.criteria, []),
        performanceLevels: parseJSON<PerformanceLevel[]>(r.performanceLevels, []),
        cells: parseJSON<RubricCell[]>(r.cells, []),
      })) as Rubric[])
    } catch {
      toast({ title: 'Error', description: 'Failed to load rubrics', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => { fetchRubrics() }, [fetchRubrics])

  const resetForm = () => {
    setTitle(''); setSubject(''); setTopic(''); setAssessmentType('essay')
    setCriteria([]); setLevels([]); setCells([]); setEditRubric(null)
  }

  const applyTemplate = (type: string) => {
    const tmpl = TEMPLATES[type]
    if (!tmpl) return
    setCriteria(tmpl.criteria); setLevels(tmpl.levels)
    setCells(buildCells(tmpl.criteria, tmpl.levels, tmpl.cells))
  }

  const openNew = () => {
    resetForm(); setAssessmentType('essay'); applyTemplate('essay'); setDialogOpen(true)
  }

  const openEdit = (r: Rubric) => {
    setEditRubric(r); setTitle(r.title); setSubject(r.subject || '')
    setTopic(r.topic || ''); setAssessmentType(r.assessmentType)
    setCriteria(r.criteria); setLevels(r.performanceLevels)
    setCells(r.cells); setDialogOpen(true)
  }

  const handleAIGenerate = async () => {
    if (!assessmentType) { toast({ title: 'Select type', variant: 'destructive' }); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a grading rubric for: Subject="${subject}", Topic="${topic}", Assessment Type="${assessmentType}".
Return JSON only: { "criteria": [{ "id": "c1", "name": "...", "description": "..." }], "performanceLevels": [{ "id": "l1", "name": "...", "points": 4 }], "cells": [{ "criteriaId": "c1", "levelId": "l1", "description": "...", "points": 4 }] }
Use 4-5 criteria and 3-4 performance levels. Fill all cells with descriptions and points.`,
          max_tokens: 1500,
        }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || data?.text || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.criteria) setCriteria(parsed.criteria)
        if (parsed.performanceLevels) setLevels(parsed.performanceLevels)
        if (parsed.cells) setCells(parsed.cells)
        else if (parsed.criteria && parsed.performanceLevels) setCells(buildCells(parsed.criteria, parsed.performanceLevels, []))
        toast({ title: 'AI Generated!', description: 'Rubric generated successfully' })
      }
    } catch {
      toast({ title: 'AI Error', description: 'Failed to generate', variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  const updateCell = (criteriaId: string, levelId: string, field: 'description' | 'points', value: string | number) => {
    setCells(prev => prev.map(c => c.criteriaId === criteriaId && c.levelId === levelId ? { ...c, [field]: value } : c))
  }

  const addCriterion = () => {
    const newC: Criteria = { id: uid(), name: '', description: '' }
    const newCriteria = [...criteria, newC]
    setCriteria(newCriteria)
    setCells(buildCells(newCriteria, levels, cells))
  }

  const addLevel = () => {
    const maxPts = levels.length > 0 ? Math.max(...levels.map(l => l.points)) + 1 : 4
    const newL: PerformanceLevel = { id: uid(), name: '', points: maxPts }
    const newLevels = [...levels, newL]
    setLevels(newLevels)
    setCells(buildCells(criteria, newLevels, cells))
  }

  const handleSave = async () => {
    if (!title) { toast({ title: 'Title required', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const total = calcTotal(criteria, levels, cells)
      const payload = {
        teacherId: user!.id, schoolId: user!.schoolId ?? undefined, title,
        subject: subject || undefined, topic: topic || undefined,
        assessmentType, criteria, performanceLevels: levels, cells, totalPoints: total,
      }
      if (editRubric) {
        await fetch('/api/teacher/rubrics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editRubric.id, ...payload }) })
        toast({ title: 'Updated!' })
      } else {
        await fetch('/api/teacher/rubrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast({ title: 'Created!' })
      }
      setDialogOpen(false); resetForm(); fetchRubrics()
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rubric?')) return
    try { await fetch(`/api/teacher/rubrics?id=${id}`, { method: 'DELETE' }); toast({ title: 'Deleted' }); fetchRubrics() } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleDuplicate = async (r: Rubric) => {
    try {
      await fetch('/api/teacher/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user!.id, schoolId: user!.schoolId ?? undefined, title: `${r.title} (Copy)`, subject: r.subject, topic: r.topic, assessmentType: r.assessmentType, criteria: r.criteria, performanceLevels: r.performanceLevels, cells: r.cells, totalPoints: r.totalPoints }),
      })
      toast({ title: 'Duplicated!' }); fetchRubrics()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const total = calcTotal(criteria, levels, cells)
  const viewedRubric = rubrics.find(r => r.id === viewId)

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 border-white/[0.04]">
            <TableIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rubric Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Create grading rubrics with AI assistance and templates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true) }}><FileText className="h-4 w-4 mr-1" /> From Scratch</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> From Template</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ASSESSMENT_TYPES.map(t => (
          <Button key={t.value} variant="outline" size="sm" onClick={() => { resetForm(); setAssessmentType(t.value); applyTemplate(t.value); setDialogOpen(true) }} className="capitalize">{t.label}</Button>
        ))}
      </div>

      {rubrics.length === 0 ? (
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-12 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm forge-glow"><AlertCircle className="h-8 w-8 text-primary" /></div><h3 className="text-lg font-semibold mb-2">No rubrics yet</h3><p className="text-sm text-muted-foreground mb-4">Start from a template or create from scratch</p><Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Create Rubric</Button></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>{rubrics.map((r) => {
            const rTotal = calcTotal(r.criteria, r.performanceLevels, r.cells)
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 h6over:forge-card-shadow-hover hover:border-white/[0.06] transition-all duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div><CardTitle className="text-base">{r.title}</CardTitle><CardDescription>{r.subject || 'No subject'} • {r.assessmentType}</CardDescription></div>
                      <Badge variant="outline">{rTotal} pts</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">{r.criteria.length} criteria × {r.performanceLevels.length} levels</div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setViewId(r.id)}><TableIcon className="h-3 w-3 mr-1" /> View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit3 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(r)}><Copy className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}</AnimatePresence>
        </div>
      )}

      {/* View Rubric Dialog */}
      <Dialog open={!!viewId} onOpenChange={(o) => { if (!o) setViewId(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewedRubric?.title}</DialogTitle></DialogHeader>
          {viewedRubric && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Criteria</TableHead>
                    {viewedRubric.performanceLevels.map(l => <TableHead key={l.id} className="text-center">{l.name}<br /><span className="text-xs text-muted-foreground">{l.points} pts</span></TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewedRubric.criteria.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium"><div>{c.name}</div><div className="text-xs text-muted-foreground">{c.description}</div></TableCell>
                      {viewedRubric.performanceLevels.map(l => {
                        const cell = viewedRubric.cells.find(cc => cc.criteriaId === c.id && cc.levelId === l.id)
                        return <TableCell key={l.id} className="text-sm text-center"><div>{cell?.description || '—'}</div><div className="text-xs font-medium text-green-600 dark:text-green-400">{cell?.points ?? 0}</div></TableCell>
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-right text-sm font-medium">Total: {calcTotal(viewedRubric.criteria, viewedRubric.performanceLevels, viewedRubric.cells)} points</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRubric ? 'Edit Rubric' : 'Create Rubric'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Essay Grading Rubric" className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
              <div><Label>Assessment Type</Label><Select value={assessmentType} onValueChange={(v) => { setAssessmentType(v); applyTemplate(v) }}><SelectTrigger /><SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., English" className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
              <div><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Persuasive Writing" className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" /></div>
            </div>
            <Button variant="outline" onClick={handleAIGenerate} disabled={aiLoading} className="w-full border-primary/30 text-primary hover:bg-primary/5 neural-glow">
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI Generate Rubric
            </Button>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Criteria</TableHead>
                    {levels.map((l, li) => (
                      <TableHead key={l.id} className="text-center min-w-[120px]">
                        <Input value={l.name} onChange={(e) => { const u = [...levels]; u[li] = { ...u[li], name: e.target.value }; setLevels(u) }} className="h-6 text-xs text-center" placeholder="Level" />
                        <Input type="number" value={l.points} onChange={(e) => { const u = [...levels]; u[li] = { ...u[li], points: +e.target.value }; setLevels(u) }} className="h-6 text-xs text-center w-16 mx-auto mt-1" />
                      </TableHead>
                    ))}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((c, ci) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Input value={c.name} onChange={(e) => { const u = [...criteria]; u[ci] = { ...u[ci], name: e.target.value }; setCriteria(u) }} className="h-6 text-xs mb-1" placeholder="Criteria" />
                        <Input value={c.description} onChange={(e) => { const u = [...criteria]; u[ci] = { ...u[ci], description: e.target.value }; setCriteria(u) }} className="h-6 text-xs" placeholder="Desc" />
                      </TableCell>
                      {levels.map(l => {
                        const cell = cells.find(cc => cc.criteriaId === c.id && cc.levelId === l.id)
                        return (
                          <TableCell key={l.id} className="p-1">
                            <Textarea value={cell?.description || ''} onChange={(e) => updateCell(c.id, l.id, 'description', e.target.value)} className="h-14 text-xs resize-none" placeholder="Description" />
                            <Input type="number" value={cell?.points ?? 0} onChange={(e) => updateCell(c.id, l.id, 'points', +e.target.value)} className="h-6 text-xs mt-1" />
                          </TableCell>
                        )
                      })}
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => { const newC = criteria.filter((_, j) => j !== ci); setCriteria(newC); setCells(buildCells(newC, levels, cells)) }}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addCriterion}><Plus className="h-3 w-3 mr-1" /> Criterion</Button>
              <Button size="sm" variant="outline" onClick={addLevel}><Plus className="h-3 w-3 mr-1" /> Level</Button>
              <div className="ml-auto flex items-center gap-2 text-sm font-medium"><Calculator className="h-4 w-4 text-green-600 dark:text-green-400" /> Total: {total} points</div>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} {editRubric ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
