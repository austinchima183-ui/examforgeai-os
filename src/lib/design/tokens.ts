// ============================================================================
// ExamForge AI — Design Tokens
// ============================================================================
// Single source of truth for all design values: colors, spacing, typography,
// shadows, motion, breakpoints, and z-index layers. Every visual decision
// flows from these tokens to ensure consistency across the entire UI.
// ============================================================================

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  accent: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
} as const

// Semantic aliases
export const semanticColors = {
  primary: colors.primary[600],   // indigo-600
  accent: colors.accent[500],     // violet-500
  success: colors.success[500],   // emerald-500
  warning: colors.warning[500],   // amber-500
  error: colors.error[500],       // rose-500
  info: colors.info[500],         // blue-500
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,    // 1 unit (4px base)
  sm: 8,    // 2 units
  md: 16,   // 4 units
  lg: 24,   // 6 units
  xl: 32,   // 8 units
  '2xl': 48, // 12 units
} as const

/** Convert spacing token to px string */
export function sp(token: keyof typeof spacing): string {
  return `${spacing[token]}px`
}

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: 'Inter, "Noto Sans SC", ui-sans-serif, system-ui, sans-serif',
    display: 'Inter, "Noto Sans SC", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
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
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// ─── Border Radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const

/** Convert radius token to px string */
export function radius(token: keyof typeof borderRadius): string {
  return `${borderRadius[token]}px`
}

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  glow: '0 0 20px 0 rgb(79 70 229 / 0.25), 0 0 40px 0 rgb(79 70 229 / 0.1)',  // indigo glow
  card: '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 4px 12px -4px rgb(0 0 0 / 0.04)',
} as const

// ─── Motion ──────────────────────────────────────────────────────────────────

export const motion = {
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
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
} as const

/** Convert duration token to ms string for CSS */
export function duration(token: keyof typeof motion.duration): string {
  return `${motion.duration[token]}ms`
}

// ─── Breakpoints ─────────────────────────────────────────────────────────────

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

/** Convert breakpoint token to px string for CSS media queries */
export function breakpoint(token: keyof typeof breakpoints): string {
  return `${breakpoints[token]}px`
}

// ─── Z-Index Layers ──────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  notification: 1600,
} as const
