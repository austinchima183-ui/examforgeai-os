'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardWidgetStore, type WidgetLayout } from '@/lib/stores/dashboard-widget-store'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { cn } from '@/lib/utils'
import {
  Bookmark,
  Check,
  CloudOff,
  Focus,
  LayoutGrid,
  ListRestart,
  Redo2,
  Save,
  Search,
  Star,
  Trash2,
  Undo2,
  Wifi,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Widget Toolbar (Dashboard UX 3.0)
// ============================================================================
// Command strip above the widget grid:
//   Search · category filter · favorites filter · marketplace · saved layouts
//   undo / redo · focus mode · reset · autosave + connection indicators
// WCAG: labelled inputs, aria-pressed toggles, keyboard operable, live regions.
// ============================================================================

export interface WidgetToolbarProps {
  role: string
  userId: string
  widgetCount: number
  defaultLayout: WidgetLayout
  /** Current search query (filters grid) */
  search: string
  onSearchChange: (q: string) => void
  /** Active category filter */
  category: string | 'all'
  onCategoryChange: (c: string | 'all') => void
  categories: Array<{ value: string; label: string }>
  favoritesOnly: boolean
  onFavoritesOnlyChange: (v: boolean) => void
  onOpenMarketplace: () => void
  focusMode: boolean
  onToggleFocusMode: () => void
  searchInputId: string
}

const ONBOARDING_FLAG = 'examforge-widget-onboarded-v3'

export function WidgetToolbar({
  role,
  userId,
  widgetCount,
  defaultLayout,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  favoritesOnly,
  onFavoritesOnlyChange,
  onOpenMarketplace,
  focusMode,
  onToggleFocusMode,
  searchInputId,
}: WidgetToolbarProps) {
  const store = useDashboardWidgetStore()
  const { online } = useOnlineStatus()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [savedName, setSavedName] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = `${role}:${userId}`
  const history = store.history[key]
  const canUndo = !!history && history.past.length > 0
  const canRedo = !!history && history.future.length > 0
  const savedLayouts = store.getSavedLayouts(role, userId)

  // ── Smart onboarding: show the coach card exactly once per browser ──
  // Deferred until the user's FIRST interaction (pointer/scroll/keypress):
  // revealing a large card post-hydration otherwise becomes the page's LCP
  // element, and interrupting the user's initial orientation is worse UX.
  useEffect(() => {
    let seen = false
    try {
      seen = !!localStorage.getItem(ONBOARDING_FLAG)
    } catch {
      /* private mode — skip */
    }
    if (seen) return
    const events: Array<keyof DocumentEventMap> = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']
    const opts: AddEventListenerOptions = { passive: true }
    const reveal = () => {
      setShowOnboarding(true)
      events.forEach((e) => document.removeEventListener(e, reveal, opts))
    }
    events.forEach((e) => document.addEventListener(e, reveal, opts))
    return () => events.forEach((e) => document.removeEventListener(e, reveal, opts))
  }, [])

  const dismissOnboarding = () => {
    setShowOnboarding(false)
    try {
      localStorage.setItem(ONBOARDING_FLAG, '1')
    } catch {
      /* ignore */
    }
  }

  // ── Autosave indicator: flashes "Saved" briefly after any layout change ──
  const layoutSignature = JSON.stringify(store.layouts[key] ?? [])
  useEffect(() => {
    if (!store._hydrated) return
    setJustSaved(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setJustSaved(false), 1600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [layoutSignature, store._hydrated])

  const handleSave = () => {
    if (store.saveLayoutAs(role, userId, savedName || `Layout ${savedLayouts.length + 1}`)) {
      setSavedName('')
      setSaveOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-40 flex-1 sm:max-w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchInputId}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search widgets…"
            aria-label="Search dashboard widgets"
            className="h-8 pl-8 text-[13px] bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1" role="group" aria-label="Filter widgets by category">
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              aria-pressed={category === 'all'}
              className={cn(
                'h-8 rounded-lg border px-2.5 text-[11px] font-medium transition-colors',
                category === 'all'
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onCategoryChange(c.value)}
                aria-pressed={category === c.value}
                className={cn(
                  'h-8 rounded-lg border px-2.5 text-[11px] font-medium transition-colors',
                  category === c.value
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Favorites filter */}
        <Button
          variant="outline"
          size="sm"
          aria-pressed={favoritesOnly}
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={cn(
            'h-8 gap-1.5 border-white/[0.08] bg-white/[0.02] text-[11px]',
            favoritesOnly && 'border-forge-gold/40 bg-forge-gold/10 text-forge-gold'
          )}
        >
          <Star className={cn('h-3 w-3', favoritesOnly && 'fill-forge-gold')} aria-hidden="true" />
          Favorites
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Undo / redo */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02]" role="group" aria-label="Layout history">
            <button
              type="button"
              onClick={() => store.undo(role, userId)}
              disabled={!canUndo}
              aria-label="Undo layout change (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
              className="flex h-8 w-8 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="h-4 w-px bg-white/[0.08]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => store.redo(role, userId)}
              disabled={!canRedo}
              aria-label="Redo layout change (Ctrl+Shift+Z)"
              title="Redo (Ctrl+Shift+Z)"
              className="flex h-8 w-8 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Focus mode */}
          <Button
            variant="outline"
            size="sm"
            aria-pressed={focusMode}
            onClick={onToggleFocusMode}
            title="Focus mode — show favorites and pinned only (Shift+F)"
            className={cn(
              'h-8 gap-1.5 border-white/[0.08] bg-white/[0.02] text-[11px]',
              focusMode && 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
            )}
          >
            <Focus className="h-3 w-3" aria-hidden="true" />
            Focus
          </Button>

          {/* Saved layouts */}
          <DropdownMenu open={saveOpen} onOpenChange={setSaveOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/[0.08] bg-white/[0.02] text-[11px]"
                aria-label="Saved layouts menu"
              >
                <Bookmark className="h-3 w-3" aria-hidden="true" />
                Layouts
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="flex gap-1.5 p-2">
                <Input
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                  placeholder="New layout name…"
                  aria-label="Name for the new saved layout"
                  className="h-8 flex-1 bg-white/[0.03] border-white/[0.08] text-[12px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                />
                <Button size="sm" className="h-8 px-2.5" onClick={handleSave} aria-label="Save current layout">
                  <Save className="h-3 w-3" aria-hidden="true" />
                  Save
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                Saved layouts
              </DropdownMenuLabel>
              {savedLayouts.length === 0 ? (
                <p className="px-2 pb-2 pt-1 text-[11px] text-muted-foreground">
                  No saved layouts yet — arrange your widgets and save the view.
                </p>
              ) : (
                savedLayouts.map((l) => (
                  <DropdownMenuItem
                    key={l.name}
                    className="group flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => {
                        store.loadSavedLayout(role, userId, l.name)
                        setSaveOpen(false)
                      }}
                    >
                      <LayoutGrid className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate text-[12px]">{l.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {l.layout.filter((w) => !w.hidden).length} widgets
                      </span>
                    </button>
                    <button
                      type="button"
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      onClick={() => store.deleteSavedLayout(role, userId, l.name)}
                      aria-label={`Delete saved layout ${l.name}`}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" aria-hidden="true" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Marketplace */}
          <Button
            size="sm"
            onClick={onOpenMarketplace}
            className="h-8 gap-1.5 text-[11px]"
            aria-label="Open widget marketplace to add or hide widgets"
          >
            <LayoutGrid className="h-3 w-3" aria-hidden="true" />
            Customize
            <span className="rounded bg-black/30 px-1 text-[10px] tabular-nums text-foreground/90">{widgetCount}</span>
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => store.resetLayout(role, userId, defaultLayout)}
            aria-label="Reset dashboard layout to defaults"
            title="Reset to default layout"
          >
            <ListRestart className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Status strip: connection + autosave */}
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span
          className="flex items-center gap-1.5"
          role="status"
          aria-live="polite"
          aria-label={online ? 'Connection online' : 'Connection offline'}
        >
          {online ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              Live
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3 text-amber-400" aria-hidden="true" />
              Offline — showing saved data
            </>
          )}
        </span>
        <span
          className="flex items-center gap-1 transition-opacity"
          style={{ opacity: justSaved ? 1 : 0 }}
          aria-live="polite"
        >
          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
          Layout saved
        </span>
      </div>

      {/* Smart onboarding coach card */}
      {showOnboarding && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground/90">
              Your dashboard is fully customizable
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Drag cards to reorder · right-click a card for options · resize, pin, favorite or
              fullscreen widgets · undo with Ctrl+Z · focus with Shift+F · add or hide widgets from
              the marketplace.
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 shrink-0 text-[11px]" onClick={dismissOnboarding}>
            Got it
          </Button>
        </div>
      )}
    </div>
  )
}
