'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Sparkles, CheckCircle2, Brain, TrendingUp,
  GraduationCap, BookOpen, FileText, Search, ArrowRight, Zap
} from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { AIQuestionIllustration, AutoMarkingIllustration, AIQuestionGeneratorScreen } from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — AI Features Section (Premium Edition)
// ============================================================================
// Highlights the 8 AI-powered capabilities with premium glassmorphism cards,
// animated gradient borders, interactive previews, progress indicators,
// animated icons, and a featured hero card for AI Question Generation.
// ============================================================================

// ---------- AI Feature Data ----------

const aiFeatures = [
  {
    icon: Sparkles,
    title: 'AI Question Generation',
    description:
      'Generate exam questions from any topic, subject, or curriculum in seconds. Choose difficulty levels, question types, and cognitive domains.',
    detail: 'Supports multiple-choice, fill-in-the-blank, essay, and true/false questions with automatic answer key generation.',
    gradient: 'from-cyan-500/60 via-indigo-400/40 to-teal-500/60',
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    glowColor: 'hover:shadow-violet-500/15',
    progress: 96,
    progressLabel: 'Accuracy',
    keyTerms: ['question generation', 'cognitive domains'],
    preview: {
      lines: [
        { text: '"Generate 5 MCQs on photosynthesis for SS2 Biology"', highlight: true },
        { text: 'Q1: Which organelle is responsible for photosynthesis?', highlight: false },
        { text: '✓ Chloroplast — Auto-generated answer key', highlight: false },
      ],
    },
  },
  {
    icon: CheckCircle2,
    title: 'Auto Marking',
    description:
      'AI-powered marking for objective and subjective questions. Instant grading with detailed feedback for students, reducing teacher workload by up to 85%.',
    detail: 'Natural language processing for essay marking with rubric-based scoring and personalized feedback.',
    gradient: 'from-emerald-500/60 via-green-400/40 to-teal-500/60',
    iconBg: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400',
    glowColor: 'hover:shadow-emerald-500/15',
    progress: 85,
    progressLabel: 'Workload reduction',
    keyTerms: ['auto marking', '85% reduction'],
    preview: {
      lines: [
        { text: 'Student essay submitted → AI analyzing...', highlight: true },
        { text: 'Score: 78/100 — Rubric breakdown generated', highlight: false },
        { text: '✓ Personalized feedback sent to student', highlight: false },
      ],
    },
  },
  {
    icon: TrendingUp,
    title: 'Performance Insights',
    description:
      'Deep analytics on student performance, class trends, and exam difficulty. Identify struggling students, knowledge gaps, and improvement opportunities automatically.',
    detail: 'AI-generated recommendations for targeted interventions and curriculum adjustments.',
    gradient: 'from-amber-500/60 via-orange-400/40 to-yellow-500/60',
    iconBg: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400',
    glowColor: 'hover:shadow-amber-500/15',
    progress: 92,
    progressLabel: 'Prediction accuracy',
    keyTerms: ['performance insights', 'knowledge gaps'],
    preview: {
      lines: [
        { text: 'Class performance trending → 3 students flagged', highlight: true },
        { text: 'Knowledge gap: Algebra fundamentals', highlight: false },
        { text: '✓ Intervention plan auto-generated', highlight: false },
      ],
    },
  },
  {
    icon: Brain,
    title: 'Predictive Analytics',
    description:
      'Predict student outcomes, identify at-risk learners, and forecast exam results before they happen. Take proactive action based on data-driven insights.',
    detail: 'Machine learning models trained on historical performance data with 94% prediction accuracy.',
    gradient: 'from-amber-500/60 via-orange-400/40 to-red-500/60',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    glowColor: 'hover:shadow-rose-500/15',
    progress: 94,
    progressLabel: 'Prediction accuracy',
    keyTerms: ['predictive analytics', 'at-risk learners'],
    preview: {
      lines: [
        { text: '12 students at risk of failing next term', highlight: true },
        { text: 'Top factor: Low attendance correlation (r=0.87)', highlight: false },
        { text: '✓ Early warning alerts sent to counselors', highlight: false },
      ],
    },
  },
  {
    icon: GraduationCap,
    title: 'AI Study Assistant',
    description:
      'A personal AI tutor for every student. Ask questions, get explanations, practice problems, and receive personalized study recommendations based on performance.',
    detail: 'Context-aware tutoring that adapts to each student\'s learning style and pace.',
    gradient: 'from-cyan-500/60 via-sky-400/40 to-blue-500/60',
    iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    glowColor: 'hover:shadow-cyan-500/15',
    progress: 89,
    progressLabel: 'Student satisfaction',
    keyTerms: ['AI tutor', 'personalized study'],
    preview: {
      lines: [
        { text: 'Student: "Explain mitosis in simple terms"', highlight: true },
        { text: 'AI: "Mitosis is like making a photocopy..."', highlight: false },
        { text: '✓ 3 practice problems generated', highlight: false },
      ],
    },
  },
  {
    icon: BookOpen,
    title: 'Lesson Planning',
    description:
      'AI-assisted lesson plan creation aligned with curriculum standards. Generate weekly plans, learning objectives, and assessment activities in minutes.',
    detail: 'Curriculum mapping with automatic alignment to national and state education standards.',
    gradient: 'from-teal-500/60 via-emerald-400/40 to-green-500/60',
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    glowColor: 'hover:shadow-teal-500/15',
    progress: 91,
    progressLabel: 'Time saved',
    keyTerms: ['lesson planning', 'curriculum standards'],
    preview: {
      lines: [
        { text: 'Topic: "Quadratic Equations" → Week 3 plan', highlight: true },
        { text: '5 objectives aligned to WAEC standards', highlight: false },
        { text: '✓ Assessment activities auto-generated', highlight: false },
      ],
    },
  },
  {
    icon: FileText,
    title: 'Report Generation',
    description:
      'Automatically generate comprehensive student reports, term summaries, and school performance documents. Customizable templates with one-click export.',
    detail: 'Natural language report narratives with data visualizations and parental recommendations.',
    gradient: 'from-orange-500/60 via-amber-400/40 to-yellow-500/60',
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    glowColor: 'hover:shadow-orange-500/15',
    progress: 87,
    progressLabel: 'Automation rate',
    keyTerms: ['report generation', 'one-click export'],
    preview: {
      lines: [
        { text: 'Term report for 120 students → Generating...', highlight: true },
        { text: 'Narrative + data visualizations composed', highlight: false },
        { text: '✓ PDF export ready for parent distribution', highlight: false },
      ],
    },
  },
  {
    icon: Search,
    title: 'Smart Search',
    description:
      'Intelligent search across all your school data. Find students, exams, questions, and resources using natural language queries.',
    detail: 'Semantic search that understands context, synonyms, and intent for precise results.',
    gradient: 'from-indigo-500/60 via-blue-400/40 to-violet-500/60',
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    glowColor: 'hover:shadow-indigo-500/15',
    progress: 97,
    progressLabel: 'Relevance score',
    keyTerms: ['smart search', 'semantic'],
    preview: {
      lines: [
        { text: '"Find all SS2 physics questions on waves"', highlight: true },
        { text: '47 results found — sorted by relevance', highlight: false },
        { text: '✓ Contextual filters auto-applied', highlight: false },
      ],
    },
  },
]

