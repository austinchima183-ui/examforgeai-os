'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboardWidgetStore, type WidgetLayout } from '@/lib/stores/dashboard-widget-store'
import type { WidgetDef, WidgetCategory } from '@/components/system/widget-grid'
import { cn } from '@/lib/utils'
import { Check, Eye, EyeOff, Plus, Search, Star, X } from 'lucide-react'

// ============================================================================
// ExamForge AI — Widget Marketplace (Dashboard UX 3.0)
// ============================================================================
// Browse, search, add, hide, favorite and categorize dashboard widgets.
// - Search across title / description / category
// - Category chips (grouping + filtering)
// - Add/remove (hide) per widget — restores default position on re-add
// - Favorite stars (favorites pin to top of the grid and survive focus mode)
// WCAG: Radix dialog focus trap + labelled controls + keyboard operable.
// ============================================================================

export interface WidgetMarketplaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgets: WidgetDef[]
  layout: WidgetLayout
  role: string
  userId: string
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  analytics: 'Analytics',
  tasks: 'Tasks & Planning',
  tools: 'Tools',
  ai: 'AI',
  social: 'School Life',
  system: 'System',
}

export function WidgetMarketplace({
  open,
  onOpenChange,
  widgets,
  layout,
  role,
  userId,
}: WidgetMarketplaceProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<WidgetCategory | 'all'>('all')

  const { addWidget, hideWidget, showWidget, toggleWidgetFavorite } =
    useDashboardWidgetStore()

  const categories = useMemo(() => {
    const set = new Set<WidgetCategory>()
    widgets.forEach((w) => {
      if (w.category) set.add(w.category)
    })
    return Array.from(set)
  }, [widgets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return widgets.filter((w) => {
      if (category !== 'all' && w.category !== category) return false
      if (!q) return true
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description ?? '').toLowerCase().includes(q) ||
        (w.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [widgets, query, category])

  const visibleCount = layout.filter((p) => !p.hidden).length
  const hiddenCount = layout.length - visibleCount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col forge-glass-elevated border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Widget Marketplace
          </DialogTitle>
          <DialogDescription>
            Personalize your dashboard — {visibleCount} visible · {hiddenCount} hidden ·{' '}
            {widgets.length} available
          </DialogDescription>
        </DialogHeader>

        {/* Search + categories */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets…"
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.08]"
              aria-label="Search widgets"
            />
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter widgets by category"
          >
            <button
              type="button"
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
              className={cn(
                'h-7 rounded-full border px-3 text-[11px] font-medium transition-colors',
                category === 'all'
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  'h-7 rounded-full border px-3 text-[11px] font-medium transition-colors',
                  category === c
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground'
                )}
              >
                {CATEGORY_LABELS[c] ?? c}
              </button>
            ))}
          </div>
        </div>

        {/* Widget catalog */}
        <div
          className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1"
          role="list"
          aria-label="Available widgets"
        >
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No widgets match “{query}”.
            </p>
          )}
          {filtered.map((w) => {
            const pos = layout.find((p) => p.id === w.id)
            const isVisible = pos ? !pos.hidden : false
            const isFavorite = pos?.favorite ?? false
            const Icon = w.icon
            return (
              <div
                key={w.id}
                role="listitem"
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                  isVisible
                    ? 'border-white/[0.08] bg-white/[0.03]'
                    : 'border-white/[0.05] bg-transparent opacity-70'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-foreground/70">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground/90">{w.title}</p>
                    {w.category && (
                      <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground">
                        {CATEGORY_LABELS[w.category] ?? w.category}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.description ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleWidgetFavorite(role, userId, w.id)}
                    aria-label={isFavorite ? `Unfavorite ${w.title}` : `Favorite ${w.title}`}
                    aria-pressed={isFavorite}
                  >
                    <Star
                      className={cn(
                        'h-3.5 w-3.5',
                        isFavorite && 'fill-forge-gold text-forge-gold'
                      )}
                    />
                  </Button>
                  {pos && !pos.hidden ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-[11px]"
                      onClick={() => hideWidget(role, userId, w.id)}
                    >
                      <EyeOff className="h-3 w-3" aria-hidden="true" />
                      Hide
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 border-primary/30 bg-primary/10 text-[11px] text-primary hover:bg-primary/20 hover:text-primary"
                      onClick={() =>
                        pos
                          ? showWidget(role, userId, w.id)
                          : addWidget(role, userId, { id: w.id, ...w.defaultPosition })
                      }
                    >
                      {pos ? (
                        <>
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          Show
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" aria-hidden="true" />
                          Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="border-t border-white/[0.06] pt-3">
          <p className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            Changes save automatically to your profile
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
