'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { BookOpen, Bot, CheckCircle2, XCircle, Clock, Sparkles, ChevronRight, Play, BarChart3 } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { StaggerContainer, StaggerItem, springs, durations, easings } from '@/components/marketing/motion'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Interactive Demos Section
// ============================================================================
// Embedded interactive demos that let visitors experience the product
// directly on the landing page. Includes a mini CBT exam and
// AI question generation simulator.
// ============================================================================

const cbtQuestions = [
  {
    id: 1,
    question: 'Which organelle is responsible for protein synthesis in a cell?',
    options: ['Mitochondria', 'Ribosome', 'Lysosome', 'Golgi apparatus'],
    correct: 1,
    subject: 'Biology',
  },
  {
    id: 2,
    question: 'What is the derivative of f(x) = 3x² + 2x - 5?',
    options: ['6x + 2', '3x + 2', '6x² + 2', '6x - 5'],
    correct: 0,
    subject: 'Mathematics',
  },
  {
    id: 3,
    question: 'In which year did Nigeria gain independence?',
    options: ['1957', '1960', '1963', '1966'],
    correct: 1,
    subject: 'History',
  },
  {
    id: 4,
    question: 'What does HTML stand for?',
    options: [
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Hyper Transfer Markup Language',
      'Home Tool Markup Language',
    ],
    correct: 0,
    subject: 'Computer Science',
  },
]

const aiGenerationSteps = [
  'Analyzing curriculum standards...',
  'Identifying key learning objectives...',
  'Generating question stem...',
  'Creating answer options...',
  'Validating difficulty level...',
  'Computing bloom\'s taxonomy alignment...',
  'Quality check passed ✓',
]

export function InteractiveDemosSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [activeDemo, setActiveDemo] = useState<'cbt' | 'ai'>('cbt')

  return (
    <SectionWrapper id="interactive-demos">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-primary uppercase tracking-wider mb-4"
          >
            <Play className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Try It Yourself
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Experience{' '}
            <GradientText preset="cool">ExamForge AI</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Don't just read about it — try it. Take a mini exam or generate AI questions right here.
          </motion.p>
        </div>

        {/* Demo tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <CbtTabButton
            active={activeDemo === 'cbt'}
            onClick={() => setActiveDemo('cbt')}
          />
          <AiTabButton
            active={activeDemo === 'ai'}
            onClick={() => setActiveDemo('ai')}
          />
        </div>

        {/* Demo content */}
        <AnimatePresence mode="wait">
          {activeDemo === 'cbt' ? (
            <motion.div
              key="cbt"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: durations.normal, ease: easings.premium }}
            >
              <CBTDemo />
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: durations.normal, ease: easings.premium }}
            >
              <AIGeneratorDemo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionWrapper>
  )
}

/* ─── Tab Buttons ─── */

function CbtTabButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'bg-[#1D1D1D]/50 text-muted-foreground hover:bg-[#1D1D1D]/80'
      )}
    >
      <BookOpen className="h-4 w-4" />
      Take a CBT Exam
    </button>
  )
}

function AiTabButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'bg-[#1D1D1D]/50 text-muted-foreground hover:bg-[#1D1D1D]/80'
      )}
    >
      <Bot className="h-4 w-4" />
      AI Question Generator
    </button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════ */
/*  CBT Exam Demo                                                            */
/* ═════════════════════════════════════════════════════════════════════════ */

