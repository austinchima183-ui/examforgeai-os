// ============================================================================
// ExamForge AI — Signature Design Tokens
// ============================================================================
// This is the SOUL of the ExamForge visual identity.
// Every gradient, every color, every pattern that makes a screenshot
// immediately recognizable as "ExamForge AI" lives here.
//
// Design Philosophy:
// - PRIMARY FORGE: Indigo → The core brand, trust, intelligence
// - EMBER ACCENT: Warm amber/orange → Knowledge, education, illumination
// - NEURAL GLOW: Cyan/teal → AI, computation, neural networks
// - DEEP VOID: Rich dark navy → Depth, sophistication, premium feel
//
// Comparable to:
// - Stripe's signature purple gradients
// - Linear's dark aesthetic + purple/blue
// - Apple's Dynamic Island + spatial depth
// - Vercel's monochrome + accent triangle
// ============================================================================

// ─── Signature Color Palette ───
// These are NOT generic Tailwind colors. They are ExamForge-specific
// oklch values chosen for perceptual uniformity and brand distinctiveness.

export const forgeColors = {
  /** Primary brand indigo — trust, intelligence, core identity */
  primary: {
    50:  'oklch(0.970 0.020 275)',
    100: 'oklch(0.930 0.050 275)',
    200: 'oklch(0.860 0.100 275)',
    300: 'oklch(0.750 0.160 275)',
    400: 'oklch(0.627 0.217 275)',
    500: 'oklch(0.488 0.217 275)',
    600: 'oklch(0.420 0.200 275)',
    700: 'oklch(0.350 0.180 275)',
    800: 'oklch(0.280 0.150 275)',
    900: 'oklch(0.210 0.120 275)',
  },

  /** Ember accent — warm amber/orange for knowledge, illumination, CTAs */
  ember: {
    50:  'oklch(0.985 0.020 70)',
    100: 'oklch(0.960 0.050 70)',
    200: 'oklch(0.910 0.100 70)',
    300: 'oklch(0.830 0.150 70)',
    400: 'oklch(0.761 0.163 70)',
    500: 'oklch(0.680 0.170 70)',
    600: 'oklch(0.580 0.160 70)',
    700: 'oklch(0.480 0.140 70)',
    800: 'oklch(0.380 0.110 70)',
    900: 'oklch(0.280 0.080 70)',
  },

  /** Neural glow — cyan/teal for AI, computation, data streams */
  neural: {
    50:  'oklch(0.985 0.020 195)',
    100: 'oklch(0.960 0.050 195)',
    200: 'oklch(0.910 0.100 195)',
    300: 'oklch(0.820 0.140 195)',
    400: 'oklch(0.720 0.160 195)',
    500: 'oklch(0.600 0.170 195)',
    600: 'oklch(0.500 0.160 195)',
    700: 'oklch(0.400 0.130 195)',
    800: 'oklch(0.300 0.100 195)',
    900: 'oklch(0.220 0.070 195)',
  },

  /** Deep void — rich navy for depth, premium backgrounds */
  void: {
    50:  'oklch(0.970 0.015 270)',
    100: 'oklch(0.920 0.025 270)',
    200: 'oklch(0.820 0.035 270)',
    300: 'oklch(0.650 0.050 270)',
    400: 'oklch(0.450 0.070 270)',
    500: 'oklch(0.300 0.060 270)',
    600: 'oklch(0.220 0.040 270)',
    700: 'oklch(0.170 0.030 270)',
    800: 'oklch(0.130 0.020 270)',
    900: 'oklch(0.100 0.015 270)',
  },

  /** Success green — emerald for positive states, live indicators */
  success: {
    400: 'oklch(0.700 0.159 145)',
    500: 'oklch(0.527 0.159 145)',
    600: 'oklch(0.450 0.140 145)',
  },

  /** Star gold — for ratings, achievements (brand-specific) */
  gold: {
    400: 'oklch(0.825 0.155 85)',
    500: 'oklch(0.745 0.165 85)',
  },
} as const

// ─── Signature Gradients ───
// These gradients are EXCLUSIVE to ExamForge. They combine our brand
// colors in ways that create a unique visual fingerprint.

