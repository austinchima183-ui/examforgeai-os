'use client'

import { motion } from 'framer-motion'

// ============================================================================
// ExamForge AI — Feature Illustrations
// ============================================================================
// Custom SVG illustrations for each major feature/section. These replace
// generic Lucide icons with meaningful, branded visuals that communicate
// the feature's value at a glance.
// ============================================================================

// ─── AI Question Generation Illustration ───
export function AIQuestionIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} fill="none" aria-hidden="true">
      {/* Brain/AI cloud */}
      <ellipse cx="100" cy="45" rx="50" ry="30" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5"/>
      {/* Neural connections */}
      <circle cx="80" cy="40" r="4" className="fill-primary/40"/>
      <circle cx="100" cy="35" r="5" className="fill-primary/50"/>
      <circle cx="120" cy="42" r="4" className="fill-primary/40"/>
      <circle cx="90" cy="50" r="3" className="fill-primary/30"/>
      <circle cx="110" cy="48" r="3.5" className="fill-primary/30"/>
      <line x1="80" y1="40" x2="100" y2="35" className="stroke-primary/25" strokeWidth="1"/>
      <line x1="100" y1="35" x2="120" y2="42" className="stroke-primary/25" strokeWidth="1"/>
      <line x1="80" y1="40" x2="90" y2="50" className="stroke-primary/20" strokeWidth="1"/>
      <line x1="120" y1="42" x2="110" y2="48" className="stroke-primary/20" strokeWidth="1"/>
      <line x1="100" y1="35" x2="90" y2="50" className="stroke-primary/15" strokeWidth="1"/>
      {/* Sparkle icon */}
      <path d="M100 20L102 28L110 30L102 32L100 40L98 32L90 30L98 28Z" className="fill-primary/50"/>
      {/* Arrow down to questions */}
      <path d="M100 75V90" className="stroke-primary/40" strokeWidth="1.5" strokeDasharray="3 2"/>
      <path d="M96 88L100 93L104 88" className="stroke-primary/40" strokeWidth="1.5"/>
      {/* Generated questions */}
      <rect x="55" y="98" width="90" height="12" rx="3" className="fill-primary/8 stroke-primary/20" strokeWidth="0.5"/>
      <text x="65" y="107" fontSize="6" className="fill-primary/60" fontFamily="system-ui">Q1: Which organelle...</text>
      <rect x="55" y="114" width="90" height="12" rx="3" className="fill-primary/5 stroke-primary/15" strokeWidth="0.5"/>
      <text x="65" y="123" fontSize="6" className="fill-primary/50" fontFamily="system-ui">Q2: The process of...</text>
      <rect x="55" y="130" width="70" height="8" rx="2" className="fill-primary/3 stroke-primary/10" strokeWidth="0.5"/>
      <text x="60" y="136" fontSize="5" className="fill-primary/40" fontFamily="system-ui">+38 more questions</text>
    </svg>
  )
}

// ─── Auto Marking Illustration ───
export function AutoMarkingIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} fill="none" aria-hidden="true">
      {/* Stack of papers */}
      <rect x="60" y="20" width="80" height="55" rx="4" className="fill-green-600/8 stroke-emerald-500/20" strokeWidth="0.5" transform="rotate(2 100 47)"/>
      <rect x="58" y="18" width="80" height="55" rx="4" className="fill-green-600/12 stroke-emerald-500/25" strokeWidth="0.5" transform="rotate(-1 98 45)"/>
      <rect x="56" y="16" width="80" height="55" rx="4" className="fill-green-600/15 stroke-emerald-500/30" strokeWidth="1"/>
      {/* Check marks on papers */}
      <path d="M68 30L74 36L86 24" className="stroke-emerald-500/60" strokeWidth="2" strokeLinecap="round"/>
      <path d="M68 42L74 48L86 36" className="stroke-emerald-500/40" strokeWidth="2" strokeLinecap="round"/>
      <path d="M68 54L74 60L86 48" className="stroke-emerald-500/25" strokeWidth="2" strokeLinecap="round"/>
      {/* Arrow to results */}
      <path d="M100 75V90" className="stroke-emerald-500/40" strokeWidth="1.5" strokeDasharray="3 2"/>
      <path d="M96 88L100 93L104 88" className="stroke-emerald-500/40" strokeWidth="1.5"/>
      {/* Results summary */}
      <rect x="50" y="96" width="100" height="38" rx="6" className="fill-green-600/5 stroke-emerald-500/20" strokeWidth="1"/>
      <text x="75" y="110" fontSize="7" fontWeight="600" className="fill-green-600/70" fontFamily="system-ui">85% Saved</text>
      <text x="68" y="122" fontSize="5" className="fill-green-600/50" fontFamily="system-ui">2,000 hrs/semester</text>
      <text x="72" y="130" fontSize="5" className="fill-green-600/40" fontFamily="system-ui">Instant feedback</text>
    </svg>
  )
}

