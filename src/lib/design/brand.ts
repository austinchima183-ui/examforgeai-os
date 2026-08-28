// ============================================================================
// ExamForge AI — Brand Identity
// ============================================================================
// Complete brand system including name, tagline, mission, colors with multiple
// formats, gradients, voice & tone guidelines, logo guidelines, and spacing
// rhythm. Exports CSS variables for Tailwind integration.
// ============================================================================

import { colors as tokenColors } from './tokens'

// ─── Brand Core ──────────────────────────────────────────────────────────────

export const brand = {
  name: 'ExamForge AI',
  tagline: 'The Intelligence Behind Every Exam',
  mission: 'Making world-class education accessible to every student',
  domain: 'examforge.ai',
  url: 'https://examforge.ai',
} as const

// ─── Brand Colors (with HEX, RGB, HSL) ───────────────────────────────────────

interface BrandColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function makeBrandColor(hex: string): BrandColor {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return { hex, rgb, hsl }
}

export const brandColors = {
  /** Primary brand color — indigo-600 */
  primary: makeBrandColor(tokenColors.primary[600]),
  /** Accent brand color — violet-500 */
  accent: makeBrandColor(tokenColors.accent[500]),
  /** Success — emerald-500 */
  success: makeBrandColor(tokenColors.success[500]),
  /** Warning — amber-500 */
  warning: makeBrandColor(tokenColors.warning[500]),
  /** Error — rose-500 */
  error: makeBrandColor(tokenColors.error[500]),
  /** Info — blue-500 */
  info: makeBrandColor(tokenColors.info[500]),
  /** Neutral dark — indigo-950 */
  dark: makeBrandColor(tokenColors.primary[950]),
  /** Neutral light — indigo-50 */
  light: makeBrandColor(tokenColors.primary[50]),
} as const

// ─── Brand Gradients ─────────────────────────────────────────────────────────

export const brandGradients = {
  /** Primary gradient — indigo-600 → violet-500 */
  primary: `linear-gradient(135deg, ${tokenColors.primary[600]}, ${tokenColors.accent[500]})`,
  /** Accent gradient — violet-500 → fuchsia-500 */
  accent: `linear-gradient(135deg, ${tokenColors.accent[500]}, #d946ef)`,
  /** Hero gradient — indigo-700 → violet-600 → purple-500 */
  hero: `linear-gradient(135deg, ${tokenColors.primary[700]}, ${tokenColors.accent[600]}, #a855f7)`,
  /** Card gradient — subtle indigo-50 → violet-50 */
  card: `linear-gradient(135deg, ${tokenColors.primary[50]}, ${tokenColors.accent[50]})`,
  /** Glow gradient — for shimmer/highlight effects */
  glow: `linear-gradient(90deg, transparent, ${tokenColors.primary[400]}33, transparent)`,
} as const

// Tailwind class equivalents for gradients
export const brandGradientClasses = {
  primary: 'bg-gradient-to-br from-indigo-600 to-violet-500',
  accent: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
  hero: 'bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-500',
  card: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50',
} as const

// ─── Brand Voice & Tone ──────────────────────────────────────────────────────

export const brandVoice = {
  voice: {
    primary: 'Confident yet approachable',
    secondary: 'Technical yet human',
    description: 'We speak with the authority of AI-powered precision, but always remember we serve educators and students. Our tone is warm, clear, and never condescending.',
  },
  tone: {
    default: 'Professional, clear, encouraging',
    error: 'Calm, helpful, solution-oriented',
    success: 'Celebratory, motivating, forward-looking',
    marketing: 'Aspirational, credible, concise',
  },
  principles: [
    'Lead with clarity — educators are busy; every word must earn its place',
    'Be precise — we\'re an AI platform; vagueness undermines trust',
    'Stay human — technology serves people, not the other way around',
    'Empower, don\'t overwhelm — guide users to success, one step at a time',
  ] as const,
} as const

// ─── Logo Guidelines ─────────────────────────────────────────────────────────

export const logoGuidelines = {
  /** Minimum clear space around logo (in px) */
  clearSpace: 16,
  /** Minimum logo size for readability */
  minWidth: 120,
  /** Recommended aspect ratio */
  aspectRatio: 3.5, // width / height
  variants: {
    full: 'ExamForge AI with mark',      // Logo mark + wordmark
    wordmark: 'ExamForge AI text only',   // Wordmark only
    mark: 'Forge icon only',              // Icon mark only
    inverse: 'White version for dark bg', // All-white for dark backgrounds
  },
  /** Don'ts */
  restrictions: [
    'Never stretch or distort the logo',
    'Never rearrange logo elements',
    'Never apply effects (shadows, glows) to the logo',
    'Never use the logo below the minimum width',
    'Never change the logo colors outside brand palette',
  ] as const,
} as const

// ─── Spacing Rhythm ──────────────────────────────────────────────────────────

export const spacingRhythm = {
  /** Base unit in pixels */
  base: 4,
  /** Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 */
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,
  /** Named steps for common use */
  steps: {
    micro: 4,     // 1×base — inline gaps
    tiny: 8,      // 2×base — compact padding
    small: 12,    // 3×base — button padding, form gaps
    medium: 16,   // 4×base — card padding, section gaps
    large: 24,    // 6×base — section padding
    xlarge: 32,   // 8×base — page margins
    huge: 48,     // 12×base — hero spacing
    massive: 64,  // 16×base — major sections
  },
} as const

// ─── CSS Variables for Tailwind ──────────────────────────────────────────────

export const cssVariables = {
  '--brand-primary': brandColors.primary.hex,
  '--brand-accent': brandColors.accent.hex,
  '--brand-success': brandColors.success.hex,
  '--brand-warning': brandColors.warning.hex,
  '--brand-error': brandColors.error.hex,
  '--brand-info': brandColors.info.hex,
  '--brand-primary-h': String(brandColors.primary.hsl.h),
  '--brand-primary-s': String(brandColors.primary.hsl.s) + '%',
  '--brand-primary-l': String(brandColors.primary.hsl.l) + '%',
  '--brand-accent-h': String(brandColors.accent.hsl.h),
  '--brand-accent-s': String(brandColors.accent.hsl.s) + '%',
  '--brand-accent-l': String(brandColors.accent.hsl.l) + '%',
  '--radius-sm': '6px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--radius-xl': '16px',
} as const

// ─── Re-exports ──────────────────────────────────────────────────────────────

export { colors, spacing, typography, borderRadius, shadows, motion, breakpoints, zIndex } from './tokens'
