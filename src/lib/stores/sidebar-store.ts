'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// ExamForge AI — Sidebar State Store (Enterprise)
// ============================================================================
// Tracks everything the enterprise sidebar needs:
// - collapse mode (expanded / collapsed / floating / pinned)
// - width (resizable, 220–360px)
// - hover-to-expand (when collapsed, expand on hover)
// - auto-collapse on small screens
// - favorites (user-pinned items)
// - recent pages (auto-tracked, last 8)
// - search query (in-sidebar fuzzy search)
// - context menu (right-click) state
// - mobile drawer open state
// - keyboard shortcut indicator
// - collapsed section labels (nested folders, persisted)
// - active workspace id (workspace switcher, persisted)
//
// Persisted to localStorage so the sidebar "remembers" the user's preferences
// across sessions and tabs.
// ============================================================================

export type SidebarMode = 'expanded' | 'collapsed' | 'floating' | 'pinned'

export interface RecentPage {
  path: string
  title: string
  ts: number
}

interface SidebarState {
  // ─── Layout ───
  mode: SidebarMode
  width: number // px when expanded (220–360)
  collapsedWidth: number // px when collapsed (52–72)
  hoverToExpand: boolean // when collapsed, expand on hover
  autoCollapseBelow: number // viewport width threshold for auto-collapse

  // ─── Mobile ───
  mobileOpen: boolean

  // ─── User data ───
  favorites: string[] // route paths the user has starred
  recent: RecentPage[] // most-recently-visited pages

  // ─── Search ───
  searchQuery: string

  // ─── Nested folders ───
  collapsedSections: string[] // section labels the user has collapsed

  // ─── Workspace ───
  activeWorkspace: string // id of the active workspace (role context)

  // ─── Actions ───
  setMode: (mode: SidebarMode) => void
  toggleCollapsed: () => void
  setWidth: (w: number) => void
  setHoverToExpand: (b: boolean) => void
  setMobileOpen: (b: boolean) => void
  toggleMobile: () => void

  addFavorite: (path: string) => void
  removeFavorite: (path: string) => void
  toggleFavorite: (path: string) => void
  isFavorite: (path: string) => boolean
  /** Reorder favorites via drag-and-drop (moves `path` to `toIndex`) */
  reorderFavorites: (path: string, toIndex: number) => void

  trackRecent: (page: RecentPage) => void
  clearRecent: () => void

  setSearchQuery: (q: string) => void

  toggleSectionCollapse: (label: string) => void
  isSectionCollapsed: (label: string) => boolean

  setActiveWorkspace: (id: string) => void

  // Hydration flag — true once we've loaded from storage
  _hydrated: boolean
  setHydrated: () => void
}

const MAX_RECENT = 8

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // ─── Layout defaults ───
      mode: 'expanded',
      width: 240,
      collapsedWidth: 56,
      hoverToExpand: true,
      autoCollapseBelow: 1024,

      // ─── Mobile ───
      mobileOpen: false,

      // ─── User data ───
      favorites: [],
      recent: [],

      // ─── Search ───
      searchQuery: '',

      // ─── Nested folders ───
      collapsedSections: [],

      // ─── Workspace ───
      activeWorkspace: 'main',

      setMode: (mode) => set({ mode }),
      toggleCollapsed: () =>
        set((s) => ({
          mode:
            s.mode === 'expanded'
              ? 'collapsed'
              : s.mode === 'collapsed'
                ? 'expanded'
                : s.mode === 'floating'
                  ? 'pinned'
                  : 'expanded',
        })),
      setWidth: (width) =>
        set({ width: Math.max(220, Math.min(360, Math.round(width))) }),
      setHoverToExpand: (hoverToExpand) => set({ hoverToExpand }),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
      toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),

      addFavorite: (path) =>
        set((s) =>
          s.favorites.includes(path)
            ? s
            : { favorites: [...s.favorites, path] }
        ),
      removeFavorite: (path) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f !== path) })),
      toggleFavorite: (path) =>
        set((s) => ({
          favorites: s.favorites.includes(path)
            ? s.favorites.filter((f) => f !== path)
            : [...s.favorites, path],
        })),
      isFavorite: (path) => get().favorites.includes(path),
      reorderFavorites: (path, toIndex) =>
        set((s) => {
          const fromIndex = s.favorites.indexOf(path)
          if (fromIndex === -1 || toIndex < 0 || toIndex >= s.favorites.length) return s
          const next = [...s.favorites]
          next.splice(fromIndex, 1)
          next.splice(toIndex, 0, path)
          return { favorites: next }
        }),

      trackRecent: (page) =>
        set((s) => {
          // Dedupe + move to top + cap at MAX_RECENT
          const filtered = s.recent.filter((r) => r.path !== page.path)
          return { recent: [page, ...filtered].slice(0, MAX_RECENT) }
        }),
      clearRecent: () => set({ recent: [] }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      toggleSectionCollapse: (label) =>
        set((s) => ({
          collapsedSections: s.collapsedSections.includes(label)
            ? s.collapsedSections.filter((l) => l !== label)
            : [...s.collapsedSections, label],
        })),
      isSectionCollapsed: (label) => get().collapsedSections.includes(label),

      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),

      _hydrated: false,
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'examforge-sidebar-state',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient state
      partialize: (s) => ({
        mode: s.mode,
        width: s.width,
        collapsedWidth: s.collapsedWidth,
        hoverToExpand: s.hoverToExpand,
        favorites: s.favorites,
        recent: s.recent,
        collapsedSections: s.collapsedSections,
        activeWorkspace: s.activeWorkspace,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