export const forgeGradients = {
  /** The Forge — primary brand gradient (indigo → ember → neural) */
  theForge: 'from-indigo-500 via-amber-400 to-cyan-400',

  /** The Forge (dark mode adjusted — more vivid) */
  theForgeDark: 'dark:from-indigo-400 dark:via-amber-300 dark:to-cyan-300',

  /** Neural Stream — AI/data gradient (indigo → neural cyan) */
  neuralStream: 'from-indigo-500 to-cyan-400',

  /** Ember Glow — warm knowledge gradient (indigo → ember) */
  emberGlow: 'from-indigo-500 to-amber-400',

  /** Deep Current — premium dark gradient (void → primary) */
  deepCurrent: 'from-slate-900 to-indigo-900',

  /** Conic gradient for animated borders — the signature spinning border */
  conicForge: 'conic-gradient(from 0deg, oklch(0.488 0.217 275), oklch(0.680 0.170 70), oklch(0.600 0.170 195), oklch(0.488 0.217 275))',

  /** Radial glow for spotlight effects */
  radialForge: 'radial-gradient(ellipse at center, oklch(0.488 0.217 275 / 0.15), transparent 70%)',

  /** Radial ember — warm spotlight */
  radialEmber: 'radial-gradient(ellipse at center, oklch(0.680 0.170 70 / 0.12), transparent 70%)',

  /** Radial neural — cool AI spotlight */
  radialNeural: 'radial-gradient(ellipse at center, oklch(0.600 0.170 195 / 0.12), transparent 70%)',
} as const

// ─── Signature Glass Presets ───

export const forgeGlass = {
  /** Surface — subtle glass for cards, panels */
  surface: {
    bg: 'bg-card/60 backdrop-blur-md',
    border: 'border-white/8 dark:border-white/5',
    shadow: 'shadow-[0_2px_20px_-4px_rgba(79,70,229,0.08)]',
  },

  /** Elevated — medium glass for floating elements */
  elevated: {
    bg: 'bg-card/70 backdrop-blur-xl',
    border: 'border-white/10 dark:border-white/6',
    shadow: 'shadow-[0_8px_40px_-8px_rgba(79,70,229,0.12)]',
  },

  /** Floating — strong glass for hero/CTA overlays */
  floating: {
    bg: 'bg-card/80 backdrop-blur-2xl',
    border: 'border-white/12 dark:border-white/8',
    shadow: 'shadow-[0_16px_64px_-12px_rgba(79,70,229,0.16)]',
  },

  /** Void — dark glass for dark mode depth layers */
  void: {
    bg: 'bg-foreground/5 backdrop-blur-3xl',
    border: 'border-white/5 dark:border-white/3',
    shadow: 'shadow-[0_32px_80px_-16px_rgba(0,0,0,0.25)]',
  },
} as const

// ─── Signature Depth Shadows ───

export const forgeShadows = {
  /** Card at rest */
  card: 'shadow-[0_1px_3px_rgba(79,70,229,0.04),0_4px_16px_rgba(79,70,229,0.06)]',

  /** Card on hover — depth increases */
  cardHover: 'shadow-[0_2px_8px_rgba(79,70,229,0.08),0_12px_40px_rgba(79,70,229,0.12)]',

  /** Floating element (hero cards, CTAs) */
  floating: 'shadow-[0_8px_32px_rgba(79,70,229,0.15),0_2px_8px_rgba(79,70,229,0.08)]',

  /** Glow — primary color glow for active/highlighted states */
  glow: 'shadow-[0_0_24px_rgba(79,70,229,0.25)]',

  /** Ember glow — warm glow for special highlights */
  emberGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.25)]',

  /** Neural glow — cool glow for AI features */
  neuralGlow: 'shadow-[0_0_24px_rgba(34,211,238,0.25)]',
} as const

// ─── Signature Typography ───

