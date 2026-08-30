'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { Sparkles, Users, Globe, Bot, Award, Rocket } from 'lucide-react'

// ============================================================================
// ExamForge AI — Timeline Section (Premium AI OS)
// ============================================================================
// Clean vertical timeline with dots, subtle lines, scroll-triggered
// animations for each milestone, forge-glass-surface cards with
// icon containers, and milestone icons with gradient backgrounds.
// ============================================================================

const milestones = [
  {
    year: '2023',
    title: 'The Spark',
    description: 'Founded after witnessing a teacher spend 3 weeks creating exam questions by hand. The mission was clear: build AI-powered tools that make school administration effortless.',
    icon: Sparkles,
    gradient: 'from-indigo-500 to-indigo-600',
    textColor: 'text-violet-600 dark:text-violet-400',
    stat: { value: '1', label: 'Mission' },
  },
  {
    year: '2023',
    title: 'First 10 Schools',
    description: 'Launched the CBT platform with 10 pilot schools in Lagos. Within 3 months, teachers reported saving an average of 15 hours per week on exam preparation and grading.',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-green-600 dark:text-green-400',
    stat: { value: '10', label: 'Schools' },
  },
  {
    year: '2024',
    title: 'AI Question Generation',
    description: 'Released AI-powered question generation aligned with WAEC, NECO, and JAMB standards. Teachers could now generate a complete exam in under 5 minutes instead of weeks.',
    icon: Bot,
    gradient: 'from-cyan-500 to-blue-600',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    stat: { value: '5min', label: 'Exam Creation' },
  },
  {
    year: '2024',
    title: 'Expanding Across Africa',
    description: 'Expanded to Ghana, Kenya, and South Africa. Surpassed 200 schools and 50,000 students. Launched the School ERP module for complete school administration.',
    icon: Globe,
    gradient: 'from-amber-500 to-orange-600',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    stat: { value: '200+', label: 'Schools' },
  },
  {
    year: '2025',
    title: 'Marketplace & Analytics',
    description: 'Launched the ExamForge AI Marketplace for sharing educational resources. Introduced predictive analytics that identifies at-risk students before they fall behind.',
    icon: Award,
    gradient: 'from-amber-500 to-orange-600',
    textColor: 'text-rose-600 dark:text-rose-400',
    stat: { value: '50K+', label: 'Students' },
  },
  {
    year: '2026',
    title: 'The AI Operating System',
    description: 'With 10 integrated modules, 500+ schools, and 120K+ students, ExamForge AI is now the complete AI operating system for modern schools. SOC 2 certified and growing rapidly.',
    icon: Rocket,
    gradient: 'from-cyan-500 to-indigo-600',
    textColor: 'text-sky-600 dark:text-sky-400',
    stat: { value: '500+', label: 'Schools' },
  },
]

function TimelineMilestone({
  milestone,
  index,
  isInView,
}: {
  milestone: typeof milestones[0]
  index: number
  isInView: boolean
}) {
  const Icon = milestone.icon
  const isLeft = index % 2 === 0

  return (
    <div className="relative flex items-start gap-6 md:gap-0">
      {/* Left side content (desktop) */}
      <div className={`hidden md:block md:w-1/2 ${isLeft ? 'pr-12 text-right' : ''}`}>
        {isLeft && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
            className="group relative"
          >
            {/* Gradient border glow on hover */}
            <div
              className={`absolute -inset-px rounded-xl bg-gradient-to-br ${milestone.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-[1px]`}
              aria-hidden="true"
            />
            <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500">
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="text-xs font-medium text-foreground/60">{milestone.year}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {milestone.stat.value}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                {milestone.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
              <p className="text-[10px] text-foreground/60 mt-2">{milestone.stat.label}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Timeline dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 + index * 0.15 }}
        className="relative z-10 flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2"
      >
        <div className="relative">
          {/* Subtle pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
            className={`absolute -inset-2 rounded-full bg-gradient-to-br ${milestone.gradient} opacity-20`}
            aria-hidden="true"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-[#090909] shadow-lg">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${milestone.gradient} shadow-sm`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right side content (desktop) */}
      <div className={`hidden md:block md:w-1/2 ${!isLeft ? 'pl-12' : ''}`}>
        {!isLeft && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
            className="group relative"
          >
            {/* Gradient border glow on hover */}
            <div
              className={`absolute -inset-px rounded-xl bg-gradient-to-br ${milestone.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-[1px]`}
              aria-hidden="true"
            />
            <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-foreground/60">{milestone.year}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {milestone.stat.value}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                {milestone.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
              <p className="text-[10px] text-foreground/60 mt-2">{milestone.stat.label}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile layout */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
        className="md:hidden flex-1 group relative"
      >
        <div
          className={`absolute -inset-px rounded-xl bg-gradient-to-br ${milestone.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-[1px]`}
          aria-hidden="true"
        />
        <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-foreground/60">{milestone.year}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {milestone.stat.value}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1.5">{milestone.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
        </div>
      </motion.div>
    </div>
  )
}

export function TimelineSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="timeline" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Our Journey
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            From a{' '}
            <GradientText preset="forge">simple idea</GradientText>{' '}
            to a platform
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            A timeline of our journey building the future of education technology in Africa.
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Animated timeline line — subtle */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px" aria-hidden="true">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={isInView ? { scaleY: 1 } : {}}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="w-full h-full bg-gradient-to-b from-primary/30 via-white/[0.04] to-transparent origin-top"
              />
            </div>

            <div className="space-y-10 md:space-y-12">
              {milestones.map((milestone, i) => (
                <TimelineMilestone
                  key={milestone.title}
                  milestone={milestone}
                  index={i}
                  isInView={isInView}
                />
              ))}
            </div>

            {/* End dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ type: 'spring', bounce: 0.5, delay: 1.2 }}
              className="absolute left-6 md:left-1/2 -translate-x-1/2 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/30"
              aria-hidden="true"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
            </motion.div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
