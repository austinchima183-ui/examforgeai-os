'use client'

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDashboardWidgetStore, type WidgetPosition } from '@/lib/stores/dashboard-widget-store'
import { SectionCard } from '@/components/system/section-card'
import { Button } from '@/components/ui/button'
import { WidgetMarketplace } from '@/components/system/widget-marketplace'
import { WidgetToolbar } from '@/components/system/widget-toolbar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
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
  Maximize,
  Minimize2,
  Star,
  Download,
  EyeOff,
  Expand,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Widget Grid 3.0 (Dashboard UX)
// ============================================================================
// Enterprise dashboard widget framework:
//   - Responsive 4/8/12-column CSS grid (matches DashboardGrid breakpoints)
//   - Each widget is a SectionCard with drag handle
//   - Reorder via drag (mouse) OR up/down arrows (WCAG 2.1.1 keyboard alt)
//   - Pin/unpin (pinned widgets stay in place)
//   - Collapse/expand widget content
//   - Resize width (4 → 6 → 8 → 12 column cycle)
//   - Refresh (router.refresh() live data re-fetch)
//   - Favorite widgets (star; favorites survive focus mode)
//   - Hide/show + add via Widget Marketplace
//   - Fullscreen widget overlay (Esc to exit)
//   - Export widget data (CSV download)
//   - Right-click context menu with every action
//   - Toolbar: search · category filters · favorites filter · saved layouts
//     · undo/redo · focus mode · reset · connection + autosave indicators
//   - Smart onboarding coach card (first visit)
//   - Keyboard: Ctrl+Z undo · Ctrl+Shift+Z redo · Shift+F focus mode
//   - Position persisted per role+userId via dashboard-widget-store
//   - Skeleton loading state
//   - Empty state with marketplace CTA
//   - Error boundary with retry
//
// Inspired by Vercel/Linear/Stripe dashboard widget grids.
// WCAG: 2.1.1 (keyboard reorder), 1.4.11 (focus/hover contrast), 4.1.2 (labels)
// ============================================================================

export type WidgetCategory = 'analytics' | 'tasks' | 'tools' | 'ai' | 'social' | 'system'

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  analytics: 'Analytics',
  tasks: 'Tasks & Planning',
  tools: 'Tools',
  ai: 'AI',
  social: 'School Life',
  system: 'System',
}

export interface WidgetDef {
  id: string
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  category?: WidgetCategory
  /** Optional data export — returns rows for CSV download, or null to hide the action */
  exportData?: () => Array<Record<string, unknown>> | null
  // Default position (used when no user preference stored)
  defaultPosition: Omit<WidgetPosition, 'id'>
  // Render the widget content
  render: () => ReactNode
  // Loading skeleton (optional)
  skeleton?: () => ReactNode
  // Hide the drag handle (e.g., for always-pinned widgets)
  fixed?: boolean
  /** Widget content brings its own card frame — controls render as a floating overlay */
  frameless?: boolean
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
  onFullscreen: (widget: WidgetDef) => void
}

// Static class lookups — Tailwind JIT must see literal class names.
const SPAN_CLASSES: Record<number, string> = {
  4: 'col-span-4 md:col-span-4 xl:col-span-4',
  6: 'col-span-4 md:col-span-4 xl:col-span-6',
  8: 'col-span-4 md:col-span-8 xl:col-span-8',
  12: 'col-span-4 md:col-span-8 xl:col-span-12',
}

// Standard resize width cycle (module-level constant — stable across renders)
const RESIZE_CYCLE = [4, 6, 8, 12]

