import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — Gradient Text Component (Signature)
// ============================================================================
// Renders text with the ExamForge signature gradient fill.
// Premium gradients: blue→cyan for primary/neural, blue→amber→cyan for forge.
// Every gradient tells a story — "forge" is the brand, "neural" is AI,
// "ember" is knowledge, "cool" is analytical, "rainbow" is celebration.
// ============================================================================

type GradientPreset = 'forge' | 'neural' | 'ember' | 'cool' | 'rainbow'

// Legacy aliases for backward compatibility
type LegacyPreset = 'primary' | 'warm'
type ResolvedPreset = GradientPreset | LegacyPreset

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  preset?: ResolvedPreset
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
}

// Map legacy presets to new signature presets
// primary → forge (blue→amber→cyan, the full brand spectrum)
// warm → ember (warm knowledge gradient)
const legacyMap: Record<LegacyPreset, GradientPreset> = {
  primary: 'forge',
  warm: 'ember',
}

const gradientStyles: Record<GradientPreset, string> = {
  /** The Forge — full brand gradient: blue → amber → cyan */
  forge: 'bg-gradient-to-r from-blue-500 via-amber-400 to-cyan-400 dark:from-blue-400 dark:via-amber-300 dark:to-cyan-300',
  /** Neural Stream — AI/tech: blue → cyan */
  neural: 'bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300',
  /** Ember Glow — warm knowledge: amber → orange → red */
  ember: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 dark:from-amber-300 dark:via-orange-400 dark:to-rose-400',
  /** Cool — calm analytical: cyan → blue → indigo */
  cool: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-500',
  /** Rainbow — vibrant celebration */
  rainbow: 'bg-gradient-to-r from-rose-400 via-violet-500 to-cyan-400 dark:from-rose-300 dark:via-violet-400 dark:to-cyan-300',
}

export function GradientText({
  children,
  className,
  preset = 'forge',
  as: Component = 'span',
}: GradientTextProps) {
  // Resolve legacy presets
  const resolvedPreset: GradientPreset = preset in legacyMap
    ? legacyMap[preset as LegacyPreset]
    : (preset as GradientPreset)

  return (
    <Component
      className={cn(
        'inline-block bg-clip-text text-transparent',
        gradientStyles[resolvedPreset],
        className
      )}
    >
      {children}
    </Component>
  )
}
