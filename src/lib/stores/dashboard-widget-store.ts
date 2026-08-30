'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// ExamForge AI — Dashboard Widget Store 3.0
// ============================================================================
// Tracks per-role widget layouts:
//   - which widgets are visible / hidden / favorites
//   - their grid positions (x, y, w, h)
//   - pinned / collapsed state
//   - multiple named saved layouts (save / switch / delete)
//   - undo / redo history (session-scoped)
//   - focus mode (only favorites + pinned visible)
//
// Persisted per role+userId so each user has their own custom dashboard.
// Falls back to default layout if no preference stored.
//
// WCAG: all state mutations are exposed to the WidgetGrid controls with
// aria-labels; undo/redo also bound to Ctrl+Z / Ctrl+Shift+Z.
// ============================================================================

export interface WidgetPosition {
  id: string
  // grid coordinates (1-indexed for clarity)
  x: number
  y: number // row position — ordering
  w: number // width in columns (1–12)
  h: number // height in rows
  pinned: boolean
  collapsed: boolean
  /** Hidden via widget marketplace — stays in layout so it can be re-shown */
  hidden?: boolean
  /** Favorited widget — sorts to top, always visible in focus mode */
  favorite?: boolean
}

export type WidgetLayout = WidgetPosition[]

export interface SavedWidgetLayout {
  name: string
  createdAt: string
  layout: WidgetLayout
}

const HISTORY_LIMIT = 30

interface HistoryEntry {
  past: WidgetLayout[]
  future: WidgetLayout[]
}

interface DashboardWidgetState {
  // Keyed by `${role}:${userId}` (or `${role}:default` for fallback)
  layouts: Record<string, WidgetLayout>
  /** Named saved layouts per user key */
  savedLayouts: Record<string, SavedWidgetLayout[]>
  /** Session-scoped undo/redo stacks per user key (not persisted) */
  history: Record<string, HistoryEntry>
  /** Focus mode per user key — only favorites + pinned widgets visible */
  focusMode: Record<string, boolean>

  getLayout: (role: string, userId: string) => WidgetLayout
  /** True when a layout entry EXISTS for this user (even if empty after removing all widgets) */
  hasLayout: (role: string, userId: string) => boolean
  setLayout: (role: string, userId: string, layout: WidgetLayout) => void
  updateWidget: (
    role: string,
    userId: string,
    widgetId: string,
    updates: Partial<WidgetPosition>
  ) => void
  toggleWidgetPin: (role: string, userId: string, widgetId: string) => void
  toggleWidgetCollapse: (role: string, userId: string, widgetId: string) => void
  removeWidget: (role: string, userId: string, widgetId: string) => void
  resetLayout: (role: string, userId: string, defaultLayout: WidgetLayout) => void
  moveWidget: (
    role: string,
    userId: string,
    widgetId: string,
    direction: 'up' | 'down'
  ) => void

  // ── Widget marketplace / visibility ──
  addWidget: (role: string, userId: string, position: WidgetPosition) => void
  hideWidget: (role: string, userId: string, widgetId: string) => void
  showWidget: (role: string, userId: string, widgetId: string) => void
  toggleWidgetFavorite: (role: string, userId: string, widgetId: string) => void

  // ── Undo / redo ──
  undo: (role: string, userId: string) => void
  redo: (role: string, userId: string) => void

  // ── Saved layouts ──
  getSavedLayouts: (role: string, userId: string) => SavedWidgetLayout[]
  saveLayoutAs: (role: string, userId: string, name: string) => boolean
  loadSavedLayout: (role: string, userId: string, name: string) => void
  deleteSavedLayout: (role: string, userId: string, name: string) => void

  // ── Focus mode ──
  setFocusMode: (role: string, userId: string, on: boolean) => void
  getFocusMode: (role: string, userId: string) => boolean

  _hydrated: boolean
  setHydrated: () => void
}

/** Push the current layout onto the past stack (mutating draft helper). */
function withHistory(
  state: DashboardWidgetState,
  key: string,
  previous: WidgetLayout
): Partial<DashboardWidgetState> {
  const entry = state.history[key] ?? { past: [], future: [] }
  return {
    history: {
      ...state.history,
      [key]: {
        past: [...entry.past.slice(-(HISTORY_LIMIT - 1)), previous],
        future: [],
      },
    },
  }
}