/** Download rows as a UTF-8 CSV (BOM for Excel, proper quoting). */
function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv =
    '\uFEFF' +
    [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
  onFullscreen,
}: DraggableWidgetProps) {
  const router = useRouter()
  const {
    toggleWidgetPin,
    toggleWidgetCollapse,
    removeWidget,
    moveWidget,
    updateWidget,
    toggleWidgetFavorite,
    hideWidget,
  } = useDashboardWidgetStore()

  const Icon = widget.icon
  const isCollapsed = position.collapsed
  const isFavorite = position.favorite ?? false
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
  const handleResize = useCallback(() => {
    const currentIndex = RESIZE_CYCLE.indexOf(position.w)
    const nextW = RESIZE_CYCLE[(currentIndex + 1) % RESIZE_CYCLE.length] ?? position.w
    updateWidget(role, userId, widget.id, { w: nextW })
  }, [position.w, role, userId, widget.id, updateWidget])

  const handleExport = useCallback(() => {
    if (!widget.exportData) return
    const rows = widget.exportData()
    if (!rows || rows.length === 0) return
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`${widget.id}-${stamp}.csv`, rows)
  }, [widget])

  const controls = (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {/* Favorite */}
      {!widget.fixed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
          onClick={() => toggleWidgetFavorite(role, userId, widget.id)}
          aria-label={isFavorite ? `Unfavorite ${widget.title}` : `Favorite ${widget.title}`}
          aria-pressed={isFavorite}
        >
          <Star className={cn('h-3 w-3', isFavorite && 'fill-forge-gold text-forge-gold')} />
        </Button>
      )}
      {/* Move up */}
      {!widget.fixed && index > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
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
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
          onClick={() => moveWidget(role, userId, widget.id, 'down')}
          aria-label={`Move ${widget.title} down`}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      )}
      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
        onClick={handleRefresh}
        aria-label={`Refresh ${widget.title} data`}
        disabled={refreshing}
      >
        <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin text-cyan-400')} />
      </Button>
      {/* Export */}
      {widget.exportData && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
          onClick={handleExport}
          aria-label={`Export ${widget.title} data as CSV`}
        >
          <Download className="h-3 w-3" />
        </Button>
      )}
      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
        onClick={() => onFullscreen(widget)}
        aria-label={`Expand ${widget.title} to fullscreen`}
      >
        <Maximize className="h-3 w-3" />
      </Button>
      {/* Resize */}
      {!widget.fixed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
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
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
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
        className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
        onClick={() => toggleWidgetCollapse(role, userId, widget.id)}
        aria-label={isCollapsed ? `Expand ${widget.title}` : `Collapse ${widget.title}`}
      >
        {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>
      {/* Hide */}
      {!widget.fixed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground"
          onClick={() => hideWidget(role, userId, widget.id)}
          aria-label={`Hide ${widget.title} widget`}
          title="Hide — re-add anytime from the marketplace"
        >
          <EyeOff className="h-3 w-3" />
        </Button>
      )}
      {/* Remove */}
      {!widget.fixed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/20 text-foreground/60 backdrop-blur-sm hover:text-foreground hover:hover:text-destructive"
          onClick={() => removeWidget(role, userId, widget.id)}
          aria-label={`Remove ${widget.title} widget`}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )

  // ── Right-click context menu content (shared by both card styles) ──
  const contextMenuContent = (
    <ContextMenuContent className="w-52">
      <ContextMenuItem onClick={handleRefresh} disabled={refreshing}>
        <RefreshCw className={cn('mr-2 h-3.5 w-3.5', refreshing && 'animate-spin')} />
        Refresh data
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onFullscreen(widget)}>
        <Expand className="mr-2 h-3.5 w-3.5" />
        Fullscreen
      </ContextMenuItem>
      <ContextMenuItem onClick={handleResize} disabled={widget.fixed}>
        <Maximize2 className="mr-2 h-3.5 w-3.5" />
        Resize ({position.w}/12 → next)
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => toggleWidgetFavorite(role, userId, widget.id)}>
        <Star className={cn('mr-2 h-3.5 w-3.5', isFavorite && 'fill-forge-gold text-forge-gold')} />
        {isFavorite ? 'Unfavorite' : 'Favorite'}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => toggleWidgetPin(role, userId, widget.id)} disabled={widget.fixed}>
        {position.pinned ? (
          <PinOff className="mr-2 h-3.5 w-3.5" />
        ) : (
          <Pin className="mr-2 h-3.5 w-3.5" />
        )}
        {position.pinned ? 'Unpin' : 'Pin'}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => toggleWidgetCollapse(role, userId, widget.id)}>
        {isCollapsed ? (
          <ChevronDown className="mr-2 h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="mr-2 h-3.5 w-3.5" />
        )}
        {isCollapsed ? 'Expand' : 'Collapse'}
      </ContextMenuItem>
      {widget.exportData && (
        <ContextMenuItem onClick={handleExport}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Export CSV
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => moveWidget(role, userId, widget.id, 'up')}
        disabled={widget.fixed || index === 0}
      >
        <ArrowUp className="mr-2 h-3.5 w-3.5" />
        Move up
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => moveWidget(role, userId, widget.id, 'down')}
        disabled={widget.fixed || index === total - 1}
      >
        <ArrowDown className="mr-2 h-3.5 w-3.5" />
        Move down
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => hideWidget(role, userId, widget.id)} disabled={widget.fixed}>
        <EyeOff className="mr-2 h-3.5 w-3.5" />
        Hide widget
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => removeWidget(role, userId, widget.id)}
        disabled={widget.fixed}
        className="text-destructive focus:text-destructive"
      >
        <X className="mr-2 h-3.5 w-3.5" />
        Remove
      </ContextMenuItem>
    </ContextMenuContent>
  )

  const body = (
    <AnimatePresence initial={false}>
      {!isCollapsed ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {widget.render()}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111111] px-4 py-3">
          <p className="text-sm font-medium text-foreground/80">{widget.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Collapsed — expand to view</p>
        </div>
      )}
    </AnimatePresence>
  )

  // ── Frameless: widget brings its own card; controls float over it ──
  if (widget.frameless) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            layout
            role="listitem"
            aria-label={widget.title}
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
              'group relative min-w-0 transition-all',
              SPAN_CLASSES[position.w] ?? SPAN_CLASSES[8],
              isDragOver && 'ring-2 ring-primary/40'
            )}
          >
            <div className="absolute right-2 top-2 z-10">{controls}</div>
            {isFavorite && (
              <div className="absolute left-2 top-2 z-10 flex items-center gap-1 text-[10px] font-medium text-forge-gold">
                <Star className="h-2.5 w-2.5 fill-forge-gold" aria-hidden="true" />
                <span className="sr-only">Favorite</span>
              </div>
            )}
            {body}
          </motion.div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout
          role="listitem"
          aria-label={widget.title}
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
            'group relative min-w-0 transition-all',
            SPAN_CLASSES[position.w] ?? SPAN_CLASSES[8],
            isDragOver && 'ring-2 ring-primary/40'
          )}
        >
          <SectionCard
            title={widget.title}
            description={widget.description}
            icon={Icon}
            action={controls}
          >
            {body}
          </SectionCard>

          {/* Drag handle — only visible when hovered and not pinned/fixed */}
          {!widget.fixed && !position.pinned && (
            <div
              className="absolute top-2 right-2 h-6 w-6 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-foreground/60 hover:text-foreground/60"
              aria-hidden="true"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Pinned + favorite indicators */}
          {(position.pinned || isFavorite) && (
            <div className="absolute top-2 left-2 flex items-center gap-2">
              {position.pinned && (
                <div className="flex items-center gap-1 text-[10px] text-ember/60 font-medium">
                  <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Pinned</span>
                </div>
              )}
              {isFavorite && (
                <Star className="h-2.5 w-2.5 fill-forge-gold text-forge-gold" aria-label="Favorite" />
              )}
            </div>
          )}
        </motion.div>
      </ContextMenuTrigger>
      {contextMenuContent}
    </ContextMenu>
  )
}

