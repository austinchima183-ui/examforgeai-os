'use client'

import { useRef, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDashboardWidgetStore, type WidgetPosition } from '@/lib/stores/dashboard-widget-store'
import { SectionCard } from '@/components/system/section-card'
import { Button } from '@/components/ui/button'
import {
  GripVertical,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Maximize2,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Draggable Widget Grid
// ============================================================================
// Enterprise dashboard widget framework:
//   - Each widget is a SectionCard with drag handle
//   - Reorder via drag (mouse) OR up/down arrows
//   - Pin/unpin (pinned widgets stay in place)
//   - Collapse/expand widget content
//   - Remove widget (with restore via menu)
//   - Position persisted per role+userId via dashboard-widget-store
//   - Skeleton loading state
//   - Empty state with add-widget CTA
//   - Error boundary with retry
//
// Inspired by Vercel/Linear dashboard widget grids.
// ============================================================================

export interface WidgetDef {
  id: string
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  // Default position (used when no user preference stored)
  defaultPosition: Omit<WidgetPosition, 'id'>
  // Render the widget content
  render: () => ReactNode
  // Loading skeleton (optional)
  skeleton?: () => ReactNode
  // Hide the drag handle (e.g., for always-pinned widgets)
  fixed?: boolean
}

interface DraggableWidgetProps {
  widget: WidgetDef
  position: WidgetPosition
  role: string
  userId: string
  index: number
  total: number
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  isDragging: boolean
  isDragOver: boolean
}

function DraggableWidget({
  widget,
  position,
  role,
  userId,
  index,
  total,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: DraggableWidgetProps) {
  const router = useRouter()
  const {
    toggleWidgetPin,
    toggleWidgetCollapse,
    removeWidget,
    moveWidget,
    updateWidget,
  } = useDashboardWidgetStore()

  const Icon = widget.icon
  const isCollapsed = position.collapsed
  const [refreshing, setRefreshing] = useState(false)

  // ── Refresh: re-fetch server data with a visible spin ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      router.refresh()
      // Give the refresh a minimum visible duration so the feedback is clear
      await new Promise((resolve) => setTimeout(resolve, 600))
    } finally {
      setRefreshing(false)
    }
  }, [router])

  // ── Resize: cycle through standard widths (4 → 6 → 8 → 12 columns) ──
  const RESIZE_CYCLE = [4, 6, 8, 12]
  const handleResize = useCallback(() => {
    const currentIndex = RESIZE_CYCLE.indexOf(position.w)
    const nextW = RESIZE_CYCLE[(currentIndex + 1) % RESIZE_CYCLE.length] ?? position.w
    updateWidget(role, userId, widget.id, { w: nextW })
  }, [position.w, role, userId, widget.id, updateWidget])

  return (
    <motion.div
      layout
      draggable={!widget.fixed && !position.pinned}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isDragging ? 0.4 : 1,
        y: 0,
        scale: isDragging ? 0.98 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'group relative transition-all',
        isDragOver && 'ring-2 ring-primary/40'
      )}
      style={{ width: `${(position.w / 12) * 100}%` }}
    >
      <SectionCard
        title={widget.title}
        description={widget.description}
        icon={Icon}
        action={
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Move up */}
            {!widget.fixed && index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
                onClick={() => moveWidget(role, userId, widget.id, 'up')}
                aria-label={`Move ${widget.title} up`}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            {/* Move down */}
            {!widget.fixed && index < total - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
                onClick={() => moveWidget(role, userId, widget.id, 'down')}
                aria-label={`Move ${widget.title} down`}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            )}
            {/* Refresh — re-fetches live data */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
              onClick={handleRefresh}
              aria-label={`Refresh ${widget.title} data`}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn('h-3 w-3', refreshing && 'animate-spin text-cyan-400')}
              />
            </Button>
            {/* Resize — cycles width 1/3 → 1/2 → 2/3 → full */}
            {!widget.fixed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
                onClick={handleResize}
                aria-label={`Resize ${widget.title} (current width ${position.w} of 12 columns)`}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            {/* Pin */}
            {!widget.fixed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
                onClick={() => toggleWidgetPin(role, userId, widget.id)}
                aria-label={position.pinned ? `Unpin ${widget.title}` : `Pin ${widget.title}`}
              >
                {position.pinned ? <PinOff className="h-3 w-3 text-ember/70" /> : <Pin className="h-3 w-3" />}
              </Button>
            )}
            {/* Collapse */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-foreground/30 hover:text-foreground/70"
              onClick={() => toggleWidgetCollapse(role, userId, widget.id)}
              aria-label={isCollapsed ? `Expand ${widget.title}` : `Collapse ${widget.title}`}
            >
              {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
            {/* Remove */}
            {!widget.fixed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground/30 hover:text-destructive"
                onClick={() => removeWidget(role, userId, widget.id)}
                aria-label={`Remove ${widget.title} widget`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        }
      >
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {widget.render()}
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* Drag handle — only visible when hovered and not pinned/fixed */}
      {!widget.fixed && !position.pinned && (
        <div
          className="absolute top-2 right-2 h-6 w-6 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-foreground/30 hover:text-foreground/60"
          aria-hidden="true"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Pinned indicator */}
      {position.pinned && (
        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-ember/60 font-medium">
          <Pin className="h-2.5 w-2.5" aria-hidden="true" />
          <span>Pinned</span>
        </div>
      )}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget Grid Container
// ──────────────────────────────────────────────────────────────

export interface WidgetGridProps {
  widgets: WidgetDef[]
  role: string
  userId: string
  loading?: boolean
  emptyState?: ReactNode
  className?: string
}

export function WidgetGrid({
  widgets,
  role,
  userId,
  loading,
  emptyState,
  className,
}: WidgetGridProps) {
  const { getLayout, setLayout } = useDashboardWidgetStore()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragImageRef = useRef<HTMLDivElement>(null)

  // Build layout from store or widget defaults
  const layout: WidgetPosition[] = widgets.map((w) => {
    const stored = getLayout(role, userId).find((p) => p.id === w.id)
    return stored ?? { id: w.id, ...w.defaultPosition }
  })

  // Sort by y position
  const sortedLayout = [...layout].sort((a, b) => a.y - b.y)

  // Handle drag reorder
  const handleDragStart = useCallback((widgetId: string) => {
    return () => setDraggingId(widgetId)
  }, [])

  const handleDragOver = useCallback((widgetId: string) => {
    return (e: React.DragEvent) => {
      e.preventDefault()
      if (widgetId !== draggingId) setDragOverId(widgetId)
    }
  }, [draggingId])

  const handleDrop = useCallback((widgetId: string) => {
    return () => {
      if (!draggingId || draggingId === widgetId) {
        setDraggingId(null)
        setDragOverId(null)
        return
      }
      // Swap y positions
      const fromWidget = layout.find((w) => w.id === draggingId)
      const toWidget = layout.find((w) => w.id === widgetId)
      if (fromWidget && toWidget) {
        const fromY = fromWidget.y
        fromWidget.y = toWidget.y
        toWidget.y = fromY
        setLayout(role, userId, layout)
      }
      setDraggingId(null)
      setDragOverId(null)
    }
  }, [draggingId, layout, role, userId, setLayout])

  // Loading state
  if (loading) {
    return (
      <div className={cn('grid grid-cols-12 gap-4', className)}>
        {widgets.map((w) => (
          <div
            key={w.id}
            style={{ width: `${(w.defaultPosition.w / 12) * 100}%` }}
            className="col-span-12"
          >
            <div className="h-64 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111111] forge-pulse-bg" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (widgets.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div ref={dragImageRef} className={cn('flex flex-wrap gap-4', className)}>
      {sortedLayout.map((pos, idx) => {
        const widget = widgets.find((w) => w.id === pos.id)
        if (!widget) return null
        return (
          <DraggableWidget
            key={widget.id}
            widget={widget}
            position={pos}
            role={role}
            userId={userId}
            index={idx}
            total={sortedLayout.length}
            onDragStart={handleDragStart(widget.id)}
            onDragOver={handleDragOver(widget.id)}
            onDrop={handleDrop(widget.id)}
            isDragging={draggingId === widget.id}
            isDragOver={dragOverId === widget.id}
          />
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget Skeleton — used while data is loading
// ──────────────────────────────────────────────────────────────

export function WidgetSkeleton({ width = 6 }: { width?: number }) {
  return (
    <div
      style={{ width: `${(width / 12) * 100}%` }}
      className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111111] p-4 space-y-3"
    >
      <div className="h-4 w-32 bg-[#1D1D1D] rounded forge-pulse-bg" />
      <div className="h-3 w-full bg-[#1D1D1D]/60 rounded forge-pulse-bg" />
      <div className="h-3 w-2/3 bg-[#1D1D1D]/60 rounded forge-pulse-bg" />
      <div className="h-32 w-full bg-[#1D1D1D]/40 rounded-md forge-pulse-bg" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget Empty State
// ──────────────────────────────────────────────────────────────

export function WidgetEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-xs text-foreground/40 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget Error State
// ──────────────────────────────────────────────────────────────

export function WidgetErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: Error | string
  onRetry?: () => void
}) {
  const msg = typeof error === 'string' ? error : error.message
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
        <X className="h-4 w-4 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-xs text-foreground/40 mt-1 max-w-sm font-mono">{msg}</p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="mt-3 h-7 text-[12px]"
        >
          Try again
        </Button>
      )}
    </div>
  )
}
