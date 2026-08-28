'use client';

// ============================================================================
// ExamForge AI — Global Search Provider
// ============================================================================
// A wrapper component that provides React Context for the Global Search,
// allowing any component in the tree to trigger search via the
// `useGlobalSearch()` hook. Registers Cmd+K keyboard shortcut at the app level.
// ============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { GlobalSearch } from '@/components/search/global-search';

// ──────────────────────────────────────────────────────────────
// Context Types
// ──────────────────────────────────────────────────────────────

interface GlobalSearchContextValue {
  /** Whether the search palette is currently open */
  isOpen: boolean;
  /** Open the search palette */
  openSearch: () => void;
  /** Close the search palette */
  closeSearch: () => void;
  /** Toggle the search palette */
  toggleSearch: () => void;
}

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// Provider Props
// ──────────────────────────────────────────────────────────────

interface GlobalSearchProviderProps {
  children: ReactNode;
}

// ──────────────────────────────────────────────────────────────
// Provider Component
// ──────────────────────────────────────────────────────────────

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // ── Open / Close / Toggle ──
  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);
  const toggleSearch = useCallback(() => setIsOpen((prev) => !prev), []);

  // ── Register Cmd+K / Ctrl+K keyboard shortcut ──
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // ── Context value ──
  const contextValue: GlobalSearchContextValue = {
    isOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };

  return (
    <GlobalSearchContext.Provider value={contextValue}>
      {children}
      <GlobalSearch open={isOpen} onOpenChange={setIsOpen} />
    </GlobalSearchContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

/**
 * Access the Global Search context from any component within the provider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openSearch, closeSearch } = useGlobalSearch();
 *
 *   return (
 *     <button onClick={openSearch}>Search (⌘K)</button>
 *   );
 * }
 * ```
 */
export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext);

  if (!context) {
    throw new Error(
      'useGlobalSearch must be used within a <GlobalSearchProvider>. ' +
        'Wrap your app or layout with <GlobalSearchProvider> to enable global search.'
    );
  }

  return context;
}

// ──────────────────────────────────────────────────────────────
// Safe Hook (returns null context outside provider)
// ──────────────────────────────────────────────────────────────

/**
 * Safe version of useGlobalSearch that returns null instead of throwing
 * when used outside the provider. Useful for optional integration.
 */
export function useGlobalSearchSafe(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}

export default GlobalSearchProvider;
