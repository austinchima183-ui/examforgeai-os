'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// ExamForge AI — Dashboard Widget Store
// ============================================================================
// Tracks per-role widget layouts:
//   - which widgets are visible
//   - their grid positions (x, y, w, h)
//   - which are pinned/favorites
//   - collapsed/expanded state
//
// Persisted per role+userId so each user has their own custom dashboard.
// Falls back to default layout if no preference stored.
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
}

export type WidgetLayout = WidgetPosition[]

interface DashboardWidgetState {
  // Keyed by `${role}:${userId}` (or `${role}:default` for fallback)
  layouts: Record<string, WidgetLayout>

  getLayout: (role: string, userId: string) => WidgetLayout
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

  _hydrated: boolean
  setHydrated: () => void
}

export const useDashboardWidgetStore = create<DashboardWidgetState>()(
  persist(
    (set, get) => ({
      layouts: {},

      getLayout: (role, userId) => {
        const key = `${role}:${userId}`
        return get().layouts[key] ?? []
      },

      setLayout: (role, userId, layout) =>
        set((s) => ({
          layouts: { ...s.layouts, [`${role}:${userId}`]: layout },
        })),

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
          }
        }),

      resetLayout: (role, userId, defaultLayout) =>
        set((s) => ({
          layouts: { ...s.layouts, [`${role}:${userId}`]: defaultLayout },
        })),

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
          }
        }),

      _hydrated: false,
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'examforge-dashboard-widgets',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
)
