'use client'

// ============================================================================
// ExamForge AI — Role Selection Component
// ============================================================================
// Visual role picker for the registration page.
// Supports student, teacher, parent, school_admin roles.
// ============================================================================

import { motion } from 'framer-motion'
import { GraduationCap, BookOpen, Users, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

interface RoleOption {
  value: UserRole
  label: string
  description: string
  icon: React.ReactNode
}

const ROLES: RoleOption[] = [
  {
    value: 'student' as UserRole,
    label: 'Student',
    description: 'Take exams, track progress, study smarter',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    value: 'teacher' as UserRole,
    label: 'Teacher',
    description: 'Create exams, grade work, manage classes',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    value: 'parent' as UserRole,
    label: 'Parent',
    description: 'Monitor child progress, view reports',
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: 'school_admin' as UserRole,
    label: 'School Admin',
    description: 'Manage school, staff, billing & analytics',
    icon: <Building className="h-5 w-5" />,
  },
]

interface RoleSelectionProps {
  value: UserRole
  onChange: (_role: UserRole) => void
  disabled?: boolean
}

export function RoleSelection({ value, onChange, disabled = false }: RoleSelectionProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        I am a...
      </legend>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select your role">
        {ROLES.map((_role) => {
          const isSelected = value === _role.value
          return (
            <motion.button
              key={_role.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={_role.label}
              onClick={() => onChange(_role.value)}
              whileHover={disabled ? {} : { scale: 1.02 }}
              whileTap={disabled ? {} : { scale: 0.98 }}
              className={cn(
                'group relative flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-all duration-200',
                'forge-glass-surface forge-card-shadow',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary forge-glow'
                  : 'border-border/30 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/40',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200',
                'backdrop-blur-sm border',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary/30'
                  : 'bg-primary/5 text-muted-foreground border-border/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20'
              )}>
                {_role.icon}
              </div>
              <span className={cn(
                'text-sm font-semibold transition-colors duration-200',
                isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {_role.label}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
                {_role.description}
              </span>
            </motion.button>
          )
        })}
      </div>
    </fieldset>
  )
}

export { ROLES }
