'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, ChevronRight, MoreHorizontal, Maximize2, Minimize2, RefreshCw, Zap } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

// ============================================================================
// ExamForge AI — Enterprise Dashboard Widget
// ============================================================================
// Reusable composite component for all dashboard widgets.
// Encapsulates loading, empty, error, and expanded states with consistent
// AI-OS design language: glass surface, subtle borders, premium shadows.
// ============================================================================

type WidgetSize = 'sm' | 'md' | 'lg' | 'xl'
type WidgetVariant = 'default' | 'accent' | 'success' | 'warning' | 'ember' | 'neural'

const sizeMap: Record<WidgetSize, string> = {
  sm: 'col-span-12 sm:col-span-6 lg:col-span-4',
  md: 'col-span-12 sm:col-span-6 lg:col-span-6',
  lg: 'col-span-12 lg:col-span-8',
  xl: 'col-span-12',
}

const variantAccent: Record<WidgetVariant, string> = {
  default: '',
  accent: 'from-primary/8 via-primary/3 to-transparent',
  success: 'from-emerald-500/8 via-emerald-500/3 to-transparent',
  warning: 'from-amber-500/8 via-amber-500/3 to-transparent',
  ember: 'from-ember/8 via-ember/3 to-transparent',
  neural: 'from-neural/8 via-neural/3 to-transparent',
}

export interface DashboardWidgetProps {
  title: string
  subtitle?: string
  icon?: string | LucideIcon
  size?: WidgetSize
  variant?: WidgetVariant
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  error?: string | null
  expandable?: boolean
  actions?: React.ReactNode
  children: React.ReactNode
  onRefresh?: () => void
  className?: string
}

export function DashboardWidget({
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  variant = 'default',
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  error = null,
  expandable = false,
  actions,
  children,
  onRefresh,
  className,
}: DashboardWidgetProps) {
  const ResolvedIcon = resolveIcon(Icon) ?? Zap
  const [expanded, setExpanded] = useState(false)
  const reducedMotion = useReducedMotion()

  const animProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] },
      }

  return (
    <motion.div className={cn(sizeMap[size], className)} {...animProps}>
      <Card
        className={cn(
          'relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow',
          'hover:border-white/[0.06] transition-all duration-200 group'
        )}
      >
        {/* Variant gradient overlay */}
        {variant !== 'default' && (
          <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', variantAccent[variant])} />
        )}

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] shrink-0">
                <ResolvedIcon className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground/90 truncate">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onRefresh}
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            {actions}
            {expandable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded(!expanded)}
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-destructive/80">{error}</p>
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh} className="mt-2">
                  Try again
                </Button>
              )}
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={expanded ? 'expanded' : 'normal'}
                initial={reducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── StatCard Pro ──────────────────────────────────────────────────

export interface StatCardProProps {
  label: string
  value: string | number
  icon?: string | LucideIcon
  trend?: { value: number; label: string }
  variant?: WidgetVariant
  size?: WidgetSize
  loading?: boolean
  onClick?: () => void
}

export function StatCardPro({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  size = 'sm',
  loading = false,
  onClick,
}: StatCardProProps) {
  const ResolvedIcon = resolveIcon(Icon) ?? Zap
  if (loading) {
    return (
      <div className={sizeMap[size]}>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl p-4">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-16" />
        </Card>
      </div>
    )
  }

  const isPositive = trend ? trend.value >= 0 : true

  return (
    <motion.div
      className={sizeMap[size]}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow',
          'hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06]',
          'transition-all duration-200 group',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        {variant !== 'default' && (
          <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', variantAccent[variant])} />
        )}
        <div className="relative p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {Icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04] group-hover:bg-primary/15 transition-colors">
                <ResolvedIcon className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <ChevronRight
                className={cn(
                  'h-3 w-3',
                  isPositive ? 'text-emerald-500 rotate-[-90deg]' : 'text-red-400 rotate-90'
                )}
              />
              <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-red-400')}>
                {isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Page Header ───────────────────────────────────────────────────

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2" aria-label="Breadcrumb">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={cn(!bc.href && 'text-foreground/80 font-medium')}>{bc.label}</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ─── Section Divider ───────────────────────────────────────────────

export function SectionDivider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-white/[0.04] my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

// ─── Activity Feed Item ────────────────────────────────────────────

export interface ActivityItem {
  id: string
  icon: string | LucideIcon
  title: string
  description?: string
  timestamp: string
  href?: string
}

export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  const resolve = resolveIcon
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
  }

  return (
    <div className="space-y-1">
      {items.slice(0, 8).map(item => {
        const ResolvedIcon = resolveIcon(item.icon) ?? Zap
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg p-2 hover:bg-white/[0.02] transition-colors cursor-pointer"
            onClick={() => item.href && (window.location.href = item.href)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 border border-white/[0.03] shrink-0">
              <ResolvedIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{item.timestamp}</span>
          </div>
        )
      })}
    </div>
  )
}
