// ============================================================================
// ExamForge AI OS — Canonical Design System
// ============================================================================
// Single source of truth for the application design language.
// PRESERVES the existing visual identity: #090909 void, layered
// glassmorphism (#111111 / #171717 / #1D1D1D / #242424), electric blue
// #3B82F6, neural cyan #22D3EE, ember #F59E0B, forge gold #FBBF24, Inter.
//
// This module is NOT a redesign. It is the formal specification of what
// already exists in globals.css, distilled into typed tokens that composite
// dashboard components import. Visual output is identical to the existing
// UI — this just removes duplication and gives us one place to maintain.
//
// Comparable to: Linear's brand tokens, Vercel Dashboard's design system,
// Supabase's UI tokens. The goal is the same: a single typed source of
// truth that lets us compose dashboards without copy-pasting glass card
// patterns into every page.
// ============================================================================

// ─── Brand Colors ──────────────────────────────────────────────────────────
// These map 1:1 to the CSS custom properties defined in globals.css.
// Do not change these without also updating globals.css.

export const appColors = {
  /** Ambient void — the application background */
  void: '#090909',
  /** Surface layers — layered glassmorphism */
  surface: {
    0: '#090909', // ambient
    1: '#111111', // raised card
    2: '#171717', // default card
    3: '#1D1D1D', // hover
    4: '#242424', // active / pressed
  },
  /** Foreground text */
  foreground: '#EDEDED',
  /** Foreground muted (inactive sidebar items, secondary copy) */
  foregroundMuted: '#A3A3A3',
  /** Border — ultra-subtle */
  border: '#222222',
  /** Border subtle — barely visible separators */
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  /** Border hover — interactive borders on hover */
  borderHover: 'rgba(255, 255, 255, 0.08)',

  // ── Brand accents ──
  /** Electric blue — primary action color */
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  /** Neural cyan — AI / computation accent */
  neural: '#22D3EE',
  neuralForeground: '#090909',
  /** Ember amber — warm knowledge accent */
  ember: '#F59E0B',
  emberForeground: '#090909',
  /** Forge gold — achievement / rating */
  forgeGold: '#FBBF24',

  // ── Semantic ──
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',

  // ── Chart palette (matches globals.css --chart-1..5) ──
  chart: {
    1: '#3B82F6', // primary blue
    2: '#10B981', // success green
    3: '#F59E0B', // ember amber
    4: '#EF4444', // alert red
    5: '#8B5CF6', // violet accent
  },

  // ── Sidebar ──
  sidebar: {
    bg: '#090909',
    foreground: '#A3A3A3',
    primary: '#3B82F6',
    primaryForeground: '#FFFFFF',
    accent: '#1D1D1D',
    accentForeground: '#EDEDED',
    border: 'rgba(255, 255, 255, 0.05)',
    ring: '#3B82F6',
  },
} as const

// ─── Glass Tiers ────────────────────────────────────────────────────────────
// Matches the existing `forge-glass-surface` / `forge-glass-elevated` /
// `forge-glass-floating` utility classes defined in globals.css.

export type GlassTier = 'surface' | 'elevated' | 'floating' | 'void'

export const glassTiers: Record<
  GlassTier,
  {
    /** Tailwind background utility — matches forge-glass-* classes */
    bg: string
    /** Tailwind border utility */
    border: string
    /** Tailwind shadow utility */
    shadow: string
    /** Inline style equivalent (for non-Tailwind contexts) */
    style: {
      background: string
      backdropFilter: string
      border: string
      boxShadow: string
    }
  }
