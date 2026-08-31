'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — Student Practice Mode Page
// ============================================================================
// Students select subject and difficulty, practice questions with timer,
// score tracking, streak counter, and results summary.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Lucide Icons ──
import {
  Target, Clock, Zap, CheckCircle2, XCircle, ArrowRight,
  RotateCcw, Sparkles, Brain, Trophy, BarChart3, BookOpen,
  ChevronRight, Loader2, AlertCircle,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface PracticeQuestion {
  id: string
  content: string
  question_type: string
  difficulty: string
  options?: { id: string; label: string; content: string; isCorrect?: boolean }[] | null
  correct_answer: string | null
  explanation: string | null
  marks: number
  time_seconds: number | null
}

interface Subject {
  id: string
  name: string
  code: string
}

type Phase = 'setup' | 'practicing' | 'results'

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [results, setResults] = useState<{ questionId: string; correct: boolean; timeTaken: number }[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartRef = useRef<number>(Date.now())

  // ── Fetch subjects on mount ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('/api/student/practice')
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        setSubjects(data.subjects ?? [])
      } catch (err) {
        setError('Could not load subjects. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Timer ──
  useEffect(() => {
    if (phase !== 'practicing' || isAnswered) return
    if (timeLeft <= 0) {
      handleTimeUp()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, timeLeft, isAnswered])

  const handleTimeUp = useCallback(() => {
    if (!isAnswered) {
      setIsAnswered(true)
      setIsCorrect(false)
      setIncorrectCount((c) => c + 1)
      setStreak(0)
      results.push({ questionId: questions[currentIndex]?.id ?? '', correct: false, timeTaken: 0 })
      setResults([...results])
    }
  }, [isAnswered, currentIndex, questions, results])

  // ── Start Practice ──
  const startPractice = async () => {
    setGenerating(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedSubject !== 'all') params.set('subject_id', selectedSubject)
      if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty)

      const res = await fetch(`/api/student/practice?${params}`)
      if (!res.ok) throw new Error('Failed to load questions')
      const data = await res.json()

      let fetchedQuestions: PracticeQuestion[] = data.questions ?? []

      // If no questions found, generate with AI
      if (fetchedQuestions.length === 0) {
        const subjectName = subjects.find((s) => s.id === selectedSubject)?.name ?? 'General'
        const aiRes = await apiFetch('/api/ai/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Generate 5 practice questions for ${subjectName} at ${selectedDifficulty === 'all' ? 'mixed' : selectedDifficulty} difficulty. Return JSON array with: {content, question_type (single_choice/multi_choice/true_false/short_answer), options (for MCQ: [{id,label,content,isCorrect}]), correct_answer, explanation}. Make questions educationally sound.`,
            mode: 'practice',
          }),
        })
        const aiData = await aiRes.json()
        try {
          const parsed = JSON.parse(aiData.result ?? aiData.content ?? '[]')
          if (Array.isArray(parsed)) {
            fetchedQuestions = parsed.map((q: PracticeQuestion, i: number) => ({
              ...q,
              id: q.id ?? `ai-${i}`,
              marks: q.marks ?? 1,
              difficulty: selectedDifficulty === 'all' ? 'medium' : selectedDifficulty,
            }))
          }
        } catch {
          // AI response not parseable — use empty
        }
      }

      if (fetchedQuestions.length === 0) {
        setError('No questions available for this selection. Try a different subject or difficulty.')
        setGenerating(false)
        return
      }

      // Shuffle questions
      const shuffled = fetchedQuestions.sort(() => Math.random() - 0.5)
      setQuestions(shuffled)
      setCurrentIndex(0)
      setScore(0)
      setStreak(0)
      setBestStreak(0)
      setCorrectCount(0)
      setIncorrectCount(0)
      setResults([])
      setSelectedAnswer(null)
      setIsAnswered(false)
      setTimeLeft(shuffled[0]?.time_seconds ?? 60)
      questionStartRef.current = Date.now()
      setPhase('practicing')
    } catch (err) {
      setError('Failed to start practice session. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Submit Answer ──
  const submitAnswer = () => {
    if (!selectedAnswer) return
    const q = questions[currentIndex]
    let correct = false

    if (q.question_type === 'single_choice' || q.question_type === 'multi_choice') {
      const correctOption = q.options?.find((o) => o.isCorrect)
      correct = selectedAnswer === correctOption?.id
    } else if (q.question_type === 'true_false') {
      correct = selectedAnswer.toLowerCase() === q.correct_answer?.toLowerCase()
    } else {
      // Short answer — simple match
      correct = selectedAnswer.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()
    }

    setIsAnswered(true)
    setIsCorrect(correct)
    const timeTaken = (Date.now() - questionStartRef.current) / 1000

    if (correct) {
      setScore((s) => s + q.marks)
      setCorrectCount((c) => c + 1)
      setStreak((s) => {
        const newStreak = s + 1
        setBestStreak((b) => Math.max(b, newStreak))
        return newStreak
      })
    } else {
      setIncorrectCount((c) => c + 1)
      setStreak(0)
    }
    setResults((r) => [...r, { questionId: q.id, correct, timeTaken }])
  }

  // ── Next Question ──
  const nextQuestion = () => {
    if (currentIndex >= questions.length - 1) {
      setPhase('results')
      return
    }
    const nextIdx = currentIndex + 1
    setCurrentIndex(nextIdx)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setTimeLeft(questions[nextIdx]?.time_seconds ?? 60)
    questionStartRef.current = Date.now()
  }

  // ── Restart ──
  const restart = () => {
    setPhase('setup')
    setQuestions([])
    setError(null)
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 forge-skeleton" />
          <Skeleton className="h-32 forge-skeleton" />
          <Skeleton className="h-32 forge-skeleton" />
        </div>
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
            <Target className="h-6 w-6 text-primary neural-glow" />
            Practice Mode
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Sharpen your skills with AI-powered practice questions</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Zap className="h-3.5 w-3.5 mr-1" />
          {questions.length > 0 ? `${questions.length} Questions` : 'Ready'}
        </Badge>
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

      <AnimatePresence mode="wait">
        {/* ── SETUP PHASE ── */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-neural neural-glow" /> Configure Your Practice</CardTitle>
                <CardDescription>Select a subject and difficulty level to begin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="practice-subject" className="text-sm font-medium text-muted-foreground">Subject</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger id="practice-subject" className="h-10 forge-input-glow"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="practice-difficulty" className="text-sm font-medium text-muted-foreground">Difficulty</label>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger id="practice-difficulty" className="h-10 forge-input-glow"><SelectValue placeholder="All Levels" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={startPractice} disabled={generating} className="w-full sm:w-auto forge-glow" size="lg">
                  {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Questions...</> : <><Sparkles className="h-4 w-4 mr-2" /> Start Practice</>}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3 mt-6">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /></div><div><p className="text-2xl font-bold">{correctCount}</p><p className="text-xs text-foreground/60">Correct this session</p></div></CardContent></Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div><div><p className="text-2xl font-bold">{bestStreak}</p><p className="text-xs text-foreground/60">Best streak</p></div></CardContent></Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{score}</p><p className="text-xs text-foreground/60">Total score</p></div></CardContent></Card>
            </div>
          </motion.div>
        )}

        {/* ── PRACTICING PHASE ── */}
        {phase === 'practicing' && questions[currentIndex] && (
          <motion.div key="practicing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {/* Progress bar & stats */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
                <div className="flex items-center gap-3">
                  {streak >= 3 && <Badge className="bg-yellow-50 dark:bg-yellow-950 text-white"><Zap className="h-3 w-3 mr-1" />{streak} streak!</Badge>}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{timeLeft}s
                  </Badge>
                </div>
              </div>
              <Progress value={((currentIndex + 1) / questions.length) * 100} />
            </div>

            {/* Question Card */}
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{questions[currentIndex].question_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
                  <Badge variant="outline">{questions[currentIndex].difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-medium">{questions[currentIndex].content}</p>

                {/* MCQ Options */}
                {(questions[currentIndex].question_type === 'single_choice' || questions[currentIndex].question_type === 'multi_choice') && questions[currentIndex].options && (
                  <div className="space-y-2">
                    {questions[currentIndex].options!.map((option) => {
                      const correctOption = questions[currentIndex].options?.find((o) => o.isCorrect)
                      const isThisCorrect = option.id === correctOption?.id
                      const isSelected = selectedAnswer === option.id

                      return (
                        <button
                          key={option.id}
                          onClick={() => !isAnswered && setSelectedAnswer(option.id)}
                          disabled={isAnswered}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-all',
                            isAnswered && isThisCorrect && 'border-emerald-500 bg-green-50 dark:bg-green-950',
                            isAnswered && isSelected && !isThisCorrect && 'border-red-500 bg-destructive/10',
                            !isAnswered && isSelected && 'border-primary bg-primary/5',
                            !isAnswered && !isSelected && 'hover:border-primary/50 hover:bg-muted/50',
                          )}
                        >
                          <span className="font-medium mr-2">{option.label}.</span> {option.content}
                          {isAnswered && isThisCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 inline ml-2" />}
                          {isAnswered && isSelected && !isThisCorrect && <XCircle className="h-4 w-4 text-destructive inline ml-2" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* True/False */}
                {questions[currentIndex].question_type === 'true_false' && (
                  <div className="flex gap-3">
                    {['True', 'False'].map((val) => {
                      const isThisCorrect = val.toLowerCase() === questions[currentIndex].correct_answer?.toLowerCase()
                      const isSelected = selectedAnswer === val
                      return (
                        <button
                          key={val}
                          onClick={() => !isAnswered && setSelectedAnswer(val)}
                          disabled={isAnswered}
                          className={cn(
                            'flex-1 p-3 rounded-lg border text-center font-medium transition-all',
                            isAnswered && isThisCorrect && 'border-emerald-500 bg-green-50 dark:bg-green-950',
                            isAnswered && isSelected && !isThisCorrect && 'border-red-500 bg-destructive/10',
                            !isAnswered && isSelected && 'border-primary bg-primary/5',
                            !isAnswered && !isSelected && 'hover:border-primary/50',
                          )}
                        >
                          {val}
                          {isAnswered && isThisCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 inline ml-2" />}
                          {isAnswered && isSelected && !isThisCorrect && <XCircle className="h-4 w-4 text-destructive inline ml-2" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {questions[currentIndex].question_type === 'short_answer' && (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={selectedAnswer ?? ''}
                      onChange={(e) => !isAnswered && setSelectedAnswer(e.target.value)}
                      disabled={isAnswered}
                      placeholder="Type your answer..."
                      className="h-10 forge-input-glow rounded-lg bg-[#1D1D1D]/50"
                    />
                    {isAnswered && questions[currentIndex].correct_answer && (
                      <p className="text-sm text-green-600 dark:text-green-400">Correct answer: {questions[currentIndex].correct_answer}</p>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {isAnswered && questions[currentIndex].explanation && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" /> Explanation</p>
                    <p className="text-sm text-muted-foreground mt-1">{questions[currentIndex].explanation}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4">
                  {!isAnswered ? (
                    <Button onClick={submitAnswer} disabled={!selectedAnswer}>
                      Submit Answer <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={nextQuestion}>
                      {currentIndex >= questions.length - 1 ? 'View Results' : 'Next Question'} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Live Stats */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-green-600 dark:text-green-400">{correctCount}</p><p className="text-xs text-foreground/60">Correct</p></CardContent></Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-destructive">{incorrectCount}</p><p className="text-xs text-foreground/60">Wrong</p></CardContent></Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{streak}</p><p className="text-xs text-foreground/60">Streak</p></CardContent></Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow"><CardContent className="p-3 text-center"><p className="text-lg font-bold">{score}</p><p className="text-xs text-foreground/60">Score</p></CardContent></Card>
            </div>
          </motion.div>
        )}

        {/* ── RESULTS PHASE ── */}
        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 neural-glow" /> Practice Complete!</CardTitle>
                <CardDescription>Here&apos;s how you performed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/10"><p className="text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}</p><p className="text-sm text-muted-foreground">Correct</p></div>
                  <div className="text-center p-4 rounded-lg bg-destructive/100/10"><p className="text-3xl font-bold text-destructive">{incorrectCount}</p><p className="text-sm text-muted-foreground">Incorrect</p></div>
                  <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/10"><p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{bestStreak}</p><p className="text-sm text-muted-foreground">Best Streak</p></div>
                  <div className="text-center p-4 rounded-lg bg-primary/10"><p className="text-3xl font-bold">{score}</p><p className="text-sm text-muted-foreground">Total Score</p></div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Accuracy</span><span>{questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%</span></div>
                  <Progress value={questions.length > 0 ? (correctCount / questions.length) * 100 : 0} />
                </div>

                {/* Question-by-question breakdown */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Question Breakdown</h3>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-white/[0.02] transition-colors">
                        {r.correct ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        <span>Q{i + 1}</span>
                        <span className="text-muted-foreground ml-auto">{r.timeTaken.toFixed(1)}s</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={restart} variant="outline"><RotateCcw className="h-4 w-4 mr-2" /> New Session</Button>
                  <Button onClick={() => { setPhase('practicing'); setCurrentIndex(0); setSelectedAnswer(null); setIsAnswered(false); setTimeLeft(questions[0]?.time_seconds ?? 60); questionStartRef.current = Date.now(); }}>
                    <BarChart3 className="h-4 w-4 mr-2" /> Review Answers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
