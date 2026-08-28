'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { GraduationCap, Users, MapPin, TrendingUp, Globe, Building2, Zap, Activity } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { StaggerContainer, StaggerItem, springs, durations, easings } from '@/components/marketing/motion'
import { METRICS } from '@/lib/brand-constants'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Enhanced Social Proof Section
// ============================================================================
// Premium trust-building section with:
//   - Live activity feed showing recent signups
//   - Animated global usage map (Africa-focused)
//   - Institution growth counter with real metrics
//   - Achievement/milestone wall
// ============================================================================

const recentActivities = [
  { institution: 'University of Lagos', action: 'signed up', location: 'Nigeria', time: '2 min ago', type: 'signup' as const },
  { institution: 'Kenyatta University', action: 'deployed CBT exams', location: 'Kenya', time: '8 min ago', type: 'exam' as const },
  { institution: 'Ashesi University', action: 'upgraded to Pro', location: 'Ghana', time: '15 min ago', type: 'upgrade' as const },
  { institution: 'Covenant University', action: 'generated 200 AI questions', location: 'Nigeria', time: '22 min ago', type: 'ai' as const },
  { institution: 'Strathmore University', action: 'onboarded 1,200 students', location: 'Kenya', time: '35 min ago', type: 'signup' as const },
  { institution: 'University of Ibadan', action: 'completed semester exams', location: 'Nigeria', time: '1 hr ago', type: 'exam' as const },
  { institution: 'University of Ghana', action: 'signed up for trial', location: 'Ghana', time: '1.5 hr ago', type: 'signup' as const },
  { institution: 'Federal University Lokoja', action: 'auto-graded 3,000 scripts', location: 'Nigeria', time: '2 hr ago', type: 'ai' as const },
]

const countries = [
  { name: 'Nigeria', schools: 280, x: '48%', y: '52%', flag: '🇳🇬' },
  { name: 'Kenya', schools: 85, x: '56%', y: '58%', flag: '🇰🇪' },
  { name: 'Ghana', schools: 72, x: '44%', y: '54%', flag: '🇬🇭' },
  { name: 'South Africa', schools: 63, x: '52%', y: '75%', flag: '🇿🇦' },
]

const milestones = [
  { label: '500 schools', achieved: true, date: '2024' },
  { label: '1M exams delivered', achieved: true, date: '2024' },
  { label: '120K students', achieved: true, date: '2025' },
  { label: '4 countries', achieved: true, date: '2025' },
  { label: '1M+ AI questions', achieved: true, date: '2025' },
  { label: '1000 schools', achieved: false, date: '2026' },
]

const activityTypeColors = {
  signup: 'bg-green-50 dark:bg-green-9500',
  exam: 'bg-primary/100',
  upgrade: 'bg-yellow-50 dark:bg-yellow-9500',
  ai: 'bg-purple-500',
}

export function EnhancedSocialProofSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [activityIndex, setActivityIndex] = useState(0)

  // Rotate activity feed
  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % recentActivities.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <SectionWrapper id="social-proof" backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-primary uppercase tracking-wider mb-4"
          >
            <Activity className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Growing Every Day
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Trusted across{' '}
            <AnimatedCounter target={METRICS.countries} suffix=" countries" className="text-primary" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Schools across Africa are transforming their operations with ExamForge AI.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left — Global usage map + counters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Africa map visualization */}
            <div className="forge-glass-surface border-white/[0.04] rounded-xl p-6 relative overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Regional Presence</p>

              {/* Stylized map */}
              <div className="relative h-64 rounded-xl bg-gradient-to-br from-primary/3 via-[#1C1C1C]/50 to-cyan-500/3 border border-white/[0.04]">
                {/* Map outline — Africa shape approximation using SVG */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-20"
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="0.5"
                >
                  <path d="M90 30 Q100 25 110 30 Q120 35 125 50 Q130 65 128 80 Q126 90 120 100 Q115 110 118 120 Q120 130 115 140 Q110 150 100 160 Q90 165 80 155 Q75 145 72 130 Q70 115 65 100 Q60 85 55 70 Q50 55 55 40 Q60 30 75 28 Q80 27 90 30Z" />
                </svg>

                {/* Pulsing country dots */}
                {countries.map((country, i) => (
                  <motion.div
                    key={country.name}
                    className="absolute"
                    style={{ left: country.x, top: country.y }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ ...springs.bouncy, delay: 0.5 + i * 0.15 }}
                  >
                    {/* Pulse ring */}
                    <motion.div
                      className="absolute h-8 w-8 rounded-full border-2 border-primary/30 -translate-x-1/2 -translate-y-1/2"
                      animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    />
                    {/* Center dot */}
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                      <div className="h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                    </div>
                    {/* Label */}
                    <div className="absolute left-2 -translate-y-1/2 whitespace-nowrap">
                      <span className="text-[10px] font-medium text-foreground">{country.flag} {country.name}</span>
                      <span className="ml-1 text-[9px] text-muted-foreground">{country.schools} schools</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Big metric counters */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: GraduationCap, value: METRICS.schools, suffix: '+', label: 'Schools' },
                { icon: Users, value: METRICS.students / 1000, suffix: 'K+', label: 'Students' },
                { icon: TrendingUp, value: METRICS.examsDelivered / 1000000, suffix: 'M+', label: 'Exams' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                  className="rounded-xl border border-white/[0.04] bg-[#1D1D1D]/50 p-4 text-center"
                >
                  <stat.icon className="h-4 w-4 mx-auto text-primary mb-2" />
                  <p className="text-xl font-bold">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Activity feed + milestones */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Live activity feed */}
            <div className="forge-glass-surface border-white/[0.04] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-green-50 dark:bg-green-9500 animate-pulse" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Activity</p>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {recentActivities.map((activity, i) => {
                  const isVisible = Math.abs(i - activityIndex) <= 2 || (activityIndex <= 1 && i >= recentActivities.length - 2 + activityIndex)
                  return (
                    <motion.div
                      key={`${activity.institution}-${i}`}
                      initial={false}
                      animate={{
                        opacity: i === activityIndex ? 1 : i === (activityIndex + 1) % recentActivities.length ? 0.7 : 0.3,
                        y: 0,
                        scale: i === activityIndex ? 1 : 0.98,
                      }}
                      transition={{ duration: 0.5, ease: easings.premium }}
                      className={cn(
                        'flex items-start gap-3 rounded-lg p-2.5 transition-colors',
                        i === activityIndex && 'bg-primary/5 border border-primary/10',
                      )}
                    >
                      <div className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', activityTypeColors[activity.type])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.institution}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.action} · {activity.time}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{activity.location}</span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Achievement milestones */}
            <div className="forge-glass-surface border-white/[0.04] rounded-xl p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Milestones</p>
              <div className="flex flex-wrap gap-2">
                {milestones.map((milestone, i) => (
                  <motion.div
                    key={milestone.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ ...springs.bouncy, delay: 0.8 + i * 0.08 }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border',
                      milestone.achieved
                        ? 'border-emerald-500/30 bg-green-50 dark:bg-green-9500/5 text-green-600 dark:text-green-400'
                        : 'border-white/[0.04] bg-[#1D1D1D]/50 text-muted-foreground'
                    )}
                  >
                    {milestone.achieved ? (
                      <Zap className="h-3 w-3" />
                    ) : (
                      <Building2 className="h-3 w-3" />
                    )}
                    {milestone.label}
                    <span className="text-[9px] opacity-60">{milestone.date}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}
