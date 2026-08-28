'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardCheck, Sparkles, Loader2, AlertCircle, CheckCircle2,
  User, MessageSquare, BarChart3, ChevronRight, Filter,
  GraduationCap, Star, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Grading Dashboard Page
// ============================================================================
// Student names fetched from profiles, question text from questions table.
// ============================================================================

interface Submission {
  id: string
  examId: string
  studentId: string
  questionId: string
  answer: string
  score: number | null
  maxScore: number
  aiScore: number | null
  aiFeedback: string | null
  gradedBy: string | null
  gradedAt: string | null
  rubricId: string | null
  createdAt: string
  // Joined data
  studentName?: string
  examTitle?: string
  questionText?: string
}

export default function GradingDashboardPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
  const [manualScore, setManualScore] = useState<number>(0)
  const [filterExam, setFilterExam] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Batch grading state
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchSubmissions = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Fetch submissions
      const res = await fetch(`/api/teacher/submissions?ungradedOnly=false`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      if (!Array.isArray(data) || data.length === 0) {
        setSubmissions([])
        return
      }

      // Collect unique student IDs and question IDs
      const studentIds = [...new Set(data.map((s: Record<string, unknown>) => s.studentId as string))]
      const questionIds = [...new Set(data.map((s: Record<string, unknown>) => s.questionId as string))]
      const examIds = [...new Set(data.map((s: Record<string, unknown>) => s.examId as string))]

      // Fetch student profiles for names
      const studentNames: Record<string, string> = {}
      try {
        const profileRes = await fetch(`/api/admin/users?ids=${studentIds.join(',')}`)
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          const users = Array.isArray(profileData) ? profileData : (profileData.users ?? [])
          for (const u of users) {
            studentNames[u.id] = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || `Student ${u.id.slice(0, 8)}`
          }
        }
      } catch {
        // Fall back to ID-based names
      }

      // Fetch question text
      const questionTexts: Record<string, string> = {}
      try {
        for (const qId of questionIds.slice(0, 50)) {
          const qRes = await fetch(`/api/teacher/submissions?questionId=${qId}`)
          if (qRes.ok) {
            const qData = await qRes.json()
            if (qData.questionText) {
              questionTexts[qId] = qData.questionText
            }
          }
        }
      } catch {
        // Fall back to ID-based text
      }

      // Fetch exam titles
      const examTitles: Record<string, string> = {}
      try {
        for (const eId of examIds.slice(0, 20)) {
          examTitles[eId] = `Exam ${eId.slice(0, 8)}`
        }
      } catch {
        // Fall back to ID-based titles
      }

      const mapped = data.map((s: Record<string, unknown>) => ({
        ...s,
        studentName: studentNames[s.studentId as string] || `Student ${(s.studentId as string).slice(0, 8)}`,
        examTitle: examTitles[s.examId as string] || `Exam ${(s.examId as string).slice(0, 8)}`,
        questionText: questionTexts[s.questionId as string] || `Question ${(s.questionId as string).slice(0, 8)}`,
      })) as Submission[]
      setSubmissions(mapped)
    } catch {
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  const handleAIGrade = async (submissionId: string) => {
    setAiLoading(submissionId)
    try {
      const res = await fetch('/api/teacher/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai-grade', submissionId }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, aiScore: data.aiScore, aiFeedback: data.aiFeedback } : s))
      toast({ title: 'AI Score Suggested', description: `Suggested: ${data.aiScore}/${submissions.find(s => s.id === submissionId)?.maxScore}` })
    } catch {
      toast({ title: 'AI Error', description: 'Failed to generate AI score', variant: 'destructive' })
    } finally {
      setAiLoading(null)
    }
  }

  const handleManualGrade = async () => {
    if (!selectedSub) return
    setSaving(true)
    try {
      const res = await fetch('/api/teacher/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedSub.id, score: manualScore, gradedBy: user!.id }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, score: manualScore, gradedBy: user!.id, gradedAt: new Date().toISOString() } : s))
      toast({ title: 'Graded!', description: `Score: ${manualScore}/${selectedSub.maxScore}` })
      setSelectedSub(null)
    } catch {
      toast({ title: 'Error', description: 'Failed to save grade', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleBatchGrade = async () => {
    if (selectedIds.size === 0) return
    setSaving(true)
    try {
      const grades = Array.from(selectedIds).map(id => {
        const sub = submissions.find(s => s.id === id)
        return { id, score: sub?.aiScore ?? sub?.maxScore ? sub.maxScore * 0.5 : 0 }
      }).filter(g => g.score !== undefined)
      await fetch('/api/teacher/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch-grade', grades, gradedBy: user!.id }),
      })
      setSubmissions(prev => prev.map(s => {
        if (selectedIds.has(s.id)) {
          const g = grades.find(g => g.id === s.id)
          return { ...s, score: g?.score ?? s.score, gradedBy: user!.id, gradedAt: new Date().toISOString() }
        }
        return s
      }))
      toast({ title: 'Batch Graded!', description: `${selectedIds.size} submissions graded` })
      setSelectedIds(new Set()); setBatchMode(false)
    } catch {
      toast({ title: 'Error', description: 'Batch grading failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) { next.delete(id) } else { next.add(id) }; return next })
  }

  // Computed stats
  const ungraded = submissions.filter(s => s.score === null)
  const graded = submissions.filter(s => s.score !== null)
  const avgScore = graded.length > 0 ? graded.reduce((a, s) => a + (s.score! / s.maxScore) * 100, 0) / graded.length : 0

  // Score distribution
  const distribution = [0, 0, 0, 0, 0]
  graded.forEach(s => {
    const pct = (s.score! / s.maxScore) * 100
    if (pct <= 20) distribution[0]++
    else if (pct <= 40) distribution[1]++
    else if (pct <= 60) distribution[2]++
    else if (pct <= 80) distribution[3]++
    else distribution[4]++
  })
  const maxDist = Math.max(...distribution, 1)

  // Filter
  const exams = [...new Set(submissions.map(s => s.examId))]
  const filtered = submissions.filter(s => {
    if (filterExam !== 'all' && s.examId !== filterExam) return false
    if (filterStatus === 'ungraded' && s.score !== null) return false
    if (filterStatus === 'graded' && s.score === null) return false
    return true
  })

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-60" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neural/10 border-white/[0.04] neural-glow">
            <ClipboardCheck className="h-5 w-5 text-neural" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grading Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Grade student submissions with AI assistance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBatchMode(!batchMode)}>
            <Filter className="h-3 w-3 mr-1" /> {batchMode ? 'Exit Batch' : 'Batch Grade'}
          </Button>
          {batchMode && selectedIds.size > 0 && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleBatchGrade} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} Grade {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-ember/3 to-transparent" />
          <CardContent className="relative pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-ember/10 border-white/[0.04]"><ClipboardCheck className="h-5 w-5 text-ember" /></div><div><p className="text-2xl font-bold">{submissions.length}</p><p className="text-xs text-muted-foreground">Total Submissions</p></div></div></CardContent>
        </Card>
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/8 via-destructive/3 to-transparent" />
          <CardContent className="relative pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10 border-white/[0.04]"><AlertCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{ungraded.length}</p><p className="text-xs text-muted-foreground">Pending Review</p></div></div></CardContent>
        </Card>
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <CardContent className="relative pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 border-white/[0.04]"><CheckCircle2 className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{graded.length}</p><p className="text-xs text-muted-foreground">Graded</p></div></div></CardContent>
        </Card>
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-200 group">
          <div className="absolute inset-0 bg-gradient-to-br from-neural/8 via-neural/3 to-transparent" />
          <CardContent className="relative pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-neural/10 border-white/[0.04]"><GraduationCap className="h-5 w-5 text-neural" /></div><div><p className="text-2xl font-bold">{avgScore.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Average Score</p></div></div></CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-8 w-8" />}
          title="No Submissions to Grade"
          description="Submissions will appear here when students complete exams with essay or short answer questions. Assign an exam to get started."
          primaryAction={{
            label: 'Create an Exam',
            icon: <GraduationCap className="h-4 w-4" />,
            href: '/exams/create',
          }}
          aiSuggestion={{
            text: 'AI can auto-grade essays when submissions arrive',
          }}
        />
      ) : (
        <>
          {/* Score Distribution */}
          {graded.length > 0 && (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Grade Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {distribution.map((count, i) => {
                    const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%']
                    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-teal-500']
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{count}</span>
                        <div className={cn('w-full rounded-t transition-all', colors[i])} style={{ height: `${(count / maxDist) * 100}%`, minHeight: count > 0 ? '4px' : '0' }} />
                        <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger className="w-40 forge-input-glow"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Exams</SelectItem>{exams.map(e => <SelectItem key={e} value={e}>Exam {e.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 forge-input-glow"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ungraded">Ungraded</SelectItem><SelectItem value="graded">Graded</SelectItem></SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filtered.length} results</span>
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No submissions match your filters</p></Card>
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#111111]/80 hover:bg-[#111111]/80 sticky top-0">
                      {batchMode && <TableHead className="w-10"><input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(filtered.map(s => s.id))); else setSelectedIds(new Set()) }} /></TableHead>}
                      <TableHead>Student</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead className="text-center">AI Score</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow key={sub.id} className={cn('hover:bg-white/[0.02] transition-colors', batchMode && selectedIds.has(sub.id) && 'bg-emerald-500/5')}>
                        {batchMode && <TableCell><input type="checkbox" checked={selectedIds.has(sub.id)} onChange={() => toggleSelect(sub.id)} /></TableCell>}
                        <TableCell className="font-medium">{sub.studentName}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{sub.questionText}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{sub.answer}</TableCell>
                        <TableCell className="text-center">
                          {sub.aiScore !== null ? <Badge variant="outline" className="text-[10px] px-2 rounded-full">{(sub.aiScore).toFixed(1)}/{sub.maxScore}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {sub.score !== null ? <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 rounded-full">{sub.score}/{sub.maxScore}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {sub.score !== null ? <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 rounded-full">Graded</Badge> : <Badge variant="outline" className="text-[10px] px-2 rounded-full text-ember border-ember/30">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {sub.aiScore === null && (
                              <Button size="sm" variant="outline" onClick={() => handleAIGrade(sub.id)} disabled={aiLoading === sub.id} className="neural-glow border-neural/30 text-neural hover:bg-neural/10">
                                {aiLoading === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => { setSelectedSub(sub); setManualScore(sub.score ?? sub.aiScore ?? Math.round(sub.maxScore / 2)) }}>
                              Grade
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Grade Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={(o) => { if (!o) setSelectedSub(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          {selectedSub && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Student</Label><p className="font-medium flex items-center gap-2"><User className="h-4 w-4" />{selectedSub.studentName}</p></div>
                <div><Label className="text-xs text-muted-foreground">Max Score</Label><p className="font-medium">{selectedSub.maxScore} points</p></div>
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Question</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedSub.questionText}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Student Answer</Label>
                <p className="text-sm mt-1 p-3 bg-yellow-50 dark:bg-yellow-950 border border-amber-200 rounded-lg whitespace-pre-wrap">{selectedSub.answer}</p>
              </div>
              {selectedSub.aiFeedback && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Feedback</Label>
                  <p className="text-sm mt-1 p-3 bg-primary/10 border border-blue-200 rounded-lg">{selectedSub.aiFeedback}</p>
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Manual Score</Label>
                    <Input type="number" value={manualScore} onChange={(e) => setManualScore(Math.min(Math.max(0, +e.target.value), selectedSub.maxScore))} min={0} max={selectedSub.maxScore} step={0.5} className="mt-1 forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50" />
                  </div>
                  <div className="pt-6 text-sm text-muted-foreground">/ {selectedSub.maxScore}</div>
                  <div className="pt-6">
                    <Badge className={cn("text-sm", (manualScore / selectedSub.maxScore) >= 0.7 ? 'bg-green-50 dark:bg-green-950 text-emerald-800' : (manualScore / selectedSub.maxScore) >= 0.4 ? 'bg-yellow-50 dark:bg-yellow-950 text-amber-800' : 'bg-destructive/10 text-red-800')}>
                      {((manualScore / selectedSub.maxScore) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={(manualScore / selectedSub.maxScore) * 100} className="h-2" />
                {selectedSub.aiScore !== null && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI suggested: {selectedSub.aiScore.toFixed(1)}/{selectedSub.maxScore}
                    <Button size="sm" variant="link" onClick={() => setManualScore(selectedSub.aiScore!)} className="text-green-600 dark:text-green-400 px-1">Use AI score</Button>
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleManualGrade} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