> = {
  surface: {
    bg: 'forge-glass-surface',
    border: 'border border-white/[0.04]',
    shadow: 'forge-card-shadow',
    style: {
      background: 'rgba(23, 23, 23, 0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      boxShadow: '0 2px 8px -2px rgba(0,0,0,0.06), 0 4px 12px -4px rgba(0,0,0,0.04)',
    },
  },
  elevated: {
    bg: 'forge-glass-elevated',
    border: 'border border-white/[0.06]',
    shadow: 'forge-glass-elevated-shadow',
    style: {
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      boxShadow: '0 8px 40px -8px rgba(59, 130, 246, 0.12)',
    },
  },
  floating: {
    bg: 'forge-glass-floating',
    border: 'border border-white/[0.08]',
    shadow: 'forge-glass-floating-shadow',
    style: {
      background: 'rgba(23, 23, 23, 0.8)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 16px 64px -12px rgba(59, 130, 246, 0.16)',
    },
  },
  void: {
    bg: 'bg-foreground/5 backdrop-blur-3xl',
    border: 'border border-white/[0.03]',
    shadow: 'shadow-[0_32px_80px_-16px_rgba(0,0,0,0.25)]',
    style: {
      background: 'rgba(237, 237, 237, 0.05)',
      backdropFilter: 'blur(32px)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
      boxShadow: '0 32px 80px -16px rgba(0,0,0,0.25)',
    },
  },
} as const

// ─── Spacing ────────────────────────────────────────────────────────────────
// 4px base unit, matches Tailwind defaults so utility classes compose cleanly.

export const space = {
  px: '1px',
  0: '0px',
  0.5: '2px', // 0.5×4
  1: '4px', // 1×4 — micro
  1.5: '6px',
  2: '8px', // 2×4 — tiny
  2.5: '10px',
  3: '12px', // 3×4 — small
  3.5: '14px',
  4: '16px', // 4×4 — base
  5: '20px',
  6: '24px', // 6×4 — large
  7: '28px',
  8: '32px', // 8×4 — xlarge
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px', // 12×4 — huge
  14: '56px',
  16: '64px', // 16×4 — massive
  20: '80px',
  24: '96px',
} as const

// ─── Typography ─────────────────────────────────────────────────────────────
// Inter is loaded via next/font in /src/app/layout.tsx (var(--font-inter)).
// Geist Mono for monospace (var(--font-geist-mono)).

export const typography = {
  fontFamily: {
    sans: 'var(--font-inter), Inter, "Noto Sans SC", ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-geist-mono), "JetBrains Mono", ui-monospace, monospace',
  },
  // Tailwind text-size equivalents
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
    // Section label — uppercase tiny caps style
    sectionLabel: '0.14em',
  },
  // Pre-composed text style presets — use via cn() helper or inline className
  presets: {
    // Page title (h1)
    pageTitle: 'text-3xl font-bold tracking-tight text-foreground',
    // Section heading (h2)
    sectionHeading: 'text-xl font-semibold tracking-tight text-foreground',
    // Card title
    cardTitle: 'text-sm font-medium text-muted-foreground',
    // Body
    body: 'text-sm text-muted-foreground',
    // Caption / metadata
    caption: 'text-xs text-muted-foreground',
    // Section label (uppercase tiny caps above headings)
    sectionLabel:
      'text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/35',
    // Stat number
    statNumber: 'text-3xl font-bold tracking-tight text-foreground',
    // Brand gradient text — "AI" suffix
    brandGradient: 'forge-gradient-text',
  },
} as const

// ─── Border Radius ──────────────────────────────────────────────────────────

export const radii = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const

// ─── Motion ─────────────────────────────────────────────────────────────────
// Matches globals.css transitions + framer-motion presets already in use.

export const motionPresets = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    entrance: 400,
    exit: 200,
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  // Common animation variants for framer-motion
  variants: {
    fadeInUp: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
    },
    fadeInScale: {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.96 },
    },
    staggerContainer: {
      initial: 'hidden',
      animate: 'visible',
      variants: {
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      },
    },
    staggerItem: {
      variants: {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      },
    },
  },
  // Tailwind class shortcuts
  transitions: {
    default: 'transition-all duration-200 ease-out',
    fast: 'transition-all duration-150 ease-out',
    slow: 'transition-all duration-300 ease-out',
  },
} as const

// ─── Z-Index Layers ─────────────────────────────────────────────────────────

export const layers = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
  commandPalette: 80,
} as const

// ─── Breakpoints ────────────────────────────────────────────────────────────

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

// ─── Dashboard Layout Grid ──────────────────────────────────────────────────
// Standard grid for dashboard page content.

