'use client'

// ============================================================================
// ExamForge AI — Dockable Panel System (Dashboard UX 3.0 / Ω-3)
// ============================================================================
// Panels that dock to the left / right / bottom edge of the app frame:
//   - Dock / undock (float as a dialog)
//   - Collapse to a labeled rail (single click to reopen)
//   - Drag the edge to resize (persisted per role:userId)
//   - Keyboard accessible: F6 cycles docks, Escape closes overlays
// Designed for the locked scroll architecture: docks live INSIDE the fixed
// app frame (position: fixed, inset aware) and scroll internally.
// ============================================================================

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PanelLeftClose, PanelLeftOpen, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type DockSide = 'left' | 'right' | 'bottom'

export interface DockPanelProps {
  /** Unique id — used for layout persistence */
  id: string
  /** Dock edge */
  side?: DockSide
  /** Panel title (also the collapsed rail label) */
  title: string
  /** lucide icon component shown in the rail + header */
  icon?: React.ElementType
  /** Panel content — scrolls independently */
  children: ReactNode
  /** Persistence scope (`${role}:${userId}`) */
  scope?: string
  /** Controlled open state (uncontrolled when omitted) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Initial width for left/right docks (px) */
  defaultWidth?: number
  /** Initial height for bottom dock (px) */
  defaultHeight?: number
  /** Min/max resize bounds */
  minSize?: number
  maxSize?: number
  /** Hide the resize handle (fixed-size docks) */
  fixedSize?: boolean
  className?: string
}

interface PersistedDock {
  size: number
  collapsed: boolean
}