function CBTDemo() {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Timer
  useRef(() => {
    if (submitted) return
    const interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000)
    return () => clearInterval(interval)
  })

  const question = cbtQuestions[currentQ]
  const totalQuestions = cbtQuestions.length
  const score = submitted
    ? cbtQuestions.filter((q) => answers[q.id] === q.correct).length
    : 0

  const handleAnswer = (optionIndex: number) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
  }

  const handleSubmit = () => setSubmitted(true)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden shadow-xl">
        {/* Exam header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">SS2 Combined Science — Demo Exam</p>
              <p className="text-xs text-muted-foreground">{totalQuestions} questions · Objective</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{formatTime(timeElapsed)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.02]">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }}
            transition={springs.smooth}
          />
        </div>

        {/* Question */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: durations.normal, ease: easings.premium }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{question.subject}</span>
                <span className="text-xs text-muted-foreground">Question {currentQ + 1} of {totalQuestions}</span>
              </div>

              <p className="text-lg font-medium leading-relaxed mb-6">{question.question}</p>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, i) => {
                  const isSelected = answers[question.id] === i
                  const isCorrect = submitted && question.correct === i
                  const isWrong = submitted && isSelected && question.correct !== i

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left border transition-all duration-200',
                        !submitted && isSelected && 'border-primary bg-primary/5 shadow-sm shadow-primary/10',
                        !submitted && !isSelected && 'border-white/[0.04] bg-[#1D1D1D]/50 hover:border-white/[0.06] hover:bg-white/[0.02]',
                        isCorrect && 'border-emerald-500/50 bg-green-50 dark:bg-green-9500/5',
                        isWrong && 'border-red-500/50 bg-destructive/100/5',
                      )}
                      whileHover={!submitted ? { scale: 1.01 } : {}}
                      whileTap={!submitted ? { scale: 0.99 } : {}}
                      transition={springs.snappy}
                    >
                      <span className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold border transition-all',
                        !submitted && isSelected && 'bg-primary text-primary-foreground border-primary',
                        !submitted && !isSelected && 'bg-[#1D1D1D]/50 border-white/[0.04] text-muted-foreground',
                        isCorrect && 'bg-green-50 dark:bg-green-9500 text-white border-emerald-500',
                        isWrong && 'bg-destructive/100 text-white border-red-500',
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={cn(
                        'flex-1 text-sm',
                        isCorrect && 'text-green-600 dark:text-green-400',
                        isWrong && 'text-destructive',
                      )}>
                        {option}
                      </span>
                      {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
                      {isWrong && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              ← Previous
            </button>

            {currentQ < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitted}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  submitted
                    ? 'bg-green-50 dark:bg-green-9500 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {submitted ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Submitted
                  </>
                ) : (
                  'Submit Exam'
                )}
              </button>
            )}
          </div>

          {/* Score display */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ ...springs.gentle, duration: durations.slow }}
                className="mt-6 pt-6 border-t border-white/[0.04]"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/5 via-amber-400/3 to-cyan-400/5 border border-primary/10 p-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                  <p className="text-4xl font-bold text-primary">
                    {score}/{totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {score === totalQuestions ? 'Perfect score! 🎉' : score >= totalQuestions / 2 ? 'Good job! Keep practicing.' : 'Keep studying — you\'ll improve!'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════ */
/*  AI Question Generator Demo                                               */
/* ═════════════════════════════════════════════════════════════════════════ */

const subjects = ['Biology', 'Mathematics', 'Physics', 'Chemistry', 'English']
const difficulties = ['Easy', 'Medium', 'Hard']

const generatedQuestions = [
  {
    question: 'Explain the role of mitochondria in cellular respiration and why they are called the "powerhouse of the cell".',
    type: 'Essay',
    blooms: 'Analysis',
    marks: 10,
  },
  {
    question: 'Which of the following is NOT a product of glycolysis?\nA) ATP  B) NADH  C) Pyruvate  D) Glucose',
    type: 'MCQ',
    blooms: 'Knowledge',
    marks: 2,
  },
  {
    question: 'Compare and contrast aerobic and anaerobic respiration in terms of ATP yield and end products.',
    type: 'Essay',
    blooms: 'Evaluation',
    marks: 15,
  },
]

function AIGeneratorDemo() {
  const [subject, setSubject] = useState('Biology')
  const [difficulty, setDifficulty] = useState('Medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(-1)
  const [showQuestions, setShowQuestions] = useState(false)
  const [tokenCount, setTokenCount] = useState(0)

  const handleGenerate = useCallback(() => {
    setIsGenerating(true)
    setGenerationStep(0)
    setShowQuestions(false)
    setTokenCount(0)

    // Simulate AI generation with streaming steps
    let step = 0
    const stepInterval = setInterval(() => {
      step++
      setGenerationStep(step)
      setTokenCount((prev) => prev + Math.floor((step * 17 + 23) % 50 + 20))
      if (step >= aiGenerationSteps.length) {
        clearInterval(stepInterval)
        setTimeout(() => {
          setIsGenerating(false)
          setShowQuestions(true)
        }, 500)
      }
    }, 700)

    return () => clearInterval(stepInterval)
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden shadow-xl">
        {/* Generator header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Question Generator</p>
              <p className="text-xs text-muted-foreground">Powered by ExamForge AI Engine</p>
            </div>
          </div>
          {isGenerating && (
            <motion.div
              className="flex items-center gap-1.5 text-xs text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Generating...
            </motion.div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Subject</label>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                      subject === s
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-[#1D1D1D]/50 text-muted-foreground border border-transparent hover:bg-[#1D1D1D]/80'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Difficulty</label>
              <div className="flex gap-1.5">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                      difficulty === d
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-[#1D1D1D]/50 text-muted-foreground border border-transparent hover:bg-[#1D1D1D]/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          {!isGenerating && !showQuestions && (
            <button
              onClick={handleGenerate}
              className="w-full inline-flex items-center: justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              <Sparkles className="h-4 w-4" />
              Generate Questions
            </button>
          )}

          {/* Generation progress */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {aiGenerationSteps.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: i <= generationStep ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ duration: 0.3, delay: i === generationStep ? 0 : 0 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    {i < generationStep ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : i === generationStep ? (
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent flex-shrink-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 flex-shrink-0" />
                    )}
                    <span className={cn(
                      i < generationStep ? 'text-green-600 dark:text-green-400' :
                      i === generationStep ? 'text-foreground font-medium' :
                      'text-muted-foreground'
                    )}>
                      {step}
                    </span>
                  </motion.div>
                ))}

                {/* Token counter */}
                <div className="pt-3 border-t border-white/[0.03] flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tokens generated: {tokenCount.toLocaleString()}</span>
                  <span>Confidence: {Math.min(99, 85 + generationStep * 2)}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated questions */}
          <AnimatePresence>
            {showQuestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: durations.slow, ease: easings.premium }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">3 questions generated</span>
                  <button
                    onClick={() => { setShowQuestions(false); setGenerationStep(-1) }}
                    className="text-primary hover:underline"
                  >
                    Generate again
                  </button>
                </div>

                {generatedQuestions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: durations.normal, delay: i * 0.1, ease: easings.premium }}
                    className="rounded-xl border border-white/[0.04] bg-[#1D1D1D]/50 p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{q.type}</span>
                      <span className="text-[10px] font-medium bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">{q.blooms}</span>
                      <span className="text-[10px] text-muted-foreground">{q.marks} marks</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{q.question}</p>
                  </motion.div>
                ))}

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] text-xs text-muted-foreground">
                 1,247 tokens · 99.1% confidence · 2.3s generation time
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
