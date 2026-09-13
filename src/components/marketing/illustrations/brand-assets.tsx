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

// ============================================================================
// ExamForge AI — Professional Avatar System
// ============================================================================
// Styled professional profile avatars that include role badges and subtle
// branding. Uses gradient backgrounds and professional styling.
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
