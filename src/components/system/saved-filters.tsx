'use client'

import * as React from 'react'
import { Star, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

// ============================================================================
// ExamForge AI OS — SavedFilters
// ============================================================================
// A dropdown for managing saved filter views. Renders the current view name
// (or "Default") + a dropdown to:
// - Load a saved view
// - Star/unstar a view (favorites)
// - Save the current filter state as a new view (caller handles save)
// - Delete a saved view
//
// Caller provides: list of saved views + handlers. The component just renders
// the dropdown consistently.
// ============================================================================

export interface SavedView {
  id: string
  label: string
  /** Starred views appear at the top */
  starred?: boolean
  /** Filter spec — opaque to this component; caller interprets */
  filters: unknown
}

export interface SavedFiltersProps {
  views: SavedView[]
  /** Currently-active view id (optional) */
  activeViewId?: string | null
  /** Called when a saved view is selected */
  onSelect: (view: SavedView) => void
  /** Called when the user wants to save current state as a new view */
  onSaveCurrent: () => void
  /** Called to toggle the star on a view */
  onToggleStar: (viewId: string) => void
  /** Called to delete a view */
  onDelete: (viewId: string) => void
  /** Label for the trigger button */
  triggerLabel?: string
  className?: string
}

export function SavedFilters({
  views,
  activeViewId,
  onSelect,
  onSaveCurrent,
  onToggleStar,
  onDelete,
  triggerLabel,
  className,
}: SavedFiltersProps) {
  const activeView = views.find((v) => v.id === activeViewId)
  const label = triggerLabel ?? activeView?.label ?? 'Default view'
  const starred = views.filter((v) => v.starred)
  const others = views.filter((v) => !v.starred)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 text-xs gap-1.5 border-white/[0.08] hover:bg-white/[0.04]',
            className,
          )}
        >
          {activeView?.starred && (
            <Star className="h-3 w-3 text-ember fill-ember" />
          )}
          <span className="max-w-[160px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 forge-glass-elevated border-white/[0.06]"
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Saved views
        </DropdownMenuLabel>

        {starred.length > 0 && (
          <>
            {starred.map((view) => (
              <SavedViewRow
                key={view.id}
                view={view}
                isActive={view.id === activeViewId}
                onSelect={onSelect}
                onToggleStar={onToggleStar}
                onDelete={onDelete}
              />
            ))}
            <DropdownMenuSeparator className="bg-white/[0.04]" />
          </>
        )}

        {others.length > 0 ? (
          others.map((view) => (
            <SavedViewRow
              key={view.id}
              view={view}
              isActive={view.id === activeViewId}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              onDelete={onDelete}
            />
          ))
        ) : (
          <DropdownMenuItem
            disabled
            className="text-xs text-muted-foreground/60 cursor-default"
          >
            No saved views yet
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-white/[0.04]" />
        <DropdownMenuItem
          onClick={onSaveCurrent}
          className="text-xs text-primary focus:text-primary focus:bg-primary/10 cursor-pointer"
        >
          <Star className="h-3 w-3 mr-2" />
          Save current view
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SavedViewRow({
  view,
  isActive,
  onSelect,
  onToggleStar,
  onDelete,
}: {
  view: SavedView
  isActive: boolean
  onSelect: (view: SavedView) => void
  onToggleStar: (viewId: string) => void
  onDelete: (viewId: string) => void
}) {
  return (
    <div className="group relative flex items-center pr-1">
      <DropdownMenuItem
        onClick={() => onSelect(view)}
        className={cn(
          'flex-1 cursor-pointer text-xs',
          isActive && 'bg-primary/10 text-primary',
        )}
      >
        {view.starred && (
          <Star className="h-3 w-3 mr-2 text-ember fill-ember shrink-0" />
        )}
        <span className="truncate">{view.label}</span>
        {isActive && (
          <span className="ml-auto text-[10px] text-primary/70">Active</span>
        )}
      </DropdownMenuItem>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(view.id)
          }}
          className="p-1 text-muted-foreground hover:text-ember"
          aria-label={view.starred ? 'Unstar view' : 'Star view'}
        >
          <Star
            className={cn(
              'h-3 w-3',
              view.starred && 'text-ember fill-ember',
            )}
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(view.id)
          }}
          className="p-1 text-muted-foreground hover:text-destructive"
          aria-label="Delete view"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
