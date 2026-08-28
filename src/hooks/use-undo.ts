'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UndoOptions {
  /** Maximum number of history entries (default: 50) */
  maxHistory?: number;
  /** Enable keyboard shortcuts Ctrl+Z / Ctrl+Shift+Z (default: true) */
  keyboardShortcuts?: boolean;
}

export interface UndoReturn<T> {
  /** Current state */
  state: T;
  /** Set a new state (pushes to history) */
  setState: (_newState: T) => void;
  /** Undo the last change */
  undo: () => void;
  /** Redo the last undone change */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Full history stack (read-only) */
  history: T[];
  /** Current position in history (0-based) */
  historyIndex: number;
  /** Clear all history and reset to current state */
  clearHistory: () => void;
  /** Jump to a specific point in history */
  jumpTo: (_index: number) => void;
}

// ─── useUndo Hook ────────────────────────────────────────────────────────────

export function useUndo<T>(initialState: T, options: UndoOptions = {}): UndoReturn<T> {
  const { maxHistory = 50, keyboardShortcuts = true } = options;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // ─── Set State (push to history) ───────────────────────────────────────
  const setState = useCallback((newState: T) => {
    setHistory((prev) => {
      // Remove any future entries (if we're not at the end)
      const trimmed = prev.slice(0, historyIndex + 1);
      const updated = [...trimmed, newState];

      // Enforce max history size
      if (updated.length > maxHistory) {
        return updated.slice(updated.length - maxHistory);
      }

      return updated;
    });
    setHistoryIndex((prev) => {
      const nextIndex = prev + 1;
      return nextIndex >= maxHistory ? maxHistory - 1 : nextIndex;
    });
  }, [historyIndex, maxHistory]);

  // ─── Undo ──────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // ─── Redo ──────────────────────────────────────────────────────────────
  const redo = useCallback(() => {
    setHistoryIndex((prev) => {
      const maxIndex = history.length - 1;
      return Math.min(maxIndex, prev + 1);
    });
  }, [history.length]);

  // ─── Clear History ─────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    const currentState = history[historyIndex];
    setHistory([currentState]);
    setHistoryIndex(0);
  }, [history, historyIndex]);

  // ─── Jump To ───────────────────────────────────────────────────────────
  const jumpTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(history.length - 1, index));
    setHistoryIndex(clamped);
  }, [history.length]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (!keyboardShortcuts) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Check for Ctrl+Z (undo) or Cmd+Z (undo on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Check for Ctrl+Shift+Z (redo) or Cmd+Shift+Z (redo on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Also support Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts, undo, redo]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    state: history[historyIndex],
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    historyIndex,
    clearHistory,
    jumpTo,
  };
}
