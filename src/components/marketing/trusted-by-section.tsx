'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Award, ShieldCheck, Lock, TrendingUp } from 'lucide-react'
import { METRICS } from '@/lib/brand-constants'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { InstitutionLogoPill, institutionLogos, ProfessionalAvatar } from '@/components/marketing/illustrations'
import { CardTilt, SpotlightHover, StaggerContainer, StaggerItem, springs, durations, easings } from '@/components/marketing/motion'
import { forgePatternColors, ForgeStatCard, ForgeStarRating, ForgeGradientBorder } from '@/components/marketing/design-system'

// ============================================================================
// ExamForge AI — Trusted By Section (World-Class Premium)
// ============================================================================
// Premium social proof with infinite scrolling logo marquee, enhanced metric
// cards with animated gradient backgrounds, a glassmorphism testimonial with
// gradient border and glow, and an awards/certifications row.
// ============================================================================

const institutions = institutionLogos

const trustedStats = [
  { value: METRICS.schools, suffix: '+', label: 'Schools & Universities' },
  { value: METRICS.students / 1000, suffix: 'K+', label: 'Active Students' },
  { value: METRICS.examsDelivered / 1000000, suffix: 'M+', label: 'Exams Delivered' },
  { value: METRICS.uptimeSla, suffix: '%', label: 'Uptime SLA' },
]

const awards = [
  { icon: Award, label: 'Best EdTech Platform 2025', color: 'text-yellow-600 dark:text-yellow-400' },
  { icon: ShieldCheck, label: 'SOC 2 Certified', color: 'text-green-600 dark:text-green-400' },
  { icon: Lock, label: 'GDPR Compliant', color: 'text-primary' },
  { icon: TrendingUp, label: 'Top 50 African Startups', color: 'text-rose-500' },
]

/* -------------------------------------------------------------------------- */
/*  Logo Pill — uses branded InstitutionLogoPill with shield crest            */
/* -------------------------------------------------------------------------- */
function LogoPill({ inst }: { inst: (typeof institutions)[number] }) {
  return (
    <InstitutionLogoPill name={inst.name} abbr={inst.abbr} color={inst.color} />
  )
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export function TrustedBySection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="trusted-by">
      <div ref={ref}>
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-sm font-medium text-foreground/35 uppercase tracking-wider mb-12"
        >
          Trusted by leading educational institutions across Africa
        </motion.p>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Animated Logo Marquee                                            */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div
          className="relative mb-16"
          role="marquee"
          aria-label="Trusted institutions scrolling list"
        >
          {/* Fade edges */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#090909] to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#090909] to-transparent"
            aria-hidden="true"
          />

          {/* Scrolling track */}
          <div className="overflow-hidden group/marquee">
            <div
              className="flex gap-4 animate-marquee group-hover/marquee:[animation-play-state:paused]"
              aria-hidden="true"
            >
              {/* First copy */}
              {institutions.map((inst) => (
                <LogoPill key={`a-${inst.abbr}`} inst={inst} />
              ))}
              {/* Duplicate for seamless loop */}
              {institutions.map((inst) => (
                <LogoPill key={`b-${inst.abbr}`} inst={inst} />
              ))}
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Enhanced Stats with Animated Gradient Backgrounds                */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16">
          {trustedStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <SpotlightHover className="rounded-xl">
                <div className="group relative overflow-hidden rounded-xl border border-white/[0.04] forge-glass-surface p-6 text-center forge-card-shadow transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]">
                  {/* Animated gradient background */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    aria-hidden="true"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cyan-400/5 to-transparent" />
                  </div>

                  <div className="relative">
                    <div className="text-3xl sm:text-4xl font-bold tracking-tight forge-gradient-text">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                </div>
              </SpotlightHover>
            </motion.div>
          ))}
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Premium Testimonial — Glassmorphism + Gradient Border + Glow     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          {/* Gradient border wrapper */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-cyan-400/40 to-amber-400/40">
            {/* Glow effect */}
            <div
              className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-400/10 to-cyan-400/10 blur-xl opacity-60"
              aria-hidden="true"
            />

            {/* Glassmorphism card */}
            <div className="relative rounded-2xl forge-glass-surface border border-white/[0.04] p-6 sm:p-8 forge-card-shadow">
              {/* Quote icon */}
              <div className="absolute top-4 right-6 text-primary/10" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-4" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="h-4 w-4 text-amber-400 fill-amber-400 animate-pulse-glow"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-lg sm:text-xl leading-relaxed text-foreground/90 relative z-10">
                &ldquo;ExamForge AI transformed how we conduct examinations. Our CBT process went from
                weeks of preparation to hours, and the AI auto-marking saved us 85% of grading time.
                The platform is now indispensable to our operations.&rdquo;
              </blockquote>

              {/* Attribution */}
              <div className="mt-6 flex items-center gap-3">
                <ProfessionalAvatar
                  name="Dr. Oluwaseun Adeyemi"
                  role="Dean of Examinations"
                  organization="Lagos State University"
                  size="md"
                  gradient="from-primary to-cyan-500"
                />
                <div>
                  <p className="text-sm font-semibold">Dr. Oluwaseun Adeyemi</p>
                  <p className="text-xs text-muted-foreground">Dean of Examinations, Lagos State University</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Awards & Certifications Row                                      */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          {awards.map((award) => (
            <div
              key={award.label}
              className="group flex items-center gap-2 rounded-full border border-white/[0.04] forge-glass-surface px-4 py-2 hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-300"
            >
              <award.icon className={`h-4 w-4 ${award.color}`} aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {award.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
