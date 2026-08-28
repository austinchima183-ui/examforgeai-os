'use client'

// ============================================================================
// ExamForge AI — Branded Institution Logo System
// ============================================================================
// Professional grayscale/partial-color institution logos for the trust bar.
// Each logo is a stylized SVG that represents the institution's identity
// while maintaining a cohesive visual language. On hover, logos gain color.
// ============================================================================

interface InstitutionLogoProps {
  className?: string
  monochrome?: boolean
}

// Shared base styles
const logoBase = "shrink-0 select-none transition-all duration-300"

// ─── University Crest Component ───
function UniversityCrest({ 
  abbr, 
  color = '#6366f1',
  className = ''
}: { 
  abbr: string
  color?: string
  className?: string 
}) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      {/* Shield shape */}
      <path d="M20 3L35 10V22C35 30 28 36 20 38C12 36 5 30 5 22V10L20 3Z" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.3" strokeWidth="1"/>
      {/* Book icon inside */}
      <path d="M14 16L20 13L26 16V26L20 23L14 26V16Z" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="0.5"/>
      {/* Abbreviation */}
      <text x="20" y="33" textAnchor="middle" fill={color} fillOpacity="0.7" fontSize="7" fontWeight="700" fontFamily="system-ui">{abbr}</text>
    </svg>
  )
}

// ─── Institution Logo Pill — Grayscale Professional Style ───
// Displays institution names in a clean typographic lockup that resembles
// how real university logos appear in SaaS trust bars (Stripe, Vercel style).
// Monochrome by default, gains subtle color on hover.
export function InstitutionLogoPill({ 
  name, 
  abbr,
  color = '#6366f1',
  className = ''
}: { 
  name: string
  abbr: string
  color?: string
  className?: string 
}) {
  return (
    <div className={`group flex items-center gap-3 rounded-xl border border-border/20 bg-card/50 px-5 py-3 hover:border-border/50 hover:shadow-md hover:shadow-black/5 transition-all duration-300 select-none ${className}`}>
      {/* Shield crest logo mark */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300" style={{ backgroundColor: `${color}10` }}>
        <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M20 4L34 10V21C34 28 28 34 20 36C12 34 6 28 6 21V10L20 4Z" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.5" strokeWidth="1.2"/>
          <path d="M14 16L20 13L26 16V25L20 22L14 25V16Z" fill={color} fillOpacity="0.25" stroke={color} strokeOpacity="0.6" strokeWidth="0.6"/>
          <text x="20" y="32" textAnchor="middle" fill={color} fillOpacity="0.85" fontSize="7" fontWeight="800" fontFamily="system-ui">{abbr}</text>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground/90 transition-colors leading-tight">
          {name}
        </span>
        <span className="text-[9px] text-foreground/30 group-hover:text-foreground/50 transition-colors leading-tight mt-0.5">
          Verified Institution
        </span>
      </div>
    </div>
  )
}

// ─── Full Logo Data ───
export const institutionLogos = [
  { name: 'Lagos State University', abbr: 'LASU', color: '#3b82f6' },
  { name: 'University of Ibadan', abbr: 'UI', color: '#10b981' },
  { name: 'Ahmadu Bello University', abbr: 'ABU', color: '#f59e0b' },
  { name: 'Kings College Lagos', abbr: 'KCL', color: '#ef4444' },
  { name: 'Covenant University', abbr: 'CU', color: '#06b6d4' },
  { name: 'Obafemi Awolowo Univ.', abbr: 'OAU', color: '#6366f1' },
  { name: 'University of Lagos', abbr: 'UNILAG', color: '#14b8a6' },
  { name: 'University of Benin', abbr: 'UNIBEN', color: '#f97316' },
  { name: 'Nnamdi Azikiwe Univ.', abbr: 'UNIZIK', color: '#a855f7' },
  { name: 'Babcock University', abbr: 'BU', color: '#ec4899' },
  { name: 'Federal College of Edu.', abbr: 'FCE', color: '#8b5cf6' },
  { name: 'University of Ghana', abbr: 'UG', color: '#22c55e' },
  { name: 'Kwame Nkrumah Univ.', abbr: 'KNUST', color: '#eab308' },
  { name: 'University of Pretoria', abbr: 'UP', color: '#2563eb' },
  { name: 'Ashesi University', abbr: 'AU', color: '#0ea5e9' },
  { name: 'Strathmore University', abbr: 'SU', color: '#dc2626' },
] as const


// ============================================================================
// ExamForge AI — Professional Avatar System
// ============================================================================
// Replaces initials-in-circles with styled professional profile avatars
// that include role badges and subtle branding. Uses generated SVG portraits
// with gradient backgrounds and professional styling.
// ============================================================================

interface ProfessionalAvatarProps {
  name: string
  role: string
  organization?: string
  size?: 'sm' | 'md' | 'lg'
  gradient?: string
  className?: string
}

const sizeMap = {
  sm: { container: 'h-8 w-8', text: 'text-[8px]', border: 'ring-2' },
  md: { container: 'h-12 w-12', text: 'text-[10px]', border: 'ring-2' },
  lg: { container: 'h-16 w-16', text: 'text-xs', border: 'ring-3' },
}

export function ProfessionalAvatar({
  name,
  role,
  organization,
  size = 'md',
  gradient = 'from-indigo-500 to-amber-500',
  className = '',
}: ProfessionalAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const sizes = sizeMap[size]

  return (
    <div className={`relative ${className}`}>
      {/* Avatar circle with gradient */}
      <div className={`${sizes.container} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center ${sizes.border} ring-white/20 shadow-md`}>
        <span className={`${sizes.text} font-bold text-white`}>{initials}</span>
      </div>
      {/* Verified badge for senior roles */}
      {role.toLowerCase().includes('dean') || role.toLowerCase().includes('professor') || role.toLowerCase().includes('vice') || role.toLowerCase().includes('director') ? (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card flex items-center justify-center shadow-sm border border-border/30">
          <svg viewBox="0 0 16 16" className="h-3 w-3 text-primary" fill="currentColor">
            <path d="M8 1l2 3 3.5.5-2.5 2.5.5 3.5L8 9l-3.5 1.5.5-3.5L2.5 4.5 6 4z"/>
          </svg>
        </div>
      ) : null}
    </div>
  )
}


// ============================================================================
// ExamForge AI — Team Member Card
// ============================================================================
// Professional team member display with avatar, name, role, and bio
// ============================================================================

interface TeamMemberCardProps {
  name: string
  role: string
  bio?: string
  gradient?: string
  className?: string
}

export function TeamMemberCard({
  name,
  role,
  bio,
  gradient = 'from-indigo-500 to-amber-500',
  className = '',
}: TeamMemberCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div className={`text-center ${className}`}>
      <div className="mx-auto mb-3 relative">
        {/* Professional avatar with decorative ring */}
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center ring-4 ring-background shadow-xl">
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>
        {/* Decorative accent */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary shadow-sm" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
      {bio && <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-[200px] mx-auto leading-relaxed">{bio}</p>}
    </div>
  )
}