export const forgeTypography = {
  /** Section label — the small uppercase text above section headings */
  sectionLabel: 'text-sm font-semibold uppercase tracking-[0.15em]',

  /** Section heading — the main H2 */
  sectionHeading: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',

  /** Section description — the paragraph below headings */
  sectionDescription: 'text-lg text-muted-foreground leading-relaxed',

  /** Stat number — large counter/number display */
  statNumber: 'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight',

  /** Feature title — card/feature headings */
  featureTitle: 'text-base font-semibold',

  /** Feature description — card body text */
  featureDescription: 'text-sm text-muted-foreground leading-relaxed',
} as const

// ─── Signature Motion Presets ───

export const forgeMotion = {
  /** Forge enter — how elements appear on scroll */
  forgeEnter: {
    initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  /** Forge stagger — children appearing one by one */
  forgeStagger: {
    container: {
      initial: 'hidden',
      animate: 'visible',
      variants: {
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      },
    },
    item: {
      variants: {
        hidden: { opacity: 0, y: 12, filter: 'blur(3px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4 } },
      },
    },
  },

  /** Forge scale — subtle scale on hover (cards, buttons) */
  forgeScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },

  /** Forge glow — pulsing glow on active elements */
  forgeGlow: {
    animate: {
      boxShadow: [
        '0 0 12px rgba(79,70,229,0.15)',
        '0 0 24px rgba(79,70,229,0.25)',
        '0 0 12px rgba(79,70,229,0.15)',
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
} as const

// ─── Signature Pattern Colors (for backgrounds/mesh) ───

export const forgePatternColors = {
  /** Primary indigo in RGB for CSS patterns */
  primaryRgb: '79, 70, 229',
  /** Ember/amber in RGB */
  emberRgb: '245, 158, 11',
  /** Neural/cyan in RGB */
  neuralRgb: '34, 211, 238',
  /** Void navy in RGB */
  voidRgb: '15, 23, 42',
} as const

// ─── Feature Card Gradient Presets ───
// Each feature domain gets a THEMATICALLY MEANINGFUL gradient.

export const featureGradientPresets = {
  /** Administration/Management — solid primary (trust + reliability) */
  administration: 'from-indigo-500 to-indigo-600',
  /** CBT/Exams — ember (warmth + importance + urgency) */
  exams: 'from-amber-500 to-orange-600',
  /** AI/Intelligence — neural (cool + computational + futuristic) */
  ai: 'from-cyan-500 to-teal-600',
  /** Analytics/Data — primary → neural (data flowing through system) */
  analytics: 'from-indigo-500 to-cyan-500',
  /** Students/People — primary → ember (people + knowledge) */
  students: 'from-indigo-500 to-amber-500',
  /** Security/Trust — deep primary (solid + immovable + secure) */
  security: 'from-indigo-600 to-indigo-800',
  /** Marketplace — ember → neural (exchange + connection) */
  marketplace: 'from-amber-400 to-cyan-400',
  /** Parents/Community — warm primary (community + care) */
  community: 'from-violet-500 to-indigo-500',
  /** Integration — neural → primary (systems connecting) */
  integration: 'from-cyan-500 to-indigo-500',
  /** Performance — ember → rose (speed + achievement) */
  performance: 'from-amber-500 to-rose-500',
} as const

// ─── Gradient Text Presets ───

export const gradientTextPresets = {
  /** The Forge — signature brand gradient */
  forge: 'bg-gradient-to-r from-indigo-500 via-amber-400 to-cyan-400 dark:from-indigo-400 dark:via-amber-300 dark:to-cyan-300',
  /** Neural Stream — AI/tech gradient */
  neural: 'bg-gradient-to-r from-indigo-500 to-cyan-400 dark:from-indigo-400 dark:to-cyan-300',
  /** Ember Glow — warm knowledge gradient */
  ember: 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 dark:from-amber-300 dark:via-orange-400 dark:to-red-400',
  /** Cool — calm analytical gradient */
  cool: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-500',
  /** Rainbow — vibrant celebration gradient */
  rainbow: 'bg-gradient-to-r from-rose-400 via-violet-500 to-cyan-400 dark:from-rose-300 dark:via-violet-400 dark:to-cyan-300',
} as const

// ─── Z-Index Scale ───

export const forgeZ = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const
