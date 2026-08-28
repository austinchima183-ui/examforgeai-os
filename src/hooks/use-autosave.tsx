'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutosaveOptions {
  /** The save function to call. Must return a promise. */
  onSave: (_data: unknown) => Promise<unknown>;
  /** Debounce interval in milliseconds (default: 5000) */
  interval?: number;
  /** Maximum retry attempts on error (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 2000) */
  retryDelay?: number;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
  /** Minimum data change detection — JSON compare (default: true) */
  detectChanges?: boolean;
}

export interface AutosaveReturn {
  /** Current status of autosave */
  status: AutosaveStatus;
  /** Timestamp of the last successful save */
  lastSavedAt: Date | null;
  /** Number of consecutive errors */
  errorCount: number;
  /** Last error message */
  lastError: string | null;
  /** Manually trigger a save */
  saveNow: () => Promise<void>;
  /** Reset the autosave state */
  reset: () => void;
}

// ─── useAutosave Hook ────────────────────────────────────────────────────────

export function useAutosave(
  data: unknown,
  options: AutosaveOptions
): AutosaveReturn {
  const {
    onSave,
    interval = 5000,
    maxRetries = 3,
    retryDelay = 2000,
    enabled = true,
    detectChanges = true,
  } = options;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const retryCountRef = useRef(0);
  const dataRef = useRef(data);

  // Serialize data for comparison
  const serializedData = detectChanges ? JSON.stringify(data) : '';
  const serializedDataRef = useRef(serializedData);

  // Keep dataRef in sync
  dataRef.current = data;
  // Keep serializedDataRef in sync so retries use the latest value
  serializedDataRef.current = serializedData;

  // ─── Save Logic ────────────────────────────────────────────────────────
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    // Check if data actually changed
    if (detectChanges && serializedDataRef.current === lastDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await onSave(dataRef.current);

      setStatus('saved');
      setLastSavedAt(new Date());
      setLastError(null);
      setErrorCount(0);
      retryCountRef.current = 0;
      lastDataRef.current = serializedDataRef.current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setStatus('error');
      setLastError(message);
      setErrorCount((prev) => prev + 1);
      retryCountRef.current += 1;

      // Retry if under limit
      if (retryCountRef.current < maxRetries) {
        retryTimerRef.current = setTimeout(() => {
          isSavingRef.current = false;
          performSave();
        }, retryDelay);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, enabled, detectChanges, maxRetries, retryDelay]);

  // ─── Debounced Auto-Save Timer ─────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounced save
    timerRef.current = setTimeout(() => {
      performSave();
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [serializedData, enabled, interval, performSave]);

  // ─── Cleanup ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ─── Manual Save ──────────────────────────────────────────────────────
  const saveNow = useCallback(async () => {
    retryCountRef.current = 0;
    isSavingRef.current = false;
    await performSave();
  }, [performSave]);

  // ─── Reset ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus('idle');
    setLastSavedAt(null);
    setErrorCount(0);
    setLastError(null);
    lastDataRef.current = '';
    retryCountRef.current = 0;
    isSavingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  return {
    status,
    lastSavedAt,
    errorCount,
    lastError,
    saveNow,
    reset,
  };
}

// ─── AutosaveIndicator Component ─────────────────────────────────────────────

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  lastError?: string | null;
  className?: string;
}

export function AutosaveIndicator({
  status,
  lastSavedAt,
  lastError,
  className,
}: AutosaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className ?? ''}`}>
      {status === 'idle' && (
        <span className="text-muted-foreground">Not saved yet</span>
      )}
      {status === 'saving' && (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-600">Saving...</span>
        </>
      )}
      {status === 'saved' && lastSavedAt && (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <span className="text-green-600">
            Saved at {formatTime(lastSavedAt)}
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-destructive/100" />
          <span className="text-destructive">
            {lastError ?? 'Save failed'}
          </span>
        </>
      )}
    </div>
  );
}
