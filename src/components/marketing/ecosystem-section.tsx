'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { BookOpen, MonitorPlay, Bot, BarChart3, Users, Store, Sparkles, ArrowRight, Info } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'

// ============================================================================
// ExamForge AI — Product Ecosystem Section (Premium)
// ============================================================================
// Shows how all 10 modules connect and work together as a unified
// platform. Features an animated SVG diagram with pulsing connection
// lines, hover effects that highlight related modules, and a legend.
// ============================================================================

const ecosystemModules = [
  { id: 'cbt', icon: MonitorPlay, title: 'AI CBT', desc: 'Exam delivery', color: 'from-indigo-500 to-cyan-500', textColor: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10', connections: ['ai-engine', 'analytics', 'sis'] },
  { id: 'ai-engine', icon: Bot, title: 'AI Engine', desc: 'Question gen & marking', color: 'from-purple-500 to-fuchsia-600', textColor: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-500/10', connections: ['cbt', 'analytics', 'ai-assistant', 'marketplace'] },
  { id: 'sis', icon: Users, title: 'SIS', desc: 'Student management', color: 'from-cyan-500 to-blue-600', textColor: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-500/10', connections: ['cbt', 'analytics', 'erp', 'billing'] },
  { id: 'analytics', icon: BarChart3, title: 'Analytics', desc: 'Insights & reports', color: 'from-amber-500 to-orange-600', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-9500/10', connections: ['cbt', 'ai-engine', 'sis', 'erp'] },
  { id: 'ai-assistant', icon: Sparkles, title: 'AI Assistant', desc: 'Natural language', color: 'from-amber-500 to-orange-600', textColor: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-500/10', connections: ['ai-engine', 'cbt', 'marketplace'] },
  { id: 'marketplace', icon: Store, title: 'Marketplace', desc: 'Resources & templates', color: 'from-amber-500 to-orange-600', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-9500/10', connections: ['ai-engine', 'ai-assistant', 'erp'] },
  { id: 'erp', icon: BookOpen, title: 'School ERP', desc: 'Full administration', color: 'from-emerald-500 to-teal-600', textColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-9500/10', connections: ['sis', 'analytics', 'billing', 'marketplace'] },
  { id: 'messaging', icon: Users, title: 'Messaging', desc: 'Communication', color: 'from-teal-500 to-cyan-600', textColor: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-500/10', connections: ['sis', 'erp', 'ai-assistant'] },
  { id: 'billing', icon: BarChart3, title: 'Billing', desc: 'Payments & invoicing', color: 'from-cyan-500 to-indigo-600', textColor: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-500/10', connections: ['sis', 'erp', 'marketplace'] },
]

// Grid positions for the modules (3x3 grid)
const gridPositions = [
  { row: 0, col: 0 }, // CBT
  { row: 0, col: 1 }, // AI Engine
  { row: 0, col: 2 }, // SIS
  { row: 1, col: 0 }, // Analytics
  { row: 1, col: 1 }, // AI Assistant
  { row: 1, col: 2 }, // Marketplace
  { row: 2, col: 0 }, // ERP
  { row: 2, col: 1 }, // Messaging
  { row: 2, col: 2 }, // Billing
]

// SVG connection paths between modules
const connectionPaths = [
  { from: 0, to: 1 }, // CBT -> AI Engine
  { from: 1, to: 2 }, // AI Engine -> SIS
  { from: 0, to: 3 }, // CBT -> Analytics
  { from: 1, to: 4 }, // AI Engine -> AI Assistant
  { from: 2, to: 5 }, // SIS -> Marketplace
  { from: 3, to: 4 }, // Analytics -> AI Assistant
  { from: 4, to: 5 }, // AI Assistant -> Marketplace
  { from: 3, to: 6 }, // Analytics -> ERP
  { from: 4, to: 7 }, // AI Assistant -> Messaging
  { from: 5, to: 8 }, // Marketplace -> Billing
  { from: 6, to: 7 }, // ERP -> Messaging
  { from: 7, to: 8 }, // Messaging -> Billing
  { from: 6, to: 8 }, // ERP -> Billing
  { from: 1, to: 3 }, // AI Engine -> Analytics
]

export function EcosystemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [hoveredModule, setHoveredModule] = useState<string | null>(null)

  const getConnectedModules = useCallback((moduleId: string) => {
    const mod = ecosystemModules.find((m) => m.id === moduleId)
    return mod ? mod.connections : []
  }, [])

  const isHighlighted = useCallback(
    (moduleId: string) => {
      if (!hoveredModule) return false
      if (moduleId === hoveredModule) return true
      const connected = getConnectedModules(hoveredModule)
      return connected.includes(moduleId)
    },
    [hoveredModule, getConnectedModules]
  )

  const isConnectionHighlighted = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!hoveredModule) return false
      const fromId = ecosystemModules[fromIdx].id
      const toId = ecosystemModules[toIdx].id
      if (fromId === hoveredModule || toId === hoveredModule) return true
      return false
    },
    [hoveredModule]
  )

  return (
    <SectionWrapper id="ecosystem">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Product Ecosystem
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Ten modules.{' '}
            <GradientText preset="cool">One platform.</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Every module shares data, syncs in real-time, and works together seamlessly.
            Hover over any module to see its connections.
          </motion.p>
        </div>

        {/* Ecosystem Diagram */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative rounded-2xl border border-white/[0.04] forge-glass-surface p-6 sm:p-8 lg:p-10 forge-card-shadow"
          >
            {/* Subtle grid background */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-[0.02]" aria-hidden="true">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="eco-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="15" cy="15" r="1" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#eco-grid)" />
              </svg>
            </div>

            {/* SVG Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
              <defs>
                <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {connectionPaths.map((path, i) => {
                const from = gridPositions[path.from]
                const to = gridPositions[path.to]
                const x1 = `${(from.col * 33.33) + 16.66}%`
                const y1 = `${(from.row * 33.33) + 16.66}%`
                const x2 = `${(to.col * 33.33) + 16.66}%`
                const y2 = `${(to.row * 33.33) + 16.66}%`
                const highlighted = isConnectionHighlighted(path.from, path.to)
                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="hsl(var(--primary))"
                      strokeWidth={highlighted ? 2 : 1}
                      strokeOpacity={highlighted ? 0.4 : 0.08}
                      className="transition-all duration-300"
                    />
                    {highlighted && (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeOpacity={0.6}
                        strokeDasharray="4 6"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite" />
                      </line>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Module Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
              {ecosystemModules.map((module, i) => {
                const Icon = module.icon
                const isCenter = i === 4
                const highlighted = isHighlighted(module.id)
                const isHovered = hoveredModule === module.id
                const isDimmed = hoveredModule && !highlighted

                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                    className={`group relative rounded-xl border border-white/[0.04] forge-glass-surface p-4 sm:p-5 cursor-default transition-all duration-300 ${
                      isCenter
                        ? 'border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                        : ''
                    } ${isHovered ? 'border-primary/50 shadow-xl shadow-primary/10 -translate-y-0.5 scale-[1.03]' : ''} ${
                      isDimmed ? 'opacity-40 scale-[0.97]' : ''
                    } ${highlighted && !isHovered ? 'border-primary/30 shadow-md shadow-primary/5' : ''}`}
                  >
                    {isCenter && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-md">
                          AI Core
                        </span>
                      </div>
                    )}
                    {/* Gradient border glow on hover */}
                    <div
                      className={`absolute -inset-px rounded-xl bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm`}
                      aria-hidden="true"
                    />
                    <div className="relative">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-5 w-5 ${module.textColor}`} />
                      </div>
                      <h3 className="text-sm font-semibold">{module.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{module.desc}</p>
                    </div>

                    {/* Connection count badge */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                        >
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                            {module.connections.length} connections
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-primary/30" />
              <span className="text-xs text-muted-foreground">Data connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-primary/60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 10px)' }} />
              <span className="text-xs text-muted-foreground">Active link (hover)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-primary/40 bg-primary/10" />
              <span className="text-xs text-muted-foreground">AI Core module</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-foreground/60" />
              <span className="text-xs text-muted-foreground">Hover any module to explore</span>
            </div>
          </motion.div>

          {/* Connection info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              All modules share a unified data layer, real-time sync, and AI-powered workflows.
            </p>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}