export const dashboardGrid = {
  /** Standard KPI grid — 4 cols on lg, 2 on sm, 1 on mobile */
  kpi: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
  /** Compact KPI grid — 3 cols */
  kpiCompact: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  /** Two-column content grid */
  twoCol: 'grid gap-4 lg:grid-cols-2',
  /** Three-column content grid */
  threeCol: 'grid gap-4 lg:grid-cols-3',
  /** Main + sidebar grid (2/3 + 1/3) */
  mainWithSidebar: 'grid gap-4 lg:grid-cols-3',
  /** Page padding */
  pagePadding: 'p-6 sm:p-8',
  /** Stack spacing between sections */
  sectionStack: 'space-y-8',
  /** Stack spacing between cards in a section */
  cardStack: 'space-y-4',
} as const

// ─── Trend Direction (KPI deltas) ──────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'neutral'

export const trendConfig: Record<
  TrendDirection,
  {
    /** Foreground text color */
    color: string
    /** Background tint */
    bgColor: string
    /** Lucide icon name */
    icon: 'TrendingUp' | 'TrendingDown' | 'Minus'
    /** Accessible label */
    label: string
  }
> = {
  up: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    icon: 'TrendingUp',
    label: 'increasing',
  },
  down: {
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 dark:bg-destructive/15',
    icon: 'TrendingDown',
    label: 'decreasing',
  },
  neutral: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: 'Minus',
    label: 'stable',
  },
} as const

// ─── Status Tones ───────────────────────────────────────────────────────────
// For badges, pills, alert banners — consistent semantic colors.

export type StatusTone =
  | 'default'
  | 'primary'
  | 'neural'
  | 'ember'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'

export const statusToneConfig: Record<
  StatusTone,
  {
    /** Foreground text */
    color: string
    /** Background tint (low opacity) */
    bgColor: string
    /** Border */
    borderColor: string
    /** Dot color (for live indicators) */
    dotColor: string
  }
> = {
  default: {
    color: 'text-foreground/80',
    bgColor: 'bg-white/[0.04]',
    borderColor: 'border-white/[0.06]',
    dotColor: 'bg-foreground/40',
  },
  primary: {
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    dotColor: 'bg-primary',
  },
  neural: {
    color: 'text-neural',
    bgColor: 'bg-neural/10',
    borderColor: 'border-neural/20',
    dotColor: 'bg-neural',
  },
  ember: {
    color: 'text-ember',
    bgColor: 'bg-ember/10',
    borderColor: 'border-ember/20',
    dotColor: 'bg-ember',
  },
  success: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
  },
  warning: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  destructive: {
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    dotColor: 'bg-destructive',
  },
  info: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    borderColor: 'border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
} as const

// ─── Activity Type Colors ──────────────────────────────────────────────────
// Currently duplicated across student + teacher dashboards — this is the
// canonical source.

export type ActivityType =
  | 'exam'
  | 'practice'
  | 'result'
  | 'achievement'
  | 'question'
  | 'class'
  | 'grading'
  | 'payment'
  | 'system'
  | 'default'

export const activityTypeConfig: Record<
  ActivityType,
  { bg: string; icon: string; label: string }
> = {
  exam: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
    label: 'Exam',
  },
  practice: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    icon: 'text-violet-600 dark:text-violet-400',
    label: 'Practice',
  },
  result: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    label: 'Result',
  },
  achievement: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: 'text-amber-600 dark:text-amber-400',
    label: 'Achievement',
  },
  question: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    icon: 'text-violet-600 dark:text-violet-400',
    label: 'Question',
  },
  class: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: 'text-amber-600 dark:text-amber-400',
    label: 'Class',
  },
  grading: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    icon: 'text-cyan-600 dark:text-cyan-400',
    label: 'Grading',
  },
  payment: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    label: 'Payment',
  },
  system: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    icon: 'text-slate-600 dark:text-slate-400',
    label: 'System',
  },
  default: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    icon: 'text-slate-600 dark:text-slate-400',
    label: 'Activity',
  },
} as const

// ─── Helper: get greeting based on time of day ──────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Helper: relative time formatter ────────────────────────────────────────

export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { appColors as colors }
