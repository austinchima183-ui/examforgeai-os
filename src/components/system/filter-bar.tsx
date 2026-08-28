'use client'

import * as React from 'react'
import { Search, X, SlidersHorizontal, Save, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// ExamForge AI OS — FilterBar
// ============================================================================
// Standard filter bar for list/table pages. Renders:
// - Search input (with clear button + leading icon)
// - Optional filter slots (select dropdowns, date pickers — passed as children)
// - Active filter count badge
// - Clear-all button (when filters active)
// - Save view button (persisted filters)
// - Responsive: collapses to a single column on mobile
// ============================================================================

export interface FilterBarProps {
  /** Search value (controlled) */
  searchValue?: string
  /** Search input change handler */
  onSearchChange?: (value: string) => void
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Filter trigger slots — select dropdowns, date pickers, etc. */
  children?: React.ReactNode
  /** Number of active filters (shows a badge + enables Clear All) */
  activeFilterCount?: number
  /** Clear all filters handler */
  onClearAll?: () => void
  /** Save current view handler — when provided, renders a Save View button */
  onSaveView?: () => void
  /** Optional right-aligned actions (export, create, etc.) */
  actions?: React.ReactNode
  /** Sticky mode — pins the filter bar below the sticky page toolbar while
   *  the page content scrolls (enterprise "action bar stays visible" UX) */
  sticky?: boolean
  className?: string
}

export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  activeFilterCount = 0,
  onClearAll,
  onSaveView,
  actions,
  sticky = false,
  className,
}: FilterBarProps) {
  const hasFilters = activeFilterCount > 0

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        'p-3 rounded-xl border border-white/[0.04] bg-white/[0.02]',
        sticky &&
          'sticky top-[calc(var(--page-toolbar-h,84px)+0.5rem)] z-10 bg-[#0E0E0E]/92 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 pr-8 bg-background/40 border-white/[0.06] text-sm"
              aria-label={searchPlaceholder}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Filter slots */}
        {children && (
          <div className="flex items-center gap-2 flex-wrap">
            {children}
            {hasFilters && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 h-5 bg-primary/10 text-primary border-primary/20"
              >
                <SlidersHorizontal className="h-2.5 w-2.5 mr-0.5" />
                {activeFilterCount}
              </Badge>
            )}
          </div>
        )}

        {/* Clear all */}
        {hasFilters && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}

        {/* Save view */}
        {onSaveView && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveView}
            className="h-9 text-xs border-white/[0.08] hover:bg-white/[0.04]"
          >
            <Save className="h-3 w-3" />
            Save view
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}
