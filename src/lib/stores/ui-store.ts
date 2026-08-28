// ============================================================================
// ExamForge AI — UI Zustand Store
// ============================================================================
// Manages UI state: sidebar visibility, command palette, search, active module,
// and in-app toast notifications. Does NOT persist to localStorage.
// ============================================================================

import { create } from 'zustand';
import type { ActiveModule, Toast } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// UI State Interface
// ──────────────────────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  searchQuery: string;
  activeModule: ActiveModule;
  toasts: Toast[];
}

// ──────────────────────────────────────────────────────────────
// UI Actions Interface
// ──────────────────────────────────────────────────────────────

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveModule: (module: ActiveModule) => void;
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ──────────────────────────────────────────────────────────────
// Initial State
// ──────────────────────────────────────────────────────────────

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  searchQuery: '',
  activeModule: 'dashboard',
  toasts: [],
};

// ──────────────────────────────────────────────────────────────
// Helper: Generate unique toast ID
// ──────────────────────────────────────────────────────────────

let toastCounter = 0;
function generateToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

// ──────────────────────────────────────────────────────────────
// UI Store
// ──────────────────────────────────────────────────────────────

export const useUIStore = create<UIState & UIActions>()((set) => ({
  ...initialState,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setCommandPaletteOpen: (open) =>
    set({ commandPaletteOpen: open }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setActiveModule: (activeModule) =>
    set({ activeModule }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: generateToastId(),
          createdAt: Date.now(),
        },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () =>
    set({ toasts: [] }),
}));
