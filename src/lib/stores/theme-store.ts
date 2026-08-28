// ============================================================================
// ExamForge AI — Theme Store
// ============================================================================
// Re-exports useTheme from next-themes and adds custom extensions for
// font size and reduced motion preferences. These preferences are persisted
// to localStorage for session continuity.
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useTheme } from 'next-themes';

// ──────────────────────────────────────────────────────────────
// Re-export next-themes useTheme
// ──────────────────────────────────────────────────────────────

export { useTheme };

// ──────────────────────────────────────────────────────────────
// Theme Preferences Interface
// ──────────────────────────────────────────────────────────────

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface ThemePreferencesState {
  fontSize: FontSize;
  reducedMotion: boolean;
}

interface ThemePreferencesActions {
  setFontSize: (size: FontSize) => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleReducedMotion: () => void;
}

// ──────────────────────────────────────────────────────────────
// Initial State
// ──────────────────────────────────────────────────────────────

const initialPreferencesState: ThemePreferencesState = {
  fontSize: 'medium',
  reducedMotion: false,
};

// ──────────────────────────────────────────────────────────────
// Theme Preferences Store (persisted)
// ──────────────────────────────────────────────────────────────

export const useThemePreferences = create<ThemePreferencesState & ThemePreferencesActions>()(
  persist(
    (set) => ({
      ...initialPreferencesState,

      setFontSize: (fontSize) =>
        set({ fontSize }),

      setReducedMotion: (reducedMotion) =>
        set({ reducedMotion }),

      toggleReducedMotion: () =>
        set((state) => ({ reducedMotion: !state.reducedMotion })),
    }),
    {
      name: 'examforge-theme-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
