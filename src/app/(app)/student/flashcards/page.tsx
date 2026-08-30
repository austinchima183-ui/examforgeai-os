'use client'

// ============================================================================
// ExamForge AI — Student Flashcards Page
// ============================================================================
// Flashcard study tool with flip animation, swipe navigation,
// progress tracking, known/needs-review marking, and spaced repetition.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

// ── Lucide Icons ──
import {
  BookOpen, RotateCcw, ChevronLeft, ChevronRight,
  Check, X, Sparkles, Brain, Loader2, AlertCircle,
  Layers, Star, Flame, Eye, EyeOff,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface Flashcard {
  id: string
  subject_id: string
  front: string
  back: string
  difficulty?: string
  last_reviewed?: string | null
  review_count?: number
  correct_count?: number
}

interface Subject {
  id: string
  name: string
  code: string
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [reviewCards, setReviewCards] = useState<Set<string>>(new Set())
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 })

  // ── Fetch data on mount & subject change ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedSubject !== 'all') params.set('subject_id', selectedSubject)

        const res = await fetch(`/api/student/flashcards?${params}`)
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        setSubjects(data.subjects ?? [])
        setFlashcards(data.flashcards ?? [])
        setCurrentIndex(0)
        setIsFlipped(false)
      } catch (err) {
        setError('Could not load flashcards. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedSubject])

  // ── Generate AI Flashcards ──
  const generateFlashcards = async () => {
    setGenerating(true)
    setError(null)
    try {
      const subjectName = selectedSubject !== 'all'
        ? subjects.find((s) => s.id === selectedSubject)?.name ?? 'General'
        : 'General Studies'

      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate 10 flashcards for ${subjectName}. Return JSON array with: {front (term/question), back (definition/answer), difficulty (easy/medium/hard)}. Focus on key concepts and definitions that a student would need to memorize.`,
          mode: 'flashcard',
        }),
      })

      const data = await res.json()
      const parsed = JSON.parse(data.result ?? data.content ?? '[]')

      if (Array.isArray(parsed) && parsed.length > 0) {
        const newCards: Flashcard[] = parsed.map((c: Flashcard, i: number) => ({
          id: `ai-fc-${i}-${Date.now()}`,
          subject_id: selectedSubject,
          front: c.front,
          back: c.back,
          difficulty: c.difficulty ?? 'medium',
          review_count: 0,
          correct_count: 0,
        }))
        setFlashcards(newCards)
        setCurrentIndex(0)
        setIsFlipped(false)
      } else {
        setError('AI could not generate flashcards. Please try again.')
      }
    } catch (err) {
      setError('Failed to generate flashcards. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((i) => i + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, flashcards.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  // ── Mark Card ──
  const markKnown = () => {
    const card = flashcards[currentIndex]
    if (!card) return
    setKnownCards((prev) => new Set(prev).add(card.id))
    setReviewCards((prev) => { const s = new Set(prev); s.delete(card.id); return s })
    setSessionStats((s) => ({ ...s, correct: s.correct + 1, total: s.total + 1 }))

    // Update spaced repetition via API
    fetch('/api/student/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardId: card.id, isCorrect: true }),
    }).catch(() => {})

    goNext()
  }

  const markNeedsReview = () => {
    const card = flashcards[currentIndex]
    if (!card) return
    setReviewCards((prev) => new Set(prev).add(card.id))
    setKnownCards((prev) => { const s = new Set(prev); s.delete(card.id); return s })
    setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1, total: s.total + 1 }))

    fetch('/api/student/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardId: card.id, isCorrect: false }),
    }).catch(() => {})

    goNext()
  }

  // ── Spaced repetition score ──
  const getSpacedRepScore = (card: Flashcard): number => {
    const total = card.review_count ?? 0
    const correct = card.correct_count ?? 0
    if (total === 0) return 0
    return Math.round((correct / total) * 100)
  }

  const currentCard = flashcards[currentIndex]
  const progressPercent = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /></div>
        <Skeleton className="h-80 forge-skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary neural-glow" />
            Flashcards
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Master key concepts with spaced repetition</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40 h-10 forge-input-glow"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
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

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><Layers className="h-4 w-4 text-primary" /></div>
            <div><p className="text-xl font-bold">{flashcards.length}</p><p className="text-xs text-foreground/60">Total cards</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><Check className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-xl font-bold">{knownCards.size}</p><p className="text-xs text-foreground/60">Known</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-xl font-bold">{reviewCards.size}</p><p className="text-xs text-foreground/60">Needs Review</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-white/[0.04] flex items-center justify-center"><Flame className="h-4 w-4 text-rose-500" /></div>
            <div><p className="text-xl font-bold">{sessionStats.correct > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%</p><p className="text-xs text-foreground/60">Accuracy</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {flashcards.length === 0 && !generating && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow text-center"><CardContent className="p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-white/[0.04] backdrop-blur-sm neural-glow"><Brain className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold mb-2">No Flashcards Available</h3>
            <p className="text-muted-foreground mb-4">Generate AI-powered flashcards for your subjects to start studying.</p>
            <Button onClick={generateFlashcards} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Flashcards</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generating State */}
      {generating && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow text-center"><CardContent className="p-12">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Flashcards...</h3>
            <p className="text-sm text-muted-foreground">AI is creating personalized flashcards for you</p>
          </CardContent>
        </Card>
      )}

      {/* Flashcard View */}
      {flashcards.length > 0 && !generating && currentCard && (
        <>
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span>{Math.round(progressPercent)}% complete</span>
            </div>
            <Progress value={progressPercent} />
          </div>

          {/* Flashcard */}
          <div className="flex justify-center">
            <div
              className="w-full max-w-lg cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ perspective: '1000px' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isFlipped ? 'back' : 'front'}
                  initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <Card className={cn(
                    'min-h-64 transition-shadow forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow',
                    isFlipped ? 'bg-primary/5 border-primary/20' : 'bg-card',
                    knownCards.has(currentCard.id) && 'ring-2 ring-green-600/30',
                    reviewCards.has(currentCard.id) && 'ring-2 ring-amber-500/30',
                  )}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{isFlipped ? 'Answer' : 'Question'}</Badge>
                          {currentCard.difficulty && <Badge variant="outline">{currentCard.difficulty}</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {isFlipped ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">
                      <p className="text-lg leading-relaxed">{isFlipped ? currentCard.back : currentCard.front}</p>
                      {!isFlipped && (
                        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> Tap to reveal answer
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Card Status Badges */}
          <div className="flex justify-center gap-2">
            {knownCards.has(currentCard.id) && <Badge className="bg-green-50 dark:bg-green-950 text-white"><Check className="h-3 w-3 mr-1" /> Known</Badge>}
            {reviewCards.has(currentCard.id) && <Badge className="bg-yellow-50 dark:bg-yellow-950 text-white"><Star className="h-3 w-3 mr-1" /> Needs Review</Badge>}
            {getSpacedRepScore(currentCard) > 0 && (
              <Badge variant="outline">Mastery: {getSpacedRepScore(currentCard)}%</Badge>
            )}
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {isFlipped ? (
              <>
                <Button variant="outline" className="gap-1 text-green-600 dark:text-green-400 border-emerald-500/50 hover:bg-green-50 dark:bg-green-950" onClick={markKnown}>
                  <Check className="h-4 w-4" /> Know It
                </Button>
                <Button variant="outline" className="gap-1 text-yellow-600 dark:text-yellow-400 border-amber-500/50 hover:bg-yellow-50 dark:bg-yellow-950" onClick={markNeedsReview}>
                  <Star className="h-4 w-4" /> Review
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsFlipped(true)} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Flip
              </Button>
            )}

            <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex === flashcards.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Generate More */}
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={generateFlashcards} disabled={generating}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate More Cards
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
