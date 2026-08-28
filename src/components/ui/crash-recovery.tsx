'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Constants ───────────────────────────────────────────────────────────────

const CRASH_STATE_KEY = 'examforge:crash-recovery';
const CRASH_MARKER_KEY = 'examforge:app-loaded';
const SESSION_STATE_KEY = 'examforge:session-state';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrashRecoveryState {
  /** When the session was saved */
  savedAt: string;
  /** The URL the user was on */
  pathname: string;
  /** Critical application state */
  state: Record<string, unknown>;
  /** Version of the app (for migration checks) */
  version?: string;
}

export interface CrashRecoveryProps {
  /** Called when user chooses to restore session */
  onRestore: (_state: CrashRecoveryState) => void;
  /** Called when user chooses to start fresh */
  onStartFresh: () => void;
  /** App version for migration checks */
  appVersion?: string;
  /** State to persist on each render/interval */
  stateToPersist?: Record<string, unknown>;
  /** Current pathname */
  pathname?: string;
  /** Auto-persist interval in ms (default: 30000 = 30s) */
  persistInterval?: number;
  /** Custom title for the recovery dialog */
  title?: string;
  /** Custom description for the recovery dialog */
  description?: string;
  /** Children to render alongside the recovery system */
  children?: React.ReactNode;
}

// ─── State Persistence ───────────────────────────────────────────────────────

export function persistCriticalState(state: CrashRecoveryState): void {
  try {
    localStorage.setItem(CRASH_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function retrieveCriticalState(): CrashRecoveryState | null {
  try {
    const raw = localStorage.getItem(CRASH_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrashRecoveryState;
  } catch {
    return null;
  }
}

export function clearCriticalState(): void {
  try {
    localStorage.removeItem(CRASH_STATE_KEY);
    localStorage.removeItem(CRASH_MARKER_KEY);
    localStorage.removeItem(SESSION_STATE_KEY);
  } catch {
    // Ignore
  }
}

// ─── Crash Detection ─────────────────────────────────────────────────────────

/**
 * Sets a marker that the app has loaded.
 * If this marker exists on the NEXT load, it means the previous session crashed
 * (because we normally remove it on clean unload).
 */
function setAppLoadedMarker(): void {
  try {
    sessionStorage.setItem(CRASH_MARKER_KEY, Date.now().toString());
  } catch {
    // Ignore
  }
}

function clearAppLoadedMarker(): void {
  try {
    sessionStorage.removeItem(CRASH_MARKER_KEY);
  } catch {
    // Ignore
  }
}

function hasCrashMarker(): boolean {
  try {
    return sessionStorage.getItem(CRASH_MARKER_KEY) !== null;
  } catch {
    return false;
  }
}

// ─── CrashRecovery Component ─────────────────────────────────────────────────

export function CrashRecovery({
  onRestore,
  onStartFresh,
  appVersion,
  stateToPersist,
  pathname = '',
  persistInterval = 30000,
  title = 'Session Recovery',
  description = 'ExamForge detected that your previous session ended unexpectedly. Would you like to restore your previous session or start fresh?',
  children,
}: CrashRecoveryProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [recoveredState, setRecoveredState] = useState<CrashRecoveryState | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Detect crash on mount ─────────────────────────────────────────────
  useEffect(() => {
    const crashed = hasCrashMarker();
    const savedState = retrieveCriticalState();

    if (crashed && savedState) {
      // Use microtask to avoid sync setState in effect
      queueMicrotask(() => {
        setRecoveredState(savedState);
        setShowDialog(true);
      });
    }

    // Set the loaded marker for next time
    setAppLoadedMarker();

    return () => {
      // Clean unload — clear the crash marker
      clearAppLoadedMarker();
    };
  }, []);

  // ─── Periodic state persistence ────────────────────────────────────────
  useEffect(() => {
    if (!stateToPersist) return;

    const doPersist = () => {
      persistCriticalState({
        savedAt: new Date().toISOString(),
        pathname,
        state: stateToPersist,
        version: appVersion,
      });
    };

    // Persist immediately
    doPersist();

    // Then persist on interval
    persistTimerRef.current = setInterval(doPersist, persistInterval);

    // Also persist before unload
    const handleBeforeUnload = () => {
      doPersist();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (persistTimerRef.current) clearInterval(persistTimerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stateToPersist, pathname, appVersion, persistInterval]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleRestore = useCallback(() => {
    if (recoveredState) {
      onRestore(recoveredState);
    }
    setShowDialog(false);
    clearCriticalState();
  }, [recoveredState, onRestore]);

  const handleStartFresh = useCallback(() => {
    onStartFresh();
    setShowDialog(false);
    clearCriticalState();
  }, [onStartFresh]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showDialog && (
          <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>{title}</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>{description}</p>
                    {recoveredState && (
                      <p className="text-xs text-muted-foreground">
                        Last saved: {new Date(recoveredState.savedAt).toLocaleString()}
                        {recoveredState.pathname && (
                          <> · Page: {recoveredState.pathname}</>
                        )}
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleStartFresh}>
                    Start Fresh
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestore}>
                    Restore Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </motion.div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── useCrashRecovery Hook ───────────────────────────────────────────────────

/**
 * Lower-level hook for crash recovery without UI.
 * Useful when you want to build your own recovery UI.
 */
export function useCrashRecovery() {
  const [hasCrashed, setHasCrashed] = useState(false);
  const [savedState, setSavedState] = useState<CrashRecoveryState | null>(null);

  useEffect(() => {
    const crashed = hasCrashMarker();
    const state = retrieveCriticalState();

    // Use microtask to avoid sync setState in effect body
    const crashedResult = crashed && state !== null;
    queueMicrotask(() => {
      setHasCrashed(crashedResult);
      setSavedState(state);
    });
    setAppLoadedMarker();

    return () => {
      clearAppLoadedMarker();
    };
  }, []);

  const restore = useCallback(() => {
    const state = retrieveCriticalState();
    clearCriticalState();
    return state;
  }, []);

  const discard = useCallback(() => {
    clearCriticalState();
  }, []);

  return {
    hasCrashed,
    savedState,
    restore,
    discard,
    persist: persistCriticalState,
  };
}
