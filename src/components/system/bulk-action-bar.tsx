'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckSquare, Trash2, Download, type LucideIcon } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI OS — BulkActionBar
// ============================================================================
// Sticky bottom action bar that appears when rows are selected in a table
// or list. Provides:
// - Visible selection count
// - Optional action buttons (delete, export, archive, etc.)
// - Clear-selection button
// - Framer Motion slide-up entrance + exit
// - Sticky bottom positioning (within scroll container)
//
// Pattern: parent renders {selectedCount > 0 && <BulkActionBar .../>}
// ============================================================================

export interface BulkAction {
  label: string
  icon?: string | LucideIcon
  onClick: () => void
  /** "destructive" renders red; defaults to "outline" */
  variant?: 'default' | 'outline' | 'destructive'
  /** Optional confirmation gating — show a confirm dialog */
  confirmLabel?: string
}

export interface BulkActionBarProps {
  /** Number of currently-selected rows */
  selectedCount: number
  /** Actions to render */
  actions?: BulkAction[]
  /** Clear selection handler */
  onClear: () => void
  /** Singular noun — used for the count label (e.g. "3 students selected") */
  noun?: string
  /** Sticky positioning — defaults to "bottom" */
  position?: 'bottom' | 'top'
  className?: string
}

export function BulkActionBar({
  selectedCount,
  actions = [],
  onClear,
  noun = 'items',
  position = 'bottom',
  className,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 24 : -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 24 : -24 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-30',
            position === 'bottom' ? 'bottom-6' : 'top-6',
            'flex items-center gap-3 px-4 py-2.5 rounded-xl',
            'forge-glass-elevated border border-white/[0.06]',
            'shadow-[0_8px_40px_-8px_rgba(59,130,246,0.18)]',
            className,
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-white/[0.06]">
            <CheckSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {selectedCount} {noun === 'items' ? 'items' : noun}
              <span className="text-muted-foreground font-normal ml-1">selected</span>
            </span>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-1.5">
              {actions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant ?? 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  className={cn(
                    'h-8 text-xs gap-1.5',
                    action.variant === 'destructive' &&
                      'border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive',
                  )}
                >
                  {action.icon && <action.icon className="h-3 w-3" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Default bulk actions factory ──────────────────────────────────────────
// Convenience helper for the most common bulk action patterns.

export const defaultBulkActions = {
  delete: (onDelete: () => void): BulkAction => ({
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    onClick: onDelete,
  }),
  export: (onExport: () => void): BulkAction => ({
    label: 'Export',
    icon: Download,
    variant: 'outline',
    onClick: onExport,
  }),
}
