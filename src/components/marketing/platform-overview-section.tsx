'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Layers, Cpu, Shield, Zap, Globe, Database, ArrowDown } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { PlatformArchitectureIllustration } from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — Platform Overview Section (Premium)
// ============================================================================
// Introduces the platform's purpose, architecture, and key differentiators.
// Features an animated architecture diagram with flowing connection lines,
// glassmorphism cards with gradient borders, staggered entrance animations,
// and interactive hover effects on each capability card.
// ============================================================================

const capabilities = [
  {
    icon: Cpu,
    title: 'AI-First Architecture',
    description:
      'Every workflow is enhanced by AI — from question generation to performance analytics. Our models are trained on educational data and continuously improve.',
    gradient: 'from-indigo-500 to-amber-500',
  },
  {
    icon: Layers,
    title: 'Unified Platform',
    description:
      'One system replaces dozens of tools. Student management, CBT exams, analytics, billing, and communication all live in a single, connected workspace.',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Built on Supabase with row-level security, RBAC, audit logging, and end-to-end encryption. Your data is protected at every layer.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Zap,
    title: 'Real-Time Everything',
    description:
      'Live exam monitoring, instant results, real-time collaboration, and push notifications. No more waiting for data to sync.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Globe,
    title: 'Multi-School Ready',
    description:
      'Multi-tenant architecture from day one. Manage one school or a thousand — each with its own branding, data, and admin controls.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Database,
    title: 'Scalable Infrastructure',
    description:
      'Built on serverless infrastructure that scales automatically. From 10 students to 100,000, performance stays consistent.',
    gradient: 'from-cyan-500 to-indigo-600',
  },
]

const architectureLayers = [
  {
    name: 'Users Layer',
    color: 'from-primary/20 to-primary/5',
    borderColor: 'border-primary/20',
    items: ['Super Admin', 'School Admin', 'Teacher', 'Student', 'Parent'],
    textColor: 'text-primary',
  },
  {
    name: 'AI Engine',
    color: 'from-indigo-500/20 to-indigo-500/5',
    borderColor: 'border-violet-500/20',
    items: ['Question Gen', 'Auto Marking', 'Analytics', 'Study Assistant'],
    textColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    name: 'CBT Platform',
    color: 'from-cyan-500/20 to-cyan-500/5',
    borderColor: 'border-cyan-500/20',
    items: ['Exam Creation', 'Live Monitoring', 'Timing', 'Certificates'],
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    name: 'School ERP',
    color: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    items: ['Student Info', 'Billing', 'Marketplace', 'Messaging'],
    textColor: 'text-green-600 dark:text-green-400',
  },
]

function GlassmorphismCard({
  children,
  className = '',
  gradientBorder = false,
  gradientFrom = 'from-primary',
  gradientTo = 'to-primary',
}: {
  children: React.ReactNode
  className?: string
  gradientBorder?: boolean
  gradientFrom?: string
  gradientTo?: string
}) {
  return (
    <div className={`relative group ${className}`}>
      {gradientBorder && (
        <div
          className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]`}
          aria-hidden="true"
        />
      )}
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:bg-white/10 transition-all duration-500">
        {children}
      </div>
    </div>
  )
}

export function PlatformOverviewSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="platform">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Platform Overview
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            One platform.{' '}
            <GradientText preset="cool">Infinite possibilities.</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            ExamForge AI was built because schools deserve better than fragmented tools,
            manual processes, and outdated software. We combined everything a modern school
            needs into one intelligent, AI-powered platform that grows with you.
          </motion.p>
        </div>

        {/* Platform Architecture Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex justify-center mb-10"
        >
          <PlatformArchitectureIllustration className="h-40 w-auto sm:h-52" />
        </motion.div>

        {/* Animated Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative mb-16"
        >
          <div className="rounded-2xl border border-white/[0.04] forge-glass-surface p-6 sm:p-8 lg:p-10 overflow-hidden forge-card-shadow">
            {/* Decorative grid background */}
            <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative space-y-3">
              {/* Users Layer */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-white/[0.04] p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-primary">Users Layer</p>
                  <span className="text-[10px] text-primary/60 font-medium">5 ROLES</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {['Super Admin', 'School Admin', 'Teacher', 'Student', 'Parent'].map((role, i) => (
                    <motion.span
                      key={role}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
                      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-default"
                    >
                      {role}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Flowing connector */}
              <div className="flex justify-center" aria-hidden="true">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={isInView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-px h-4 bg-gradient-to-b from-primary/30 to-transparent" />
                  <ArrowDown className="h-3 w-3 text-primary/30" />
                </motion.div>
              </div>

              {/* Core Services */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {architectureLayers.slice(1).map((layer, i) => (
                  <motion.div
                    key={layer.name}
                    initial={{ opacity: 0, y: 15 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                    className={`group/card rounded-xl bg-gradient-to-br ${layer.color} border border-white/[0.04] p-4 sm:p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-default`}
                  >
                    <p className={`text-sm font-semibold ${layer.textColor} mb-2`}>{layer.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.items.map((item) => (
                        <span
                          key={item}
                          className="text-[11px] text-muted-foreground bg-background/50 rounded-md px-2 py-0.5"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Flowing connector */}
              <div className="flex justify-center" aria-hidden="true">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={isInView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.4, delay: 1.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-px h-4 bg-gradient-to-b from-transparent to-muted-foreground/30" />
                  <ArrowDown className="h-3 w-3 text-muted-foreground/30" />
                </motion.div>
              </div>

              {/* Infrastructure Layer */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="rounded-xl bg-gradient-to-r from-muted/60 to-muted/30 border border-white/[0.04] p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Infrastructure</p>
                  <span className="text-[10px] text-foreground/40 font-medium">ENTERPRISE GRADE</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Supabase', 'Next.js', 'Edge Functions', 'Realtime', 'CDN', 'Encryption'].map((tech) => (
                    <span
                      key={tech}
                      className="text-[11px] text-muted-foreground bg-background/40 rounded-md px-2.5 py-0.5 border border-border/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Animated data flow lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <defs>
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Capability Cards with Glassmorphism + Gradient Borders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="group relative"
              >
                {/* Gradient border on hover */}
                <div
                  className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]`}
                  aria-hidden="true"
                />
                <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface p-6 forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-300">
                  {/* Icon with animated gradient background */}
                  <div className="relative mb-4">
                    <div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`}
                      aria-hidden="true"
                    />
                    <div className={`relative flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