export const useDashboardWidgetStore = create<DashboardWidgetState>()(
  persist(
    (set, get) => ({
      layouts: {},
      savedLayouts: {},
      history: {},
      focusMode: {},

      getLayout: (role, userId) => {
        const key = `${role}:${userId}`
        return get().layouts[key] ?? []
      },

      hasLayout: (role, userId) =>
        Object.prototype.hasOwnProperty.call(get().layouts, `${role}:${userId}`),

      setLayout: (role, userId, layout) =>
        set((s) => {
          const key = `${role}:${userId}`
          return {
            layouts: { ...s.layouts, [key]: layout },
            ...withHistory(s, key, s.layouts[key] ?? []),
          }
        }),

      updateWidget: (role, userId, widgetId, updates) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, ...updates } : w
              ),
            },
            ...withHistory(s, key, current),
          }
        }),

      toggleWidgetPin: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, pinned: !w.pinned } : w
              ),
            },
            ...withHistory(s, key, current),
          }
        }),

      toggleWidgetCollapse: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w
              ),
            },
            // collapse is a view toggle — do NOT pollute undo history
            ...{},
          }
        }),

      removeWidget: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.filter((w) => w.id !== widgetId),
            },
            ...withHistory(s, key, current),
          }
        }),

      resetLayout: (role, userId, defaultLayout) =>
        set((s) => {
          const key = `${role}:${userId}`
          return {
            layouts: { ...s.layouts, [key]: defaultLayout },
            // Reset is undoable like any other layout change
            ...withHistory(s, key, s.layouts[key] ?? []),
          }
        }),

      moveWidget: (role, userId, widgetId, direction) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = [...(s.layouts[key] ?? [])].sort((a, b) => a.y - b.y)
          const idx = current.findIndex((w) => w.id === widgetId)
          if (idx === -1) return s
          const swapWith = direction === 'up' ? idx - 1 : idx + 1
          if (swapWith < 0 || swapWith >= current.length) return s
          // Swap y values
          const a = current[idx]
          const b = current[swapWith]
          const ay = a.y
          a.y = b.y
          b.y = ay
          return {
            layouts: { ...s.layouts, [key]: current },
            ...withHistory(s, key, s.layouts[key] ?? []),
          }
        }),

      // ── Marketplace / visibility ──

      addWidget: (role, userId, position) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          if (current.some((w) => w.id === position.id)) {
            // Already in layout — un-hide instead of duplicating
            return {
              layouts: {
                ...s.layouts,
                [key]: current.map((w) =>
                  w.id === position.id ? { ...w, hidden: false } : w
                ),
              },
              ...withHistory(s, key, current),
            }
          }
          const maxY = current.reduce((m, w) => Math.max(m, w.y), 0)
          return {
            layouts: {
              ...s.layouts,
              [key]: [...current, { ...position, y: maxY + 1, hidden: false }],
            },
            ...withHistory(s, key, current),
          }
        }),

      hideWidget: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, hidden: true } : w
              ),
            },
            ...withHistory(s, key, current),
          }
        }),

      showWidget: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, hidden: false } : w
              ),
            },
            ...withHistory(s, key, current),
          }
        }),

      toggleWidgetFavorite: (role, userId, widgetId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const current = s.layouts[key] ?? []
          return {
            layouts: {
              ...s.layouts,
              [key]: current.map((w) =>
                w.id === widgetId ? { ...w, favorite: !w.favorite } : w
              ),
            },
            // favorites are a soft preference — no undo pollution
          }
        }),

      // ── Undo / redo ──

      undo: (role, userId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const entry = s.history[key]
          if (!entry || entry.past.length === 0) return s
          const previous = entry.past[entry.past.length - 1]
          const current = s.layouts[key] ?? []
          return {
            layouts: { ...s.layouts, [key]: previous },
            history: {
              ...s.history,
              [key]: {
                past: entry.past.slice(0, -1),
                future: [current, ...entry.future].slice(0, HISTORY_LIMIT),
              },
            },
          }
        }),

      redo: (role, userId) =>
        set((s) => {
          const key = `${role}:${userId}`
          const entry = s.history[key]
          if (!entry || entry.future.length === 0) return s
          const next = entry.future[0]
          const current = s.layouts[key] ?? []
          return {
            layouts: { ...s.layouts, [key]: next },
            history: {
              ...s.history,
              [key]: {
                past: [...entry.past, current].slice(-HISTORY_LIMIT),
                future: entry.future.slice(1),
              },
            },
          }
        }),

      // ── Saved layouts ──

      getSavedLayouts: (role, userId) =>
        get().savedLayouts[`${role}:${userId}`] ?? [],

      saveLayoutAs: (role, userId, name) => {
        const key = `${role}:${userId}`
        const current = get().layouts[key] ?? []
        if (current.length === 0) return false
        const clean = name.trim().slice(0, 40)
        if (!clean) return false
        set((s) => {
          const existing = s.savedLayouts[key] ?? []
          // Overwrite same-named layout
          const filtered = existing.filter((l) => l.name !== clean)
          return {
            savedLayouts: {
              ...s.savedLayouts,
              [key]: [
                ...filtered,
                { name: clean, createdAt: new Date().toISOString(), layout: current },
              ],
            },
          }
        })
        return true
      },

      loadSavedLayout: (role, userId, name) =>
        set((s) => {
          const key = `${role}:${userId}`
          const found = (s.savedLayouts[key] ?? []).find((l) => l.name === name)
          if (!found) return s
          return {
            layouts: { ...s.layouts, [key]: found.layout },
            ...withHistory(s, key, s.layouts[key] ?? []),
          }
        }),

      deleteSavedLayout: (role, userId, name) =>
        set((s) => {
          const key = `${role}:${userId}`
          return {
            savedLayouts: {
              ...s.savedLayouts,
              [key]: (s.savedLayouts[key] ?? []).filter((l) => l.name !== name),
            },
          }
        }),

      // ── Focus mode ──

      setFocusMode: (role, userId, on) =>
        set((s) => ({
          focusMode: { ...s.focusMode, [`${role}:${userId}`]: on },
        })),

      getFocusMode: (role, userId) => get().focusMode[`${role}:${userId}`] ?? false,

      _hydrated: false,
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'examforge-dashboard-widgets',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        layouts: state.layouts,
        savedLayouts: state.savedLayouts,
        focusMode: state.focusMode,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
)