// ---------- Progress Bar ----------

function AnimatedProgressBar({
  value,
  label,
  delay,
  isInView,
  gradientClass,
}: {
  value: number
  label: string
  delay: number
  isInView: boolean
  gradientClass: string
}) {
  return (
    <div className="mt-4" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${value}%`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${value}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
        />
      </div>
    </div>
  )
}

// ---------- Feature Card (non-featured) ----------

function FeatureCard({
  feature,
  index,
  isInView,
}: {
  feature: typeof aiFeatures[number]
  index: number
  isInView: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.5 + index * 0.07, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${feature.title} AI feature card`}
    >
      {/* Animated gradient border */}
      <div
        className={`absolute -inset-[1px] rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[0.5px]`}
        aria-hidden="true"
      />

      {/* Glow effect */}
      <div
        className={`absolute -inset-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${feature.glowColor} group-hover:shadow-xl`}
        aria-hidden="true"
      />

      {/* Main card */}
      <div
        className={`relative rounded-xl border border-white/[0.04] forge-glass-surface p-5 h-full forge-card-shadow
          group-hover:-translate-y-0.5 group-hover:border-white/[0.08] group-hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]
          transition-all duration-300
          focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-background`}
      >
        {/* Icon with pulse glow */}
        <div className="relative mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04]
            group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ease-out`}>
            <Icon className="h-5 w-5" />
          </div>
          {/* Pulse ring */}
          <motion.div
            className={`absolute inset-0 rounded-lg ${feature.iconBg} opacity-0`}
            animate={isHovered ? { scale: 1.4, opacity: 0 } : { scale: 1, opacity: 0 }}
            transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0, repeatDelay: 0.3 }}
            aria-hidden="true"
          />
        </div>

        {/* Title with gradient text on hover for key terms */}
        <h3 className="text-sm font-semibold mb-1.5 group-hover:text-foreground transition-colors duration-300">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-1">
          {feature.description.split(' ').map((word, wi) => {
            const isKeyTerm = feature.keyTerms.some(kt =>
              word.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kt.replace(/\s/g, '').toLowerCase())
            )
            if (isKeyTerm) {
              return (
                <span key={wi} className="font-semibold text-foreground/90">
                  {word}{' '}
                </span>
              )
            }
            return <span key={wi}>{word} </span>
          })}
        </p>

        {/* Progress bar */}
        <AnimatedProgressBar
          value={feature.progress}
          label={feature.progressLabel}
          delay={0.6 + index * 0.07}
          isInView={isInView}
          gradientClass={feature.gradient}
        />

        {/* Interactive preview on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
              className="overflow-hidden"
              aria-hidden="true"
            >
              <div className="rounded-lg border border-white/[0.04] forge-glass-surface p-3 space-y-2">
                {feature.preview.lines.map((line, li) => (
                  <motion.div
                    key={li}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: li * 0.1 }}
                    className={`text-xs ${line.highlight ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                  >
                    {line.text}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ---------- Main Section ----------

export function AIFeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const featured = aiFeatures[0]
  const rest = aiFeatures.slice(1)
  const FeaturedIcon = featured.icon

  return (
    <SectionWrapper id="ai-features">
      <div ref={ref}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            AI Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Powered by{' '}
            <GradientText preset="neural">Artificial Intelligence</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Every feature in ExamForge AI is enhanced by AI. From generating questions to
            predicting outcomes, our intelligent engine works alongside educators to deliver
            better results with less effort.
          </motion.p>
        </div>

        {/* ===== Featured AI Feature — Hero Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
          className="mb-12 relative"
          role="article"
          aria-label="Featured AI feature: AI Question Generation"
        >
          {/* Animated gradient border for hero card */}
          <div
            className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-br from-cyan-500/60 via-indigo-400/40 to-teal-500/60 opacity-60 blur-[0.5px]"
            aria-hidden="true"
          />

          {/* Ambient glow */}
          <div
            className="absolute -inset-6 rounded-3xl bg-violet-500/5 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative rounded-2xl border border-white/[0.04] forge-glass-surface bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 backdrop-blur-xl p-8 sm:p-10 lg:p-12 forge-card-shadow">
            {/* Badge */}
            <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
              <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1">
                <Zap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Flagship Feature</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                {/* Animated icon with pulse */}
                <div className="relative mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] text-violet-600 dark:text-violet-400">
                    <FeaturedIcon className="h-7 w-7" />
                  </div>
                  {/* Pulse ring animation */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-violet-500/10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  <GradientText preset="neural" as="span">{featured.title}</GradientText>
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">{featured.description}</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6">{featured.detail}</p>

                {/* Progress indicator for featured */}
                <AnimatedProgressBar
                  value={featured.progress}
                  label={featured.progressLabel}
                  delay={0.6}
                  isInView={isInView}
                  gradientClass={featured.gradient}
                />

                {/* CTA */}
                <div className="mt-6">
                  <a
                    href="#cbt"
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white
                      hover:bg-violet-700 transition-colors duration-300
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label="Try AI Question Generation"
                  >
                    Try it now
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Real AI Generator Product Screen */}
              <div className="relative">
                <div className="rounded-xl overflow-hidden border border-white/[0.04] forge-card-shadow">
                  <AIQuestionGeneratorScreen />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== Other AI Features Grid ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rest.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={i}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
