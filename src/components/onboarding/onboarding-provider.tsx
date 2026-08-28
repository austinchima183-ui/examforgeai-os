'use client';

// ============================================================================
// ExamForge AI — Onboarding Provider
// ============================================================================
// Wrapper component that checks if the user has completed onboarding.
// If not, it shows the OnboardingWizard automatically over the dashboard.
// After completion, updates Supabase profiles.onboarding_completed = true.
// Provides useOnboarding() hook for programmatic control.
// ============================================================================

import * as React from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { UserRole } from '@/lib/types';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type OnboardingRole = 'student' | 'teacher' | 'school_admin' | 'super_admin';

interface OnboardingContextValue {
  /** Whether the onboarding wizard is currently visible */
  isOnboarding: boolean;
  /** Manually trigger onboarding (e.g., from settings) */
  startOnboarding: () => void;
  /** Mark onboarding as completed and close the wizard */
  completeOnboarding: () => void;
  /** Whether we're still checking onboarding status from the backend */
  isChecking: boolean;
  /** Error message if onboarding check failed */
  error: string | null;
  /** Whether Supabase is available for onboarding operations */
  isSupabaseAvailable: boolean;
}

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}

// ──────────────────────────────────────────────────────────────
// Supabase helpers
// ──────────────────────────────────────────────────────────────

/**
 * Check if the user has completed onboarding by reading the onboarding flag
 * from `users.settings` (jsonb). Returns `true` if completed or if Supabase
 * is unavailable (graceful fallback).
 */
async function checkOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      // Supabase not configured — skip onboarding check gracefully
      console.warn('[OnboardingProvider] Supabase client not available, skipping onboarding check');
      return true;
    }

    const { data, error } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // RLS may deny or the row may be missing — treat as completed to avoid blocking
      console.warn('[OnboardingProvider] Error checking onboarding status:', error.message);
      return true;
    }

    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    return settings.onboarding_completed === true;
  } catch (err) {
    // Any unexpected error — graceful fallback, don't block the user
    console.warn('[OnboardingProvider] Unexpected error checking onboarding:', err);
    return true;
  }
}

/**
 * Mark onboarding as completed in Supabase.
 */
async function markOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.warn('[OnboardingProvider] Supabase client not available, cannot mark onboarding complete');
      return false;
    }

    // Read current settings, merge the onboarding flag, write back.
    // (Per-user single-writer field — read-merge-write is safe here.)
    const { data: current, error: readError } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();

    if (readError) {
      console.warn('[OnboardingProvider] Error reading current settings:', readError.message);
      return false;
    }

    const settings = {
      ...((current?.settings ?? {}) as Record<string, unknown>),
      onboarding_completed: true,
      onboarding_step: null,
    };

    const { error } = await supabase
      .from('users')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.warn('[OnboardingProvider] Error marking onboarding complete:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[OnboardingProvider] Unexpected error marking onboarding complete:', err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Provider Component
// ──────────────────────────────────────────────────────────────

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [isOnboarding, setIsOnboarding] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  const [hasChecked, setHasChecked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check if Supabase is available
  const isSupabaseAvailable = React.useMemo(() => createSupabaseClient() !== null, []);

  // Check onboarding status when auth state resolves
  React.useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // Not authenticated — no onboarding needed
    if (!isAuthenticated || !user) {
      setIsChecking(false);
      setHasChecked(true);
      setIsOnboarding(false);
      return;
    }

    // Parent role doesn't have a dedicated onboarding flow — skip
    if (user.role === 'parent') {
      setIsChecking(false);
      setHasChecked(true);
      setIsOnboarding(false);
      return;
    }

    // Avoid re-checking if we've already determined the status
    if (hasChecked) return;

    let cancelled = false;

    async function check() {
      setIsChecking(true);
      setError(null);
      try {
        const completed = await checkOnboardingCompleted(user!.id);
        if (!cancelled) {
          setIsOnboarding(!completed);
          setIsChecking(false);
          setHasChecked(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check onboarding status.');
          setIsChecking(false);
          setHasChecked(true);
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, user, hasChecked]);

  // ─── Start onboarding manually ───
  const startOnboarding = React.useCallback(() => {
    if (isAuthenticated && user && user.role !== 'parent') {
      setIsOnboarding(true);
    }
  }, [isAuthenticated, user]);

  // ─── Complete onboarding ───
  const completeOnboarding = React.useCallback(async () => {
    if (!user) return;

    // Close the wizard immediately for responsiveness
    setIsOnboarding(false);

    // Update Supabase in the background
    await markOnboardingCompleted(user.id);
  }, [user]);

  // ─── Handle wizard completion ───
  const handleWizardComplete = React.useCallback(
    async (_data: Record<string, unknown>) => {
      await completeOnboarding();
    },
    [completeOnboarding]
  );

  // ─── Handle wizard skip ───
  const handleWizardSkip = React.useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  // ─── Context value ───
  const contextValue = React.useMemo<OnboardingContextValue>(
    () => ({
      isOnboarding,
      startOnboarding,
      completeOnboarding,
      isChecking,
      error,
      isSupabaseAvailable,
    }),
    [isOnboarding, startOnboarding, completeOnboarding, isChecking, error, isSupabaseAvailable]
  );

  // Derive the onboarding role (exclude 'parent' which has no dedicated flow)
  const onboardingRole = user?.role !== 'parent' ? (user?.role as OnboardingRole) : null;

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      {/* Render the wizard overlay when onboarding is active */}
      {isOnboarding && user && onboardingRole && (
        <OnboardingWizard
          role={onboardingRole}
          userId={user.id}
          userName={user.fullName}
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export default OnboardingProvider;
