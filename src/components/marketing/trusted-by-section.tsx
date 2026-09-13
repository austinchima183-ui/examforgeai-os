'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ShieldCheck, Lock, Database, FlaskConical, Users, Layout, Server } from 'lucide-react'
import { METRICS } from '@/lib/brand-constants'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { SpotlightHover } from '@/components/marketing/motion'

// ============================================================================
// ExamForge AI — Platform Proof Section (Honest / RC1 de-fabricated)
// ============================================================================
// RC1 reality audit removed fabricated social proof (fictional institutions,
// testimonials, awards, certifications). This section now presents
// VERIFIABLE engineering facts about the shipped product — every number
// below is measured from the codebase and can be reproduced by any auditor.
// ============================================================================

// Facts measured from the repository (re-verify: find src/app -name page.tsx | wc -l)
const platformStats = [
  { value: 127, suffix: '', label: 'Application Pages' },
  { value: 150, suffix: '', label: 'API Endpoints' },
  { value: 1028, suffix: '', label: 'Automated Tests' },
  { value: 270, suffix: '', label: 'Database Tables' },
]

// Real security properties of the shipped product (verifiable in code)
const securityProperties = [
  { icon: Database, label: 'Row-Level Security on every table' },
  { icon: Lock, label: 'Encryption in transit (TLS 1.3)' },
  { icon: Users, label: '5-role access control (RBAC)' },
  { icon: FlaskConical, label: 'Security-tested API surface' },
]

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
          className="text-center text-sm font-medium text-foreground/60 uppercase tracking-wider mb-12"
        >
          Engineered for exam-driven schools — {METRICS.rolesLabel} role portals, {METRICS.modulesLabel} core modules
        </motion.p>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Verifiable Platform Stats (measured from the repository)        */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16">
          {platformStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <SpotlightHover className="rounded-xl">
                <div className="group relative overflow-hidden rounded-xl border border-white/[0.04] forge-glass-surface p-6 text-center forge-card-shadow transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]">
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
        {/*  Early-Stage Honesty Card                                          */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-cyan-400/40 to-amber-400/40">
            <div
              className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-400/10 to-cyan-400/10 blur-xl opacity-60"
              aria-hidden="true"
            />

            <div className="relative rounded-2xl forge-glass-surface border border-white/[0.04] p-6 sm:p-8 forge-card-shadow">
              <div className="absolute top-4 right-6 text-primary/10" aria-hidden="true">
                <Server className="h-12 w-12" />
              </div>

              <blockquote className="text-lg sm:text-xl leading-relaxed text-foreground/90 relative z-10">
                &ldquo;We are an early-stage platform in active pilots with schools. Instead of
                inherited trust, we earn it with engineering: every claim on this site maps to
                code, tests, and a live health endpoint you can check yourself.&rdquo;
              </blockquote>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-sm font-semibold text-white">
                  EF
                </div>
                <div>
                  <p className="text-sm font-semibold">The ExamForge Engineering Team</p>
                  <p className="text-xs text-muted-foreground">Lagos, Nigeria</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/*  Real Security Properties (verifiable in code)                     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          {securityProperties.map((prop) => (
            <div
              key={prop.label}
              className="group flex items-center gap-2 rounded-full border border-white/[0.04] forge-glass-surface px-4 py-2 hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-300"
            >
              <prop.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {prop.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
