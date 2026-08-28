// ============================================================================
// ExamForge AI — Auth Zustand Store
// ============================================================================
// Manages authentication state including user info, role, email verification,
// and loading states. Persists role to localStorage for session continuity.
// ============================================================================

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Auth State Interface
// ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
}

// ──────────────────────────────────────────────────────────────
// Auth Actions Interface
// ──────────────────────────────────────────────────────────────

interface AuthActions {
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setEmailVerified: (verified: boolean) => void;
  initialize: (user: User) => void;
}

// ──────────────────────────────────────────────────────────────
// Initial State
// ──────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isEmailVerified: false,
};

// ──────────────────────────────────────────────────────────────
// Auth Store
// ──────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setUser: (user) =>
          set(
            (state) => ({
              user,
              isAuthenticated: user !== null,
              role: user?.role ?? state.role,
              isEmailVerified: user?.isEmailVerified ?? false,
            }),
            false,
            'setUser'
          ),

        setRole: (role) =>
          set({ role }, false, 'setRole'),

        clearAuth: () =>
          set(
            {
              user: null,
              role: null,
              isAuthenticated: false,
              isLoading: false,
              isEmailVerified: false,
            },
            false,
            'clearAuth'
          ),

        setLoading: (isLoading) =>
          set({ isLoading }, false, 'setLoading'),

        setEmailVerified: (isEmailVerified) =>
          set({ isEmailVerified }, false, 'setEmailVerified'),

        initialize: (user) =>
          set(
            {
              user,
              role: user.role,
              isAuthenticated: true,
              isLoading: false,
              isEmailVerified: user.isEmailVerified,
            },
            false,
            'initialize'
          ),
      }),
      {
        name: 'examforge-auth-storage',
        storage: createJSONStorage(() => localStorage),
        // Only persist the role so it survives page refreshes.
        // Full user data is re-fetched on initialization.
        partialize: (state) => ({
          role: state.role,
        }),
        // On rehydration, merge persisted role back into state
        // but keep isLoading true until the app initializes the session.
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(persistedState as Partial<AuthState>),
          isLoading: true,
        }),
      }
    ),
    {
      name: 'AuthStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