function loadPersisted(scope: string | undefined, id: string): PersistedDock | null {
  if (!scope || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`examforge-dock:${scope}:${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedDock
    if (typeof parsed.size === 'number' && typeof parsed.collapsed === 'boolean') {
      return parsed
    }
  } catch {
    // corrupted entry — ignore
  }
  return null
}

function persist(scope: string | undefined, id: string, value: PersistedDock) {
  if (!scope || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`examforge-dock:${scope}:${id}`, JSON.stringify(value))
  } catch {
    // storage full / disabled — non-fatal
  }
}

const SIDE_CLASSES: Record<DockSide, string> = {
  left: 'left-0 top-0 bottom-0 border-r',
  right: 'right-0 top-0 bottom-0 border-l',
  bottom: 'left-0 right-0 bottom-0 border-t',
}

/**
 * A single dockable panel. Renders nothing when closed and uncontrolled.
 *
 * Usage:
 *   <DockPanel id="details" title="Details" side="right" scope={`${role}:${userId}`}>
 *     <RowDetails row={selected} />
 *   </DockPanel>
 */
export function DockPanel({
  id,
  side = 'right',
  title,
  icon: Icon,
  children,
  scope,
  open: openProp,
  onOpenChange,
  defaultWidth = 340,
  defaultHeight = 280,
  minSize = 220,
  maxSize = 640,
  fixedSize = false,
  className,
}: DockPanelProps) {
  const stored = useRef<PersistedDock | null>(loadPersisted(scope, id))
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(stored.current?.collapsed ?? false)
  const [size, setSize] = useState<number>(
    stored.current?.size ?? (side === 'bottom' ? defaultHeight : defaultWidth)
  )
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const open = openProp ?? uncontrolledOpen
  const setOpen = useCallback(
    (v: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(v)
      onOpenChange?.(v)
    },
    [openProp, onOpenChange]
  )

  // hydration-safe persistence restore
  useLayoutEffect(() => {
    const s = loadPersisted(scope, id)
    if (s) {
      setSize(s.size)
      setCollapsed(s.collapsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    persist(scope, id, { size, collapsed })
  }, [scope, id, size, collapsed])

  // ── Resize drag ──
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (fixedSize) return
      e.preventDefault()
      setDragging(true)
      const startX = e.clientX
      const startY = e.clientY
      const startSize = size
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        let next = startSize
        if (side === 'left') next = startSize + dx
        else if (side === 'right') next = startSize - dx
        else next = startSize - dy
        setSize(Math.min(maxSize, Math.max(minSize, next)))
      }
      const onUp = () => {
        setDragging(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [fixedSize, size, side, minSize, maxSize]
  )

  // ── Keyboard: Escape closes (float mode) ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && openProp !== undefined) {
        setOpen(false)
      }
    },
    [openProp, setOpen]
  )

  if (!open) return null

  const horizontal = side === 'left' || side === 'right'

  // ── Collapsed rail ──
  if (collapsed) {
    return (
      <div
        className={cn(
          'fixed z-30 flex items-center gap-1 border border-border/30 bg-[#111]/95 backdrop-blur-xl forge-card-shadow',
          side === 'left' && 'left-0 top-1/2 -translate-y-1/2 flex-row rounded-r-lg border-l-0 py-3 pr-2 pl-1',
          side === 'right' && 'right-0 top-1/2 -translate-y-1/2 flex-row-reverse rounded-l-lg border-r-0 py-3 pl-2 pr-1',
          side === 'bottom' && 'bottom-0 left-1/2 -translate-x-1/2 flex-col rounded-t-lg border-b-0 px-3 pt-1 pb-0.5'
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-foreground/70"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand ${title} panel`}
        >
          {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          <span className="max-w-[120px] truncate">{title}</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label={`${title} panel`}
      data-dock-side={side}
      data-dragging={dragging || undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'fixed z-30 flex flex-col border-border/30 bg-[#111]/97 backdrop-blur-xl forge-card-shadow',
        'animate-in slide-in-from-right-2 duration-200',
        SIDE_CLASSES[side],
        side === 'right' && 'rounded-l-xl',
        side === 'left' && 'rounded-r-xl',
        side === 'bottom' && 'rounded-t-xl',
        dragging && 'select-none',
        className
      )}
      style={
        horizontal
          ? { width: size }
          : { height: size }
      }
    >
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/20 px-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
          ) : null}
          <span className="truncate text-sm font-medium text-foreground/90">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-foreground/50 hover:text-foreground"
            onClick={() => setCollapsed(true)}
            aria-label={`Collapse ${title} panel to rail`}
          >
            {side === 'left' ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4 rotate-180" aria-hidden="true" />
            )}
          </Button>
          {onOpenChange || openProp !== undefined ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground/50 hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label={`Close ${title} panel`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Content — independent scroll (respects the locked scroll architecture) */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {children}
      </div>

      {/* Resize handle */}
      {!fixedSize && (
        <div
          role="separator"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-label={`Resize ${title} panel`}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            // Keyboard resize: ±16px per press
            const step = 16
            if (e.key === 'ArrowLeft' && side === 'right') {
              e.preventDefault()
              setSize((s) => Math.min(maxSize, Math.max(minSize, s + step)))
            } else if (e.key === 'ArrowRight' && side === 'left') {
              e.preventDefault()
              setSize((s) => Math.min(maxSize, Math.max(minSize, s + step)))
            } else if (e.key === 'ArrowUp' && side === 'bottom') {
              e.preventDefault()
              setSize((s) => Math.min(maxSize, Math.max(minSize, s + step)))
            } else if (
              (e.key === 'ArrowRight' && side === 'right') ||
              (e.key === 'ArrowLeft' && side === 'left') ||
              (e.key === 'ArrowDown' && side === 'bottom')
            ) {
              e.preventDefault()
              setSize((s) => Math.min(maxSize, Math.max(minSize, s - step)))
            }
          }}
          className={cn(
            'group absolute z-10 touch-none',
            side === 'right' && '-left-1 top-0 h-full w-2 cursor-col-resize',
            side === 'left' && '-right-1 top-0 h-full w-2 cursor-col-resize',
            side === 'bottom' && 'left-0 top-0 h-2 w-full cursor-row-resize',
            'flex items-center justify-center'
          )}
        >
          <span
            className={cn(
              'rounded-full bg-border/50 opacity-0 transition-opacity group-hover:opacity-100',
              horizontal ? 'h-10 w-[3px]' : 'w-10 h-[3px]'
            )}
            aria-hidden="true"
          />
          <GripVertical
            className={cn(
              'absolute h-3 w-3 text-foreground/25 opacity-0 transition-opacity group-hover:opacity-100',
              !horizontal && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Dock trigger button — consistent affordance for opening a dock panel.
 */
export function DockTrigger({
  onClick,
  title,
  icon: Icon,
  active,
}: {
  onClick: () => void
  title: string
  icon?: React.ElementType
  active?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'h-8 gap-1.5 border-border/40 bg-secondary/50 text-xs',
        active && 'border-blue-500/40 bg-blue-500/10 text-blue-300'
      )}
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Toggle ${title} panel`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {title}
    </Button>
  )
}
