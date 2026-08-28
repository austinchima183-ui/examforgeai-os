'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  FilePlus, Upload, Users, Monitor, CheckCircle2,
  BarChart3, Award, ChevronRight, Clock, Eye
} from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { CBTWorkflowIllustration } from '@/components/marketing/illustrations'
import { CBTExamInterfaceScreen, AIQuestionGeneratorScreen } from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — CBT Experience Section (Premium)
// ============================================================================
// Step-by-step animated walkthrough of the CBT exam lifecycle with a mini
// CBT preview, progress indicators, animated transitions between steps,
// and premium glassmorphism card design.
// ============================================================================

const steps = [
  {
    icon: FilePlus,
    number: '01',
    title: 'Create Exam',
    description:
      'Set up your exam with subject, duration, and question types. Use AI to generate questions from your curriculum or import from your question bank.',
    detail: 'Choose from multiple-choice, essay, fill-in-the-blank, and true/false. Set difficulty levels, marks per question, and negative marking rules.',
    preview: {
      type: 'create',
      title: 'SS2 Biology - Mid Term',
      questions: 40,
      duration: '60 min',
    },
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Upload,
    number: '02',
    title: 'Publish',
    description:
      'Schedule your exam, assign it to classes or specific students, and publish. Students receive instant notifications with exam details and timing.',
    detail: 'Set start/end times, time limits, and access codes. Control who can take the exam and when.',
    preview: {
      type: 'publish',
      title: 'Exam Published',
      students: 156,
      class: 'SS2A, SS2B',
    },
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Users,
    number: '03',
    title: 'Students Take Exam',
    description:
      'Students log in on any device — desktop, tablet, or phone. The CBT interface is intuitive, accessible, and works offline with auto-sync.',
    detail: 'Built-in timer, question navigation, answer review, and auto-save. Supports accessibility features and multiple languages.',
    preview: {
      type: 'taking',
      title: 'Question 15 of 40',
      timeLeft: '32:45',
      progress: 37,
    },
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Monitor,
    number: '04',
    title: 'Live Monitoring',
    description:
      'Watch students take the exam in real-time. Track progress, flag suspicious activity, and intervene immediately if needed.',
    detail: 'Live dashboard showing student status, time remaining, and progress. Automatic flagging for tab-switching and unusual behavior.',
    preview: {
      type: 'monitor',
      title: 'Live Dashboard',
      active: 142,
      flagged: 3,
      completed: 11,
    },
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: CheckCircle2,
    number: '05',
    title: 'Automatic Marking',
    description:
      'Objective questions are marked instantly. AI marks subjective questions with rubric-based scoring and detailed feedback for each student.',
    detail: '85% reduction in marking time. Teachers review and approve AI-generated scores with one click.',
    preview: {
      type: 'marking',
      title: 'Auto-Marking Complete',
      accuracy: 99.1,
      timeSaved: '18 hrs',
    },
    color: 'from-indigo-500 to-amber-500',
  },
  {
    icon: BarChart3,
    number: '06',
    title: 'Analytics',
    description:
      'Instant results with comprehensive analytics. See class performance, question difficulty analysis, and individual student breakdowns.',
    detail: 'Item analysis, distractor analysis, and reliability coefficients. Export to PDF or share with parents.',
    preview: {
      type: 'analytics',
      title: 'Class Performance',
      avgScore: 72,
      passRate: 89,
    },
    color: 'from-cyan-500 to-teal-600',
  },
  {
    icon: Award,
    number: '07',
    title: 'Certificates',
    description:
      'Auto-generate and distribute certificates for qualified students. Customizable templates with school branding and digital verification.',
    detail: 'QR code verification, bulk generation, and direct email delivery to students and parents.',
    preview: {
      type: 'certificate',
      title: 'Certificates Issued',
      count: 134,
      verified: true,
    },
    color: 'from-amber-500 to-yellow-600',
  },
]

