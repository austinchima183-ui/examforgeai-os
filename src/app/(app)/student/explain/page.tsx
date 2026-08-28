'use client'

// ============================================================================
// ExamForge AI — "Explain Anything" Page
// ============================================================================
// Students type any concept and receive an AI-powered explanation with
// analogy, real-world example, key points, misconceptions, and next steps.
// ============================================================================

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Lucide Icons ──
import {
  Sparkles,
  Loader2,
  BookOpen,
  Lightbulb,
  AlertCircle,
  Send,
  RotateCcw,
  Brain,
  Eye,
  Target,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Flame,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic'

interface ExplainFormData {
  concept: string
  subject: string
  learningStyle: LearningStyle
  studentLevel: string
  previousKnowledge: string
}

interface ExplainResult {
  explanation: string
  analogy: string
  realWorldExample: string
  keyPoints: string[]
  commonMisconceptions: string[]
  nextSteps: string[]
}

interface ApiResponse {
  success: boolean
  data?: ExplainResult
  error?: string
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Geography',
  'History',
  'Literature',
  'Computer Science',
  'Further Mathematics',
  'Agricultural Science',
  'Civic Education',
] as const

const STUDENT_LEVELS = [
  'JSS 1 (Year 7)',
  'JSS 2 (Year 8)',
  'JSS 3 (Year 9)',
  'SSS 1 (Year 10)',
  'SSS 2 (Year 11)',
  'SSS 3 (Year 12)',
  'University',
] as const

const LEARNING_STYLES: Array<{ value: LearningStyle; label: string; icon: React.ReactNode }> = [
  { value: 'visual', label: 'Visual', icon: <Eye className="h-4 w-4" /> },
  { value: 'auditory', label: 'Auditory', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'reading', label: 'Reading', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'kinesthetic', label: 'Kinesthetic', icon: <Flame className="h-4 w-4" /> },
]

// ──────────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function ExplainAnythingPage() {
  // ── Form State ──
  const [formData, setFormData] = useState<ExplainFormData>({
    concept: '',
    subject: '',
    learningStyle: 'visual',
    studentLevel: '',
    previousKnowledge: '',
  })

  // ── API State ──
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Derived ──
  const isFormValid = formData.concept.trim().length > 0 && formData.subject.length > 0

  // ── Submit Handler ──
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const previousKnowledgeArray = formData.previousKnowledge
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const response = await fetch('/api/ai/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'explain',
          data: {
            concept: formData.concept.trim(),
            subject: formData.subject,
            studentLevel: formData.studentLevel || undefined,
            learningStyle: formData.learningStyle,
            previousKnowledge: previousKnowledgeArray.length > 0 ? previousKnowledgeArray : undefined,
          },
        }),
      })

      const json: ApiResponse = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to get explanation. Please try again.')
      }

      if (!json.data) {
        throw new Error('No explanation data received from the server.')
      }

      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // ── Retry Handler ──
  const handleRetry = () => {
    setError(null)
    setResult(null)
  }

  // ── Reset Handler ──
  const handleReset = () => {
    setFormData({
      concept: '',
      subject: '',
      learningStyle: 'visual',
      studentLevel: '',
      previousKnowledge: '',
    })
    setResult(null)
    setError(null)
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-neural neural-glow" />
            Explain Anything
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Type any concept and get an AI-powered explanation tailored to you
          </p>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
        )}
      </motion.div>

      {/* ── Input Form ── */}
      <AnimatePresence mode="wait">
        {!result && !loading && !error && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Concept Input */}
                  <div className="space-y-2">
                    <Label htmlFor="concept" className="text-sm font-medium">
                      What do you want to understand? <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="concept"
                        placeholder="e.g., Photosynthesis"
                        value={formData.concept}
                        onChange={(e) => setFormData((prev) => ({ ...prev, concept: e.target.value }))}
                        className="pr-10 h-11 text-base forge-input-glow rounded-lg bg-[#1D1D1D]/50"
                        autoFocus
                      />
                      <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Subject & Level Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(val) => setFormData((prev) => ({ ...prev, subject: val }))}
                      >
                        <SelectTrigger id="subject" className="h-11 forge-input-glow">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="studentLevel" className="text-sm font-medium">
                        Your Level
                      </Label>
                      <Select
                        value={formData.studentLevel}
                        onValueChange={(val) => setFormData((prev) => ({ ...prev, studentLevel: val }))}
                      >
                        <SelectTrigger id="studentLevel" className="h-11 forge-input-glow">
                          <SelectValue placeholder="Select your level" />
                        </SelectTrigger>
                        <SelectContent>
                          {STUDENT_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Learning Style */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Learning Style</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LEARNING_STYLES.map((style) => (
                        <Button
                          key={style.value}
                          type="button"
                          variant={formData.learningStyle === style.value ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'gap-1.5 h-9 transition-all',
                            formData.learningStyle === style.value
                              ? 'shadow-sm'
                              : 'hover:bg-muted'
                          )}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, learningStyle: style.value }))
                          }
                        >
                          {style.icon}
                          {style.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Previous Knowledge */}
                  <div className="space-y-2">
                    <Label htmlFor="previousKnowledge" className="text-sm font-medium">
                      What do you already know? <span className="text-muted-foreground font-normal">(optional, comma-separated)</span>
                    </Label>
                    <Input
                      id="previousKnowledge"
                      placeholder="e.g., Plant cells, Sunlight energy"
                      value={formData.previousKnowledge}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, previousKnowledge: e.target.value }))
                      }
                      className="h-11 forge-input-glow rounded-lg bg-[#1D1D1D]/50"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="w-full h-11 gap-2 text-base forge-glow"
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    Explain This Concept
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading State ── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardContent className="p-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="inline-flex mb-4 animate-ai-think"
                >
                  <Brain className="h-12 w-12 text-neural" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Thinking about &ldquo;{formData.concept}&rdquo;&hellip;</h3>
                <p className="text-muted-foreground mb-4">
                  Crafting an explanation just for you
                </p>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full bg-primary"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error State ── */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-xl border-destructive/50 bg-destructive/5 forge-glass-surface border-white/[0.04]">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-destructive/10 border border-white/[0.04] flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-destructive mb-1">
                    Something went wrong
                  </h3>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5 shrink-0">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result Section ── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            key="result"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-5"
          >
            {/* ── Explanation (Main Content) ── */}
            <motion.div variants={staggerItem}>
              <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Explanation
                    <Badge variant="secondary" className="ml-auto font-normal">
                      {formData.subject}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
                    {result.explanation}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Analogy & Real-World Example (Side by Side) ── */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Analogy */}
              <motion.div variants={staggerItem}>
                <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow border-amber-500/20 bg-yellow-50/50 dark:bg-yellow-950/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      Analogy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-foreground/90 leading-relaxed">{result.analogy}</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Real-World Example */}
              <motion.div variants={staggerItem}>
                <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow border-emerald-500/20 bg-green-50 dark:bg-green-950/50 dark:bg-emerald-950/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Real-World Example
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-foreground/90 leading-relaxed">{result.realWorldExample}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ── Key Points ── */}
            {result.keyPoints.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2.5">
                      {result.keyPoints.map((point, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3 }}
                          className="flex items-start gap-2.5 text-sm text-foreground/90"
                        >
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Common Misconceptions ── */}
            {result.commonMisconceptions.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow border-rose-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-5 w-5" />
                      Common Misconceptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2.5">
                      {result.commonMisconceptions.map((misconception, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3 }}
                          className="flex items-start gap-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/15 p-3 text-sm"
                        >
                          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{misconception}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Next Steps ── */}
            {result.nextSteps.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="rounded-xl forge-glass-surface border-white/[0.04] forge-card-shadow border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowRight className="h-5 w-5 text-primary" />
                      What to Learn Next
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ol className="space-y-2.5">
                      {result.nextSteps.map((step, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3 }}
                          className="flex items-start gap-3 text-sm text-foreground/90"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{step}</span>
                        </motion.li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Explain Another ── */}
            <motion.div variants={staggerItem} className="text-center pt-2">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <Send className="h-4 w-4" />
                Explain Another Concept
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