// ─── Security Shield Illustration ───
export function SecurityIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" aria-hidden="true">
      {/* Outer shield */}
      <path d="M100 15L160 40V80C160 115 135 140 100 155C65 140 40 115 40 80V40L100 15Z" className="fill-primary/5 stroke-primary/25" strokeWidth="1.5"/>
      {/* Inner shield highlight */}
      <path d="M100 30L145 48V78C145 105 125 125 100 138C75 125 55 105 55 78V48L100 30Z" className="fill-primary/3 stroke-primary/15" strokeWidth="0.5"/>
      {/* Lock icon */}
      <rect x="88" y="75" width="24" height="18" rx="3" className="fill-primary/20 stroke-primary/40" strokeWidth="1"/>
      <path d="M94 75V68C94 62 98 58 100 58C102 58 106 62 106 68V75" className="stroke-primary/50" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="100" cy="84" r="2.5" className="fill-primary/50"/>
      {/* Encryption lines */}
      <text x="72" y="105" fontSize="5" className="fill-primary/30" fontFamily="monospace">AES-256</text>
      <text x="72" y="113" fontSize="5" className="fill-primary/25" fontFamily="monospace">TLS 1.3</text>
      <text x="72" y="121" fontSize="5" className="fill-primary/20" fontFamily="monospace">RBAC ✓</text>
      {/* Certification badges */}
      <circle cx="70" cy="135" r="8" className="fill-green-600/10 stroke-emerald-500/30" strokeWidth="0.5"/>
      <text x="67" y="137" fontSize="5" className="fill-green-600/60" fontFamily="system-ui">S2</text>
      <circle cx="100" cy="135" r="8" className="fill-primary/10 stroke-primary/30" strokeWidth="0.5"/>
      <text x="97" y="137" fontSize="5" className="fill-primary/60" fontFamily="system-ui">GD</text>
      <circle cx="130" cy="135" r="8" className="fill-yellow-600/10 stroke-amber-500/30" strokeWidth="0.5"/>
      <text x="127" y="137" fontSize="5" className="fill-yellow-600/60" fontFamily="system-ui">IS</text>
    </svg>
  )
}

