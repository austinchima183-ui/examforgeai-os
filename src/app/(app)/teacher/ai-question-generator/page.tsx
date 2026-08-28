'use client'

// ============================================================================
// ExamForge AI — Question Generator Page
// ============================================================================
// Full AI-powered question generation pipeline:
// Teacher selects subject/topic/difficulty → AI generates questions →
// Teacher reviews/edits → Save to question bank → Track in ai_generations
// ============================================================================

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Edit3,
  Eye,
  ChevronDown,
  BookOpen,
  Brain,
  FileText,
  Filter,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils/cn'
import { AIActionPanel, AIStatusBadge } from '@/components/ai/ai-action-panel'
import type { QuestionType, DifficultyLevel } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  type: QuestionType
  content: string
  options?: Array<{ id: string; text: string; isCorrect: boolean }>
  correctAnswer: string
  explanation: string
  difficulty: DifficultyLevel
  marks: number
  tags: string[]
}

interface GenerationConfig {
  subject: string
  topic: string
  questionTypes: QuestionType[]
  difficulty: DifficultyLevel
  count: number
  examBody: string
  classLevel: string
  specificContent: string
  marksPerQuestion: number
}

// ──────────────────────────────────────────────────────────────
// Default Configuration
// ──────────────────────────────────────────────────────────────

const defaultConfig: GenerationConfig = {
  subject: '',
  topic: '',
  questionTypes: ['single_choice'],
  difficulty: 'medium',
  count: 10,
  examBody: 'waec',
  classLevel: 'SS2',
  specificContent: '',
  marksPerQuestion: 2,
}

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multi_choice', label: 'Multi Choice' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'ordering', label: 'Ordering' },
]

