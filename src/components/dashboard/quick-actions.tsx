'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { UserRole } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon, ArrowRight } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'

// ============================================================================
// ExamForge AI — Quick Actions Grid (Premium)
// ============================================================================
// Grid of action cards with icons, role-filtered navigation, glass effects,
// and Framer Motion stagger entrance animation.
// ============================================================================

export interface QuickAction {
  title: string
  description: string
  icon: string | LucideIcon
  href: string
  requiredRoles?: UserRole[]
  color?: string
}

export interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
}

// ──────────────────────────────────────────────────────────────
// Container animation variants
// ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

// ──────────────────────────────────────────────────────────────
// Default color palette for action cards
// ──────────────────────────────────────────────────────────────

const defaultColors = [
  'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  'bg-green-50 dark:bg-green-950 dark:bg-emerald-950/40 text-green-600 dark:text-green-400',
  'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/40 text-yellow-600 dark:text-yellow-400',
  'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
  'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
  'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400',
]

// ──────────────────────────────────────────────────────────────
// Quick Actions Component
// ──────────────────────────────────────────────────────────────

export function QuickActions({ actions, className }: QuickActionsProps) {
  const { role } = useAuthStore()

  // Filter actions by current user role
  const filteredActions = actions.filter((action) => {
    if (!action.requiredRoles || action.requiredRoles.length === 0) return true
    if (!role) return false
    return action.requiredRoles.includes(role)
  })

  if (filteredActions.length === 0) {
    return null
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {filteredActions.map((action, index) => {
        const Icon = action.icon
        const colorClass = action.color ?? defaultColors[index % defaultColors.length]

        return (
          <motion.div key={action.href} variants={itemVariants}>
            <Link href={action.href} className="group block">
              <Card className="h-full forge-glass-surface border border-white/[0.04] rounded-xl forge-card-shadow transition-all duration-300 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-sm border border-white/[0.04] transition-transform duration-200 group-hover:scale-105',
                      colorClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                      {action.title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    Open
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
