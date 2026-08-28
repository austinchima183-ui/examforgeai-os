'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Plus, Sparkles, Trash2, Edit3, Eye, Printer, Download,
  Loader2, BookOpen, CheckCircle2, AlertCircle, Copy, Save,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Worksheet Builder Page
// ============================================================================

interface WorksheetQuestion {
  id: string
  type: string
  text: string
  options?: string[]
  answer?: string
  points: number
}

interface Worksheet {
  id: string
  teacherId: string
  title: string
  subject: string
  instructions: string | null
  questions: WorksheetQuestion[]
  headerConfig: { schoolName?: string; studentInfoFields?: string[] } | null
  difficulty: string
  spacing: string
  isTemplate: boolean
  templateName: string | null
  createdAt: string
}

const SUBJECTS = ['Mathematics', 'English', 'Science', 'History', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
const Q_TYPES = ['single_choice', 'multi_choice', 'short_answer', 'essay', 'fill_blank', 'true_false']
const STUDENT_FIELDS = ['Name', 'Class', 'Date', 'Student ID', 'Score']

function parseJSON<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return fallback
}

export default function WorksheetBuilderPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewWs, setPreviewWs] = useState<Worksheet | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editWs, setEditWs] = useState<Worksheet | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [instructions, setInstructions] = useState('')
  const [questions, setQuestions] = useState<WorksheetQuestion[]>([])
  const [difficulty, setDifficulty] = useState('medium')
  const [spacing, setSpacing] = useState('normal')
  const [schoolName, setSchoolName] = useState('')
  const [studentFields, setStudentFields] = useState<string[]>(['Name', 'Class', 'Date'])
  const [qCount, setQCount] = useState(10)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const fetchWorksheets = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher/worksheets?teacherId=${user.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setWorksheets(data.map((w: Record<string, unknown>) => ({
        ...w,
        questions: parseJSON<WorksheetQuestion[]>(w.questions, []),
        headerConfig: w.headerConfig ? parseJSON<Record<string, unknown>>(w.headerConfig, {}) : null,
      })) as Worksheet[])
    } catch {
      toast({ title: 'Error', description: 'Failed to load worksheets', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => { fetchWorksheets() }, [fetchWorksheets])

  const resetForm = () => {
    setTitle(''); setSubject(''); setInstructions(''); setQuestions([])
    setDifficulty('medium'); setSpacing('normal'); setSchoolName('')
    setStudentFields(['Name', 'Class', 'Date']); setQCount(10)
    setSaveAsTemplate(false); setTemplateName(''); setEditWs(null)
  }

  const openEdit = (ws: Worksheet) => {
    setEditWs(ws); setTitle(ws.title); setSubject(ws.subject)
    setInstructions(ws.instructions || ''); setQuestions(ws.questions)
    setDifficulty(ws.difficulty); setSpacing(ws.spacing)
    setSchoolName(ws.headerConfig?.schoolName || '')
    setStudentFields(ws.headerConfig?.studentInfoFields || ['Name', 'Class', 'Date'])
    setDialogOpen(true)
  }

  const handleAIGenerate = async () => {
    if (!subject) { toast({ title: 'Select subject', variant: 'destructive' }); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a worksheet: Subject="${subject}", Topic="${title || 'General'}", Difficulty="${difficulty}", Questions=${qCount}.
Include a mix of question types. Return JSON only:
{ "title": "...", "instructions": "...", "questions": [{ "id": "q1", "type": "single_choice|multi_choice|short_answer|essay|fill_blank|true_false", "text": "...", "options": ["A...","B...","C...","D..."], "answer": "...", "points": 5 }] }`,
          max_tokens: 2000,
        }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || data?.text || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.title && !editWs) setTitle(parsed.title)
        if (parsed.instructions) setInstructions(parsed.instructions)
        if (parsed.questions) setQuestions(parsed.questions)
        toast({ title: 'AI Generated!', description: `${parsed.questions?.length || 0} questions generated` })
      }
    } catch {
      toast({ title: 'AI Error', description: 'Failed to generate', variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title || !subject) { toast({ title: 'Missing fields', description: 'Title and subject are required', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = {
        teacherId: user!.id, schoolId: user!.schoolId ?? undefined, title, subject,
        instructions: instructions || undefined, questions,
        headerConfig: { schoolName, studentInfoFields: studentFields },
        difficulty, spacing, isTemplate: saveAsTemplate,
        templateName: saveAsTemplate ? templateName : undefined,
      }
      if (editWs) {
        await fetch('/api/teacher/worksheets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editWs.id, ...payload }) })
        toast({ title: 'Updated!' })
      } else {
        await fetch('/api/teacher/worksheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast({ title: 'Created!' })
      }
      setDialogOpen(false); resetForm(); fetchWorksheets()
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this worksheet?')) return
    try { await fetch(`/api/teacher/worksheets?id=${id}`, { method: 'DELETE' }); toast({ title: 'Deleted' }); fetchWorksheets() } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const addQuestion = () => {
    setQuestions([...questions, { id: `q${Date.now()}`, type: 'short_answer', text: '', points: 5, answer: '' }])
  }

  const toggleStudentField = (field: string) => {
    setStudentFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ember/10 border-white/[0.04]">
            <FileText className="h-5 w-5 text-ember" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Worksheet Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Create, preview, and print worksheets with AI assistance</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Worksheet</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editWs ? 'Edit Worksheet' : 'Create Worksheet'}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Algebra Practice" className="forge-input-glow" /></div>
                <div><Label>Subject</Label><Select value={subject} onValueChange={setSubject}><SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Difficulty</Label><Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50 forge-input-glow" /><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent></Select></div>
                <div><Label>Spacing</Label><Select value={spacing} onValueChange={setSpacing}><SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50 forge-input-glow" /><SelectContent><SelectItem value="compact">Compact</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="generous">Generous</SelectItem></SelectContent></Select></div>
                <div><Label>Question Count</Label><Input type="number" value={qCount} onChange={(e) => setQCount(+e.target.value)} min={1} max={50} className="forge-input-glow" /></div>
              </div>
              <div><Label>Instructions</Label><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions for students..." rows={2} /></div>
              <div><Label>School Name (Header)</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g., Greenfield Academy" /></div>
              <div><Label>Student Info Fields</Label><div className="flex flex-wrap gap-2 mt-1">{STUDENT_FIELDS.map(f => <Badge key={f} variant={studentFields.includes(f) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleStudentField(f)}>{studentFields.includes(f) ? '✓ ' : ''}{f}</Badge>)}</div></div>
              <Button variant="outline" onClick={handleAIGenerate} disabled={aiLoading} className="w-full border-primary/30 text-primary hover:bg-primary/5 neural-glow">
                {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI Generate Worksheet
              </Button>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2"><Label>Questions ({questions.length})</Label><Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Add</Button></div>
                <div className="space-y-3 max-h-60 overflow-y-auto">{questions.map((q, i) => (
                  <Card key={q.id} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                      <Select value={q.type} onValueChange={(v) => { const u = [...questions]; u[i] = { ...u[i], type: v }; setQuestions(u) }}>
                        <SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50 w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Q_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={q.points} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], points: +e.target.value }; setQuestions(u) }} className="w-16 h-7 text-xs" />
                      <span className="text-xs text-muted-foreground">pts</span>
                      <Button size="sm" variant="ghost" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="ml-auto text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <Textarea value={q.text} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], text: e.target.value }; setQuestions(u) }} placeholder="Question text..." className="text-sm" rows={2} />
                    {(q.type === 'single_choice' || q.type === 'multi_choice') && <div className="mt-2 space-y-1">{(q.options || ['', '', '', '']).map((opt, oi) => <Input key={oi} value={opt} onChange={(e) => { const u = [...questions]; const opts = [...(u[i].options || ['', '', '', ''])]; opts[oi] = e.target.value; u[i] = { ...u[i], options: opts }; setQuestions(u) }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="h-7 text-xs" />)}</div>}
                  </Card>
                ))}</div>
              </div>
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} className="rounded" /> Save as template</Label>
                {saveAsTemplate && <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" className="flex-1" />}
              </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} {editWs ? 'Update' : 'Create'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {worksheets.length === 0 ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-12 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm forge-glow"><AlertCircle className="h-8 w-8 text-primary" /></div><h3 className="text-lg font-semibold mb-2">No worksheets yet</h3><p className="text-sm text-muted-foreground mb-4">Create your first worksheet with AI assistance</p><Button onClick={() => setDialogOpen(true)} className="forge-glow"><Plus className="h-4 w-4 mr-1" /> Create Worksheet</Button></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>{worksheets.map((ws) => (
            <motion.div key={ws.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div><CardTitle className="text-base">{ws.title}</CardTitle><CardDescription>{ws.subject}</CardDescription></div>
                    <div className="flex gap-1"><Badge variant="outline" className="text-xs capitalize">{ws.difficulty}</Badge>{ws.isTemplate && <Badge className="bg-green-50 dark:bg-green-950 text-emerald-800 text-xs">Template</Badge>}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">{ws.questions.length} questions • {ws.questions.reduce((a, q) => a + q.points, 0)} total points</div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setPreviewWs(ws)}><Eye className="h-3 w-3 mr-1" /> Preview</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(ws)}><Edit3 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(ws.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}</AnimatePresence>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewWs} onOpenChange={(o) => { if (!o) setPreviewWs(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle>Worksheet Preview</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { if (previewWs) window.print() }}><Printer className="h-3 w-3 mr-1" /> Print</Button>
                <Button size="sm" variant="outline" onClick={() => { if (previewWs) { const text = generateWorksheetText(previewWs); navigator.clipboard.writeText(text); toast({ title: 'Copied!' }) } }}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
              </div>
            </div>
          </DialogHeader>
          {previewWs && (
            <div className="space-y-4 print:space-y-2" id="worksheet-preview">
              {previewWs.headerConfig?.schoolName && <h2 className="text-center text-lg font-bold">{previewWs.headerConfig.schoolName}</h2>}
              <h3 className="text-center text-base font-semibold">{previewWs.title}</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                {previewWs.headerConfig?.studentInfoFields?.map(f => (
                  <div key={f} className="flex items-center gap-2"><span className="font-medium">{f}:</span><span className="border-b border-current w-32 inline-block">&nbsp;</span></div>
                ))}
              </div>
              {previewWs.instructions && <p className="text-sm italic text-muted-foreground">{previewWs.instructions}</p>}
              <Separator />
              <div className="space-y-4">{previewWs.questions.map((q, i) => (
                <div key={q.id} className={cn(spacing === 'compact' ? 'space-y-1' : spacing === 'generous' ? 'space-y-4' : 'space-y-2')}>
                  <p className="font-medium text-sm"><span className="mr-2">{i + 1}.</span>{q.text} <span className="text-muted-foreground">[{q.points} pts]</span></p>
                  {(q.type === 'single_choice' || q.type === 'multi_choice') && q.options && <div className="ml-6 space-y-1">{q.options.map((opt, oi) => <p key={oi} className="text-sm">{String.fromCharCode(65 + oi)}) {opt}</p>)}</div>}
                  {q.type === 'true_false' && <div className="ml-6 space-y-1"><p className="text-sm">A) True</p><p className="text-sm">B) False</p></div>}
                  {(q.type === 'short_answer' || q.type === 'essay') && <div className="ml-6 border-b border-dashed border-muted w-full h-16" />}
                  {q.type === 'fill_blank' && <div className="ml-6 border-b border-dashed border-muted w-48 inline-block" />}
                </div>
              ))}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function generateWorksheetText(ws: Worksheet): string {
  let text = ''
  if (ws.headerConfig?.schoolName) text += `${ws.headerConfig.schoolName}\n\n`
  text += `${ws.title}\nSubject: ${ws.subject}\n\n`
  if (ws.instructions) text += `${ws.instructions}\n\n`
  ws.questions.forEach((q, i) => {
    text += `${i + 1}. ${q.text} [${q.points} pts]\n`
    if ((q.type === 'single_choice' || q.type === 'multi_choice') && q.options) q.options.forEach((opt, oi) => { text += `   ${String.fromCharCode(65 + oi)}) ${opt}\n` })
    if (q.type === 'true_false') text += '   A) True\n   B) False\n'
    text += '\n'
  })
  return text
}