const DIFFICULTY_LEVELS: Array<{ value: DifficultyLevel; label: string; color: string }> = [
  { value: 'easy', label: 'Easy', color: 'text-green-600 dark:text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'hard', label: 'Hard', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'expert', label: 'Expert', color: 'text-destructive' },
]

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function AIQuestionGeneratorPage() {
  const { user } = useAuthStore()
  const [config, setConfig] = useState<GenerationConfig>(defaultConfig)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [previewQuestion, setPreviewQuestion] = useState<number | null>(null)
  const [step, setStep] = useState<'config' | 'review' | 'save'>('config')

  // ── Generate Questions ──
  const handleGenerate = useCallback(async () => {
    if (!config.subject || !config.topic) {
      setError('Subject and topic are required')
      return
    }

    setIsGenerating(true)
    setError(null)
    setQuestions([])
    setSelectedQuestions(new Set())

    try {
      const response = await fetch('/api/ai/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-questions',
          data: {
            subject: config.subject,
            topic: config.topic,
            questionTypes: config.questionTypes,
            difficulty: config.difficulty,
            count: config.count,
            examBody: config.examBody || undefined,
            classLevel: config.classLevel || undefined,
            specificContent: config.specificContent || undefined,
            marksPerQuestion: config.marksPerQuestion,
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Generation failed')
      }

      setQuestions(result.data)
      setSelectedQuestions(new Set(result.data.map((_: unknown, i: number) => i)))
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setIsGenerating(false)
    }
  }, [config])

  // ── Save Selected Questions ──
  const handleSave = useCallback(async () => {
    if (!generationId || selectedQuestions.size === 0) return

    setIsSaving(true)
    setError(null)

    try {
      const questionsToSave = Array.from(selectedQuestions).map((i) => questions[i])

      const response = await fetch('/api/ai/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-questions',
          data: {
            questions: questionsToSave,
            generationId,
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Save failed')
      }

      setStep('save')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions')
    } finally {
      setIsSaving(false)
    }
  }, [questions, selectedQuestions, generationId])

  // ── Toggle Question Selection ──
  const toggleQuestion = useCallback((index: number) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(questions.map((_, i) => i)))
    }
  }, [questions, selectedQuestions])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neural/10 border-white/[0.04] neural-glow animate-ai-think">
          <Brain className="h-5 w-5 text-neural" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Question Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate curriculum-aligned questions instantly with AI
          </p>
        </div>
        <AIStatusBadge
          status={isGenerating ? 'loading' : questions.length > 0 ? 'success' : 'idle'}
          className="ml-auto"
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 p-1 rounded-lg forge-glass-surface border-white/[0.04]">
        {(['config', 'review', 'save'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all',
              step === s ? 'bg-primary text-primary-foreground shadow-sm' :
              i < ['config', 'review', 'save'].indexOf(step) ? 'bg-emerald-500/15 text-emerald-400' :
              'bg-muted/50 text-muted-foreground'
            )}>
              {i < ['config', 'review', 'save'].indexOf(step) ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn(
              'text-xs font-medium capitalize',
              step === s ? 'text-primary' : 'text-muted-foreground'
            )}>
              {s === 'config' ? 'Configure' : s === 'review' ? 'Review' : 'Save'}
            </span>
            {i < 2 && <div className="h-px w-6 bg-border/30" />}
          </div>
        ))}
      </div>

      {/* Configuration Step */}
      {step === 'config' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Subject & Topic */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Subject & Topic</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="qgen-subject">Subject *</Label>
                <Input
                  id="qgen-subject"
                  type="text"
                  value={config.subject}
                  onChange={(e) => setConfig((c) => ({ ...c, subject: e.target.value }))}
                  placeholder="e.g., Mathematics"
                  className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"
                />
              </div>
              <div>
                <Label htmlFor="qgen-topic">Topic *</Label>
                <Input
                  id="qgen-topic"
                  type="text"
                  value={config.topic}
                  onChange={(e) => setConfig((c) => ({ ...c, topic: e.target.value }))}
                  placeholder="e.g., Quadratic Equations"
                  className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"
                />
              </div>
            </div>
          </Card>

          {/* Question Types */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Question Types</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  onClick={() => {
                    setConfig((c) => ({
                      ...c,
                      questionTypes: c.questionTypes.includes(qt.value)
                        ? c.questionTypes.filter((t) => t !== qt.value)
                        : [...c.questionTypes, qt.value],
                    }))
                  }}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
                    config.questionTypes.includes(qt.value)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-white/[0.04]'
                  )}
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Difficulty & Count */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-neural" />
              <h3 className="text-sm font-semibold">Difficulty & Quantity</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="qgen-difficulty">Difficulty</Label>
                <div className="flex gap-1">
                  {DIFFICULTY_LEVELS.map((dl) => (
                    <button
                      key={dl.value}
                      onClick={() => setConfig((c) => ({ ...c, difficulty: dl.value }))}
                      className={cn(
                        'flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all',
                        config.difficulty === dl.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-white/[0.04]'
                      )}
                    >
                      {dl.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="qgen-count">Number of Questions</Label>
                <Input
                  id="qgen-count"
                  type="number"
                  min={1}
                  max={50}
                  value={config.count}
                  onChange={(e) => setConfig((c) => ({ ...c, count: parseInt(e.target.value) || 10 }))}
                  className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"
                />
              </div>
              <div>
                <Label htmlFor="qgen-marks">Marks per Question</Label>
                <Input
                  id="qgen-marks"
                  type="number"
                  min={1}
                  max={20}
                  value={config.marksPerQuestion}
                  onChange={(e) => setConfig((c) => ({ ...c, marksPerQuestion: parseInt(e.target.value) || 2 }))}
                  className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"
                />
              </div>
            </div>
          </Card>

          {/* Optional Fields */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-ember" />
              <h3 className="text-sm font-semibold">Exam Context</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="qgen-exam-body">Exam Body</Label>
                <Select
                  value={config.examBody}
                  onValueChange={(v) => setConfig((c) => ({ ...c, examBody: v }))}
                >
                  <SelectTrigger className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waec">WAEC</SelectItem>
                    <SelectItem value="neco">NECO</SelectItem>
                    <SelectItem value="nabteb">NABTEB</SelectItem>
                    <SelectItem value="jamb_utme">JAMB UTME</SelectItem>
                    <SelectItem value="post_utme">Post UTME</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qgen-class-level">Class Level</Label>
                <Input
                  id="qgen-class-level"
                  type="text"
                  value={config.classLevel}
                  onChange={(e) => setConfig((c) => ({ ...c, classLevel: e.target.value }))}
                  placeholder="e.g., SS2, JSS3"
                  className="forge-input-glow h-10 rounded-lg bg-[#1D1D1D]/50"
                />
              </div>
            </div>
          </Card>

          {/* Teacher Notes / Specific Content */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Teacher Notes</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
              <span className="text-[10px] text-muted-foreground">optional</span>
            </div>
            <Textarea
              id="qgen-teacher-notes"
              value={config.specificContent}
              onChange={(e) => setConfig((c) => ({ ...c, specificContent: e.target.value }))}
              placeholder="Paste your lesson notes, textbook content, or specific material you want questions based on..."
              rows={4}
              className="forge-input-glow rounded-lg bg-[#1D1D1D]/50"
            />
          </Card>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !config.subject || !config.topic}
            size="lg"
            className="w-full gap-2 neural-glow"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin animate-ai-think" />
                <span>Generating {config.count} questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {config.count} Questions
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Review Header */}
          <div className="flex items-center justify-between rounded-xl forge-glass-surface border-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border-white/[0.04]">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm text-foreground">
                <span className="font-semibold">{selectedQuestions.size}</span> of {questions.length} questions selected
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleAll}
                className="text-[10px] font-medium text-primary underline hover:text-primary/80"
              >
                {selectedQuestions.size === questions.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => setStep('config')}
                className="text-[10px] font-medium text-primary underline hover:text-primary/80"
              >
                Back to Config
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'rounded-xl border p-4 transition-all cursor-pointer',
                  selectedQuestions.has(i)
                    ? 'border-primary/30 bg-primary/5 border-white/[0.04]'
                    : 'border-white/[0.04] bg-card hover:bg-white/[0.02]'
                )}
                onClick={() => toggleQuestion(i)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(i)}
                    onChange={() => toggleQuestion(i)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Q{i + 1}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        q.difficulty === 'easy' && 'bg-emerald-500/15 text-emerald-400',
                        q.difficulty === 'medium' && 'bg-ember/15 text-ember',
                        q.difficulty === 'hard' && 'bg-primary/15 text-primary',
                        q.difficulty === 'expert' && 'bg-destructive/15 text-destructive',
                      )}>
                        {q.difficulty}
                      </span>
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-white/[0.04]">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{q.marks} marks</span>
                    </div>
                    <p className="text-sm text-foreground">{q.content}</p>

                    {/* Options for MCQ */}
                    {q.options && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={cn(
                              'rounded px-2 py-1 text-xs',
                              opt.isCorrect
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <span className="font-medium">{opt.id}.</span> {opt.text}
                            {opt.isCorrect && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expandable explanation */}
                    <details className="mt-2">
                      <summary className="text-[10px] font-medium text-primary cursor-pointer hover:text-primary/80">
                        View Answer & Explanation
                      </summary>
                      <div className="mt-1 rounded-lg bg-[#1D1D1D]/50 border border-white/[0.04] p-2">
                        <p className="text-xs font-medium text-emerald-400">
                          Answer: {q.correctAnswer}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>
                      </div>
                    </details>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep('config')}
            >
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedQuestions.size === 0}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save {selectedQuestions.size} Questions to Bank
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Save Confirmation Step */}
      {step === 'save' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20 forge-glow">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold">
            Questions Saved Successfully!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedQuestions.size} questions have been added to your question bank.
            They are currently in &quot;pending review&quot; status.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setQuestions([])
                setSelectedQuestions(new Set())
                setStep('config')
                setConfig(defaultConfig)
              }}
            >
              Generate More
            </Button>
            <Button asChild>
              <a href="/question-bank">
                Go to Question Bank
              </a>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