function MiniCBTPreview({ step, isInView }: { step: typeof steps[0]; isInView: boolean }) {
  const preview = step.preview

  if (preview.type === 'create') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">{preview.title}</span>
          <span className="text-[10px] text-muted-foreground">Draft</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Questions</p>
            <p className="text-sm font-bold">{preview.questions}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Duration</p>
            <p className="text-sm font-bold">{preview.duration}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {['MCQ', 'Essay', 'Fill-in-the-blank'].map((type, i) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-2 rounded-md bg-muted/30 p-1.5"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">{type}</span>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (preview.type === 'taking') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{preview.title}</span>
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] font-mono font-bold">{preview.timeLeft}</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: `${preview.progress}%` } : { width: 0 }}
            transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Which organelle is responsible for photosynthesis?</p>
          <div className="space-y-1">
            {['A. Mitochondria', 'B. Chloroplast', 'C. Nucleus', 'D. Ribosome'].map((opt, i) => (
              <div
                key={opt}
                className={`text-[10px] rounded px-2 py-1 ${i === 1 ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (preview.type === 'monitor') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{preview.title}</span>
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Eye className="h-3 w-3" />
            <span className="text-[10px] font-medium">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-green-50 dark:bg-green-9500/10 p-2 text-center">
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{preview.active}</p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-9500/10 p-2 text-center">
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{preview.flagged}</p>
            <p className="text-[9px] text-muted-foreground">Flagged</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-center">
            <p className="text-sm font-bold text-primary">{preview.completed}</p>
            <p className="text-[9px] text-muted-foreground">Done</p>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-full ${
                i < 3 ? 'bg-green-50 dark:bg-green-9500/40' : i < 5 ? 'bg-yellow-50 dark:bg-yellow-9500/40' : i < 8 ? 'bg-primary/30' : 'bg-muted/30'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (preview.type === 'marking') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{preview.title}</span>
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-green-50 dark:bg-green-9500/10 p-2">
            <p className="text-[10px] text-muted-foreground">AI Accuracy</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{preview.accuracy}%</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-[10px] text-muted-foreground">Time Saved</p>
            <p className="text-sm font-bold text-primary">{preview.timeSaved}</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: `${preview.accuracy}%` } : { width: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
      </div>
    )
  }

  if (preview.type === 'analytics') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{preview.title}</span>
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-[10px] text-muted-foreground">Avg Score</p>
            <p className="text-sm font-bold text-primary">{preview.avgScore}%</p>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-9500/10 p-2">
            <p className="text-[10px] text-muted-foreground">Pass Rate</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{preview.passRate}%</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-12">
          {[60, 72, 68, 82, 75, 89, 84, 91, 78, 86].map((val, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={isInView ? { height: `${val}%` } : { height: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
              className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary/30 min-h-[2px]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (preview.type === 'certificate') {
    return (
      <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{preview.title}</span>
          <Award className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="rounded-lg border-2 border-dashed border-amber-500/30 bg-yellow-50 dark:bg-yellow-9500/5 p-3 text-center">
          <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">Certificate of Excellence</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">QR Verified</p>
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-primary">{preview.count}</span>
          <span className="text-[10px] text-muted-foreground ml-1">issued</span>
        </div>
      </div>
    )
  }

  // publish
  return (
    <div className="rounded-xl border border-white/[0.04] forge-glass-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{preview.title}</span>
        <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-9500/10 rounded-full px-2 py-0.5">Live</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Students</p>
          <p className="text-sm font-bold">{preview.students}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Class</p>
          <p className="text-sm font-bold">{preview.class}</p>
        </div>
      </div>
    </div>
  )
}

export function CBTExperienceSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [activeStep, setActiveStep] = useState(0)

  const autoAdvance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % steps.length)
  }, [])

  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(autoAdvance, 5000)
    return () => clearInterval(interval)
  }, [isInView, autoAdvance])

  return (
    <SectionWrapper id="cbt">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            CBT Experience
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            From creation to{' '}
            <GradientText preset="cool">certification</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            The complete CBT exam lifecycle — from setting up an exam to issuing certificates
            — all in one seamless workflow. Here is how it works.
          </motion.p>
        </div>

        {/* CBT Workflow Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex justify-center mb-10"
        >
          <CBTWorkflowIllustration className="h-16 w-auto sm:h-20" />
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, i) => {
              const Icon = step.icon
              const isActive = i === activeStep
              const isCompleted = i < activeStep
              return (
                <button
                  key={step.number}
                  onClick={() => setActiveStep(i)}
                  className="flex flex-col items-center gap-1.5 group"
                  aria-label={`Go to step ${step.number}: ${step.title}`}
                >
                  <div
                    className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-110'
                        : isCompleted
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/50 bg-card/50'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors duration-300 ${
                        isActive ? 'text-primary' : isCompleted ? 'text-primary/60' : 'text-foreground/35'
                      }`}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="activeStep"
                        className="absolute -inset-px rounded-xl border-2 border-primary"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium transition-colors duration-300 ${
                      isActive ? 'text-primary' : 'text-foreground/35'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Progress bar */}
          <div className="max-w-3xl mx-auto mt-3 h-1 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
              animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>

        {/* Active Step Detail with Mini Preview */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              {/* Gradient border glow */}
              <div
                className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${steps[activeStep].color} opacity-20 blur-[1px]`}
                aria-hidden="true"
              />
              <div className="relative rounded-2xl border border-white/[0.04] forge-glass-surface p-6 sm:p-8 lg:p-10 forge-card-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Text content */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] shadow-lg`}>
                        {(() => {
                          const Icon = steps[activeStep].icon
                          return <Icon className="h-6 w-6 text-white" />
                        })()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">
                          Step {steps[activeStep].number}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold">{steps[activeStep].title}</h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {steps[activeStep].description}
                    </p>
                    <p className="text-sm text-foreground/55 leading-relaxed">
                      {steps[activeStep].detail}
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                      <button
                        onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                        disabled={activeStep === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-card/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="Previous step"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                        disabled={activeStep === steps.length - 1}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/25"
                        aria-label="Next step"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Real CBT Product Screen */}
                  <div className="hidden lg:block">
                    {steps[activeStep].preview.type === 'taking' || steps[activeStep].preview.type === 'monitor' ? (
                      <div className="rounded-xl overflow-hidden border border-white/[0.04] forge-card-shadow">
                        <CBTExamInterfaceScreen />
                      </div>
                    ) : (
                      <MiniCBTPreview step={steps[activeStep]} isInView={isInView} />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </SectionWrapper>
  )
}