// ──────────────────────────────────────────────────────────────
// Fullscreen Widget Overlay
// ──────────────────────────────────────────────────────────────

function FullscreenWidgetOverlay({
  widget,
  onExit,
}: {
  widget: WidgetDef
  onExit: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const Icon = widget.icon

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    overlayRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previous?.focus()
    }
  }, [onExit])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-8"
      onClick={onExit}
      role="presentation"
    >
      <motion.div
        ref={overlayRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${widget.title} — fullscreen`}
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{widget.title}</p>
              {widget.description && (
                <p className="truncate text-xs text-muted-foreground">{widget.description}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="h-8 gap-1.5 border-white/[0.08] bg-white/[0.02] text-[12px]"
            aria-label="Exit fullscreen (Escape)"
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Exit fullscreen
            <kbd className="ml-1 rounded border border-white/[0.1] bg-white/[0.04] px-1 font-mono text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {widget.render()}
        </div>
      </motion.div>
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
  /** Accessible label for the widget grid region (WCAG 1.3.1) */
  'aria-label'?: string
}

export function WidgetGrid({
  widgets,
  role,
  userId,
  loading,
  emptyState,
  className,
  'aria-label': ariaLabel,
}: WidgetGridProps) {
  const store = useDashboardWidgetStore()
  const { getLayout, setLayout, hasLayout } = store
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragImageRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const searchInputId = useRef(`widget-search-${Math.random().toString(36).slice(2, 8)}`).current

  // ── Toolbar state ──
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [fullscreenWidget, setFullscreenWidget] = useState<WidgetDef | null>(null)

  const focusMode = store.getFocusMode(role, userId)

  // Build layout from store or widget defaults
  const layout: WidgetPosition[] = widgets.map((w) => {
    const stored = getLayout(role, userId).find((p) => p.id === w.id)
    return stored ?? { id: w.id, ...w.defaultPosition }
  })
  const storedLayout = getLayout(role, userId)
  const defaultLayout = widgets.map((w) => ({ id: w.id, ...w.defaultPosition }))

  // ── Seed the store with the default layout on first use ──
  const seededRef = useRef('')
  useEffect(() => {
    const seedKey = `${role}:${userId}`
    if (seededRef.current === seedKey) return
    seededRef.current = seedKey
    if (!hasLayout(role, userId) && widgets.length > 0) {
      setLayout(role, userId, widgets.map((w) => ({ id: w.id, ...w.defaultPosition })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId])

  // Categories present in this dashboard's widget set
  const categories = Array.from(
    new Set(widgets.map((w) => w.category).filter((c): c is WidgetCategory => !!c))
  ).map((c) => ({ value: c, label: WIDGET_CATEGORY_LABELS[c] ?? c }))

  // ── Keyboard shortcuts (scoped to the widget section) ──
  const handleSectionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Undo — Ctrl/Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        store.undo(role, userId)
        return
      }
      // Redo — Ctrl/Cmd+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault()
        store.redo(role, userId)
        return
      }
      // Focus mode — Shift+F
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        store.setFocusMode(role, userId, !focusMode)
        return
      }
      // "/" focuses widget search (only when not already in an input)
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        document.getElementById(searchInputId)?.focus()
      }
    },
    [role, userId, store, focusMode, searchInputId]
  )

  // Global Escape exits focus mode
  useEffect(() => {
    if (!focusMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.setFocusMode(role, userId, false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusMode, role, userId, store])

  // Sort by y position, then apply visibility + filters
  const query = search.trim().toLowerCase()
  const visiblePositions = [...layout]
    .sort((a, b) => a.y - b.y)
    .filter((pos) => {
      const widget = widgets.find((w) => w.id === pos.id)
      if (!widget) return false
      if (pos.hidden) return false
      if (focusMode && !(pos.favorite || pos.pinned)) return false
      if (favoritesOnly && !pos.favorite) return false
      if (category !== 'all' && widget.category !== category) return false
      if (
        query &&
        !(
          widget.title.toLowerCase().includes(query) ||
          (widget.description ?? '').toLowerCase().includes(query) ||
          (widget.category ?? '').toLowerCase().includes(query)
        )
      ) {
        return false
      }
      return true
    })

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
      <div className={cn('grid grid-cols-4 gap-4 md:grid-cols-8 xl:grid-cols-12', className)}>
        {widgets.map((w) => (
          <div
            key={w.id}
            className={cn('col-span-4', SPAN_CLASSES[w.defaultPosition.w] ?? 'md:col-span-8 xl:col-span-8')}
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

  const activeFilters =
    (search.trim() ? 1 : 0) +
    (category !== 'all' ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (focusMode ? 1 : 0)

  return (
    <section
      ref={sectionRef}
      aria-label={ariaLabel ?? 'Dashboard widgets'}
      onKeyDown={handleSectionKeyDown}
      className="space-y-3"
    >
      <WidgetToolbar
        role={role}
        userId={userId}
        widgetCount={widgets.length}
        defaultLayout={defaultLayout}
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        onOpenMarketplace={() => setMarketplaceOpen(true)}
        focusMode={focusMode}
        onToggleFocusMode={() => store.setFocusMode(role, userId, !focusMode)}
        searchInputId={searchInputId}
      />

      {focusMode && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-2.5"
        >
          <p className="text-[12px] text-cyan-200/90">
            Focus mode — showing favorites and pinned widgets only. Press{' '}
            <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1 font-mono text-[10px]">
              Esc
            </kbd>{' '}
            to exit.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-cyan-400/30 bg-cyan-400/10 text-[11px] text-cyan-200"
            onClick={() => store.setFocusMode(role, userId, false)}
          >
            Exit focus
          </Button>
        </div>
      )}

      {visiblePositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <Maximize2 className="h-5 w-5 text-foreground/50" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground/80">
            {activeFilters > 0 ? 'No widgets match your filters' : 'No widgets on this dashboard'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {activeFilters > 0
              ? 'Try clearing the search or category filter — or check the favorites filter.'
              : 'Open the marketplace to add widgets and build your perfect dashboard.'}
          </p>
          <div className="mt-4 flex gap-2">
            {activeFilters > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => {
                  setSearch('')
                  setCategory('all')
                  setFavoritesOnly(false)
                  store.setFocusMode(role, userId, false)
                }}
              >
                Clear filters
              </Button>
            )}
            <Button size="sm" className="h-8 text-[12px]" onClick={() => setMarketplaceOpen(true)}>
              Open marketplace
            </Button>
          </div>
        </div>
      ) : (
        <div
          ref={dragImageRef}
          role="list"
          aria-label={ariaLabel}
          className={cn('grid grid-cols-4 gap-4 md:grid-cols-8 xl:grid-cols-12', className)}
        >
          {visiblePositions.map((pos, idx) => {
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
                total={visiblePositions.length}
                onDragStart={handleDragStart(widget.id)}
                onDragOver={handleDragOver(widget.id)}
                onDrop={handleDrop(widget.id)}
                isDragging={draggingId === widget.id}
                isDragOver={dragOverId === widget.id}
                onFullscreen={setFullscreenWidget}
              />
            )
          })}
        </div>
      )}

      {/* Hidden-widget count hint */}
      {storedLayout.some((p) => p.hidden) && activeFilters === 0 && !focusMode && (
        <p className="text-center text-[11px] text-muted-foreground">
          {storedLayout.filter((p) => p.hidden).length} hidden ·{' '}
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={() => setMarketplaceOpen(true)}
          >
            manage in marketplace
          </button>
        </p>
      )}

      <WidgetMarketplace
        open={marketplaceOpen}
        onOpenChange={setMarketplaceOpen}
        widgets={widgets}
        layout={storedLayout}
        role={role}
        userId={userId}
      />

      <AnimatePresence>
        {fullscreenWidget && (
          <FullscreenWidgetOverlay
            widget={fullscreenWidget}
            onExit={() => setFullscreenWidget(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────
// Widget Skeleton — used while data is loading
// ──────────────────────────────────────────────────────────────

export function WidgetSkeleton({ width = 6 }: { width?: number }) {
  return (
    <div
      className={cn(
        'col-span-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111111] p-4 space-y-3',
        SPAN_CLASSES[width] ?? SPAN_CLASSES[6]
      )}
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
        <Icon className="h-5 w-5 text-foreground/60" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-xs text-foreground/60 mt-1 max-w-sm">{description}</p>
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
      <p className="text-xs text-foreground/60 mt-1 max-w-sm font-mono">{msg}</p>
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