// ─── Platform Architecture Illustration ───
export function PlatformArchitectureIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={className} fill="none" aria-hidden="true">
      {/* Central hub */}
      <circle cx="120" cy="80" r="25" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5"/>
      <text x="108" y="78" fontSize="7" fontWeight="600" className="fill-primary/60" fontFamily="system-ui">Exam</text>
      <text x="107" y="88" fontSize="7" fontWeight="600" className="fill-primary/60" fontFamily="system-ui">Forge</text>
      {/* Module nodes */}
      {[
        { x: 50, y: 40, label: 'SIS', color: 'blue' },
        { x: 190, y: 40, label: 'CBT', color: 'violet' },
        { x: 50, y: 120, label: 'ERP', color: 'emerald' },
        { x: 190, y: 120, label: 'AI', color: 'purple' },
        { x: 120, y: 20, label: 'Analytics', color: 'amber' },
        { x: 120, y: 145, label: 'Billing', color: 'cyan' },
      ].map(node => (
        <g key={node.label}>
          {/* Connection line */}
          <line x1={node.x} y1={node.y} x2="120" y2="80" className="stroke-primary/15" strokeWidth="0.8" strokeDasharray="3 2"/>
          {/* Node circle */}
          <circle cx={node.x} cy={node.y} r="16" className={`fill-${node.color}-500/10 stroke-${node.color}-500/25`} strokeWidth="1"/>
          <text x={node.x} y={node.y + 3} textAnchor="middle" fontSize="6" fontWeight="600" className={`fill-${node.color}-500/60`} fontFamily="system-ui">{node.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── CBT Workflow Illustration ───
export function CBTWorkflowIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 80" className={className} fill="none" aria-hidden="true">
      {/* Step 1: Create */}
      <rect x="5" y="15" width="50" height="50" rx="8" className="fill-violet-500/10 stroke-violet-500/25" strokeWidth="1"/>
      <path d="M25 30V50M18 37H32" className="stroke-violet-500/50" strokeWidth="2" strokeLinecap="round"/>
      <text x="30" y="72" textAnchor="middle" fontSize="6" className="fill-violet-500/60" fontFamily="system-ui">Create</text>
      {/* Arrow */}
      <path d="M60 40H75" className="stroke-primary/30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>
      {/* Step 2: Publish */}
      <rect x="80" y="15" width="50" height="50" rx="8" className="fill-cyan-500/10 stroke-cyan-500/25" strokeWidth="1"/>
      <path d="M105 30L105 50L115 42" className="stroke-cyan-500/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="105" y="72" textAnchor="middle" fontSize="6" className="fill-cyan-500/60" fontFamily="system-ui">Publish</text>
      {/* Arrow */}
      <path d="M135 40H150" className="stroke-primary/30" strokeWidth="1.5"/>
      {/* Step 3: Take */}
      <rect x="155" y="15" width="50" height="50" rx="8" className="fill-green-600/10 stroke-emerald-500/25" strokeWidth="1"/>
      <rect x="167" y="28" width="26" height="18" rx="2" className="stroke-emerald-500/40" strokeWidth="1.5"/>
      <circle cx="180" cy="37" r="3" className="fill-green-600/30"/>
      <text x="180" y="72" textAnchor="middle" fontSize="6" className="fill-green-600/60" fontFamily="system-ui">Take Exam</text>
      {/* Arrow */}
      <path d="M210 40H225" className="stroke-primary/30" strokeWidth="1.5"/>
      {/* Step 4: Results */}
      <rect x="230" y="15" width="25" height="50" rx="8" className="fill-yellow-600/10 stroke-amber-500/25" strokeWidth="1"/>
      <path d="M238 40L242 50L250 30" className="stroke-amber-500/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="242" y="72" textAnchor="middle" fontSize="6" className="fill-yellow-600/60" fontFamily="system-ui">Results</text>
      {/* Arrow marker definition */}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" className="fill-primary/30"/>
        </marker>
      </defs>
    </svg>
  )
}

// ─── Analytics Chart Illustration ───
export function AnalyticsChartIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill="none" aria-hidden="true">
      {/* Chart background */}
      <rect x="10" y="10" width="180" height="90" rx="8" className="fill-yellow-600/3 stroke-amber-500/10" strokeWidth="0.5"/>
      {/* Grid lines */}
      {[30, 50, 70, 90].map(y => (
        <line key={y} x1="25" y1={y} x2="180" y2={y} className="stroke-amber-500/8" strokeWidth="0.5"/>
      ))}
      {/* Area chart path */}
      <path d="M25 85L45 70L65 75L85 55L105 60L125 40L145 35L165 25L180 20V85Z" className="fill-yellow-600/10"/>
      <path d="M25 85L45 70L65 75L85 55L105 60L125 40L145 35L165 25L180 20" className="stroke-amber-500/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Data points */}
      {[{x:45,y:70},{x:85,y:55},{x:125,y:40},{x:165,y:25}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" className="fill-yellow-600/60 stroke-white/50" strokeWidth="1"/>
      ))}
      {/* Trend arrow */}
      <path d="M150 15L180 15L180 45" className="stroke-emerald-500/40" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M175 40L180 45L185 40" className="stroke-emerald-500/40" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Label */}
      <text x="100" y="108" textAnchor="middle" fontSize="6" className="fill-yellow-600/40" fontFamily="system-ui">Performance Trend →</text>
    </svg>
  )
}

// ─── Empty State Illustration ───
export function EmptyStateIllustration({ 
  type = 'default',
  className = '' 
}: { 
  type?: 'default' | 'no-data' | 'no-results' | 'setup'
  className?: string 
}) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" aria-hidden="true">
      {/* Document/clipboard shape */}
      <rect x="55" y="25" width="90" height="110" rx="8" className="fill-muted/30 stroke-border/40" strokeWidth="1"/>
      {/* Content lines */}
      <rect x="70" y="45" width="60" height="4" rx="2" className="fill-muted/40"/>
      <rect x="70" y="55" width="45" height="4" rx="2" className="fill-muted/30"/>
      <rect x="70" y="65" width="55" height="4" rx="2" className="fill-muted/25"/>
      <rect x="70" y="75" width="40" height="4" rx="2" className="fill-muted/20"/>
      {/* Sparkle/accent */}
      <circle cx="140" cy="40" r="12" className="fill-primary/10"/>
      <path d="M140 32L142 38L148 40L142 42L140 48L138 42L132 40L138 38Z" className="fill-primary/40"/>
      {/* Bottom CTA hint */}
      <rect x="75" y="100" width="50" height="14" rx="7" className="fill-primary/10 stroke-primary/20" strokeWidth="0.5"/>
      <text x="100" y="109" textAnchor="middle" fontSize="6" className="fill-primary/50" fontFamily="system-ui">Get Started</text>
    </svg>
  )
}
