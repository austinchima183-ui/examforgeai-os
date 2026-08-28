'use client';

// ============================================================================
// ExamForge AI — useContestualAI Hook
// ============================================================================
// Manages contextual AI state: suggestions, open/close, execution tracking,
// recently used suggestions, loading/error states. Persists recently used
// to localStorage for quick access across sessions.
//
// PRODUCTION: All AI actions now call real API endpoints:
//   teacher:*    → /api/ai/teacher
//   student:*    → /api/ai/student
//   parent:*     → /api/ai/parent
//   admin:*      → /api/ai/school-admin
//   gov:*        → /api/ai/government
//   exam:*       → /api/ai/teacher (exam actions are teacher-scoped)
//   analytics:*  → /api/ai/school-admin (analytics are admin-scoped)
//   qb:*         → /api/ai/teacher (question bank is teacher-scoped)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import {
  getSuggestionsForContext,
  resolveContextFromPath,
  type PageContext,
  type AISuggestion,
} from '@/components/ai/contextual-suggestions';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'examforge:ai:recent-suggestions';
const MAX_RECENT = 8;
const AI_REQUEST_TIMEOUT = 30000; // ms — 30s timeout for AI requests

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type SuggestionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SuggestionResult {
  /** The suggestion that was executed */
  suggestion: AISuggestion;
  /** Current status */
  status: SuggestionStatus;
  /** Result text (AI-generated content) */
  resultText?: string;
  /** Error message if status is 'error' */
  error?: string;
  /** Timestamp when execution started */
  startedAt?: number;
  /** Timestamp when execution completed */
  completedAt?: number;
}

export interface UseContestualAIReturn {
  /** Suggestions for the current page context */
  suggestions: AISuggestion[];
  /** Whether the assistant panel is open */
  isOpen: boolean;
  /** Toggle open/close */
  toggle: () => void;
  /** Explicitly open */
  open: () => void;
  /** Explicitly close */
  close: () => void;
  /** Execute a specific suggestion */
  executeSuggestion: (suggestion: AISuggestion) => void;
  /** Dismiss a suggestion result */
  dismissResult: (suggestionId: string) => void;
  /** Active suggestion results (keyed by suggestion id) */
  results: Map<string, SuggestionResult>;
  /** Currently executing suggestion id */
  executingId: string | null;
  /** IDs of suggestions that have been used this session */
  usedSuggestionIds: Set<string>;
  /** Recently used suggestions (persisted across sessions) */
  recentSuggestions: AISuggestion[];
  /** The current page context (null if unrecognized) */
  pageContext: PageContext | null;
  /** Any global error */
  error: string | null;
}

// ──────────────────────────────────────────────────────────────
// AI Action → API Endpoint Mapping
// ──────────────────────────────────────────────────────────────

/**
 * Maps a contextual AI action key (e.g. "teacher:generate-lesson-plan")
 * to the appropriate API endpoint. All role-specific endpoints accept
 * a POST with { action, data } and dispatch to the correct AI function.
 */
function getAIEndpoint(action: string): string | null {
  const [role] = action.split(':');
  const endpointMap: Record<string, string> = {
    teacher: '/api/ai/teacher',
    student: '/api/ai/student',
    parent: '/api/ai/parent',
    admin: '/api/ai/school-admin',
    gov: '/api/ai/government',
    // Exam, analytics, and question bank actions are dispatched
    // through the teacher or school-admin endpoints
    exam: '/api/ai/teacher',
    analytics: '/api/ai/school-admin',
    qb: '/api/ai/teacher',
  };
  return endpointMap[role] || null;
}

/**
 * Extracts the action name from the full action key.
 * e.g. "teacher:generate-lesson-plan" → "generate-lesson-plan"
 */
function getActionName(action: string): string {
  const parts = action.split(':');
  return parts.length > 1 ? parts.slice(1).join(':') : action;
}

// ──────────────────────────────────────────────────────────────
// AI API Call
// ──────────────────────────────────────────────────────────────

/**
 * Calls the real AI API endpoint for a given suggestion action.
 * Returns the AI-generated result text, or throws on error.
 */
async function callAIAPI(
  action: string,
  suggestionTitle: string,
  signal: AbortSignal,
): Promise<string> {
  const endpoint = getAIEndpoint(action);
  if (!endpoint) {
    throw new Error(`No AI endpoint configured for action: ${action}`);
  }

  const actionName = getActionName(action);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: actionName,
      data: {
        prompt: suggestionTitle,
        // The backend will enrich with school context from auth session
      },
    }),
    signal,
  });

  if (!response.ok) {
    // If AI endpoint is unavailable, try the general complete endpoint as fallback
    if (response.status >= 500) {
      const fallbackResponse = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `You are an AI assistant for ExamForge, an exam management platform. The user clicked: "${suggestionTitle}" (action: ${action}). Provide a helpful, concise response with actionable insights. Use relevant data references where appropriate.`,
            },
          ],
        }),
        signal,
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (typeof fallbackData === 'string') return fallbackData;
        if (fallbackData.content) return fallbackData.content;
        if (fallbackData.result) return fallbackData.result;
        if (fallbackData.data) {
          if (typeof fallbackData.data === 'string') return fallbackData.data;
          return JSON.stringify(fallbackData.data, null, 2);
        }
        return JSON.stringify(fallbackData, null, 2);
      }
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `AI request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  // Extract result text from various response formats
  if (typeof data === 'string') return data;
  if (data.result) return typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
  if (data.content) return typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
  if (data.data) {
    if (typeof data.data === 'string') return data.data;
    // If data.data is an object, try to extract a text field
    if (data.data.text) return data.data.text;
    if (data.data.message) return data.data.message;
    if (data.data.content) return data.data.content;
    return JSON.stringify(data.data, null, 2);
  }
  if (data.message) return data.message;
  if (data.text) return data.text;

  // Fallback: stringify the whole response
  return JSON.stringify(data, null, 2);
}

// ──────────────────────────────────────────────────────────────
// Local Storage helpers
// ──────────────────────────────────────────────────────────────

interface RecentEntry {
  id: string;
  action: string;
  title: string;
  timestamp: number;
}

function loadRecent(): RecentEntry[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(entries: RecentEntry[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
  } catch {
    // Silently fail — not critical
  }
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useContestualAI(
  pageContext?: PageContext,
  pathname?: string,
): UseContestualAIReturn {
  // ── Resolve context ──
  const resolvedContext = pageContext ?? (pathname ? resolveContextFromPath(pathname) : null);

  // ── Core state ──
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Map<string, SuggestionResult>>(new Map());
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [usedSuggestionIds, setUsedSuggestionIds] = useState<Set<string>>(new Set());
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>(loadRecent);
  const [error, setError] = useState<string | null>(null);

  // ── Refs for async operations ──
  const abortControllerRef = useRef<Map<string, AbortController>>(new Map());

  // ── Get suggestions for current context ──
  const suggestions = resolvedContext ? getSuggestionsForContext(resolvedContext) : [];

  // ── Build recent suggestions list (resolved from entries) ──
  const recentSuggestions: AISuggestion[] = recentEntries
    .map((entry) => {
      // Try to find the full suggestion from current context suggestions first
      const current = suggestions.find((s) => s.id === entry.id);
      if (current) return current;
      // Reconstruct a minimal suggestion from the entry
      return {
        id: entry.id,
        icon: Sparkles,
        title: entry.title,
        description: '',
        action: entry.action,
      } as AISuggestion;
    })
    .filter(Boolean);

  // ── Toggle / Open / Close ──
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // ── Execute a suggestion ──
  const executeSuggestion = useCallback(
    (suggestion: AISuggestion) => {
      const { id, action, title } = suggestion;

      // Prevent double-execution
      if (executingId === id) return;

      // Cancel any previous request for this suggestion
      const prevController = abortControllerRef.current.get(id);
      if (prevController) prevController.abort();

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current.set(id, controller);

      // Set timeout to auto-abort if AI takes too long
      const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

      // Set loading state
      setExecutingId(id);
      setUsedSuggestionIds((prev) => new Set(prev).add(id));
      setError(null);

      setResults((prev) => {
        const next = new Map(prev);
        next.set(id, {
          suggestion,
          status: 'loading',
          startedAt: Date.now(),
        });
        return next;
      });

      // Call real AI API
      callAIAPI(action, title, controller.signal)
        .then((resultText) => {
          clearTimeout(timeoutId);
          setResults((prev) => {
            const next = new Map(prev);
            next.set(id, {
              suggestion,
              status: 'success',
              resultText,
              startedAt: prev.get(id)?.startedAt,
              completedAt: Date.now(),
            });
            return next;
          });
          setExecutingId(null);

          // Add to recent
          setRecentEntries((prev) => {
            const filtered = prev.filter((e) => e.id !== id);
            const updated = [
              { id, action, title, timestamp: Date.now() },
              ...filtered,
            ].slice(0, MAX_RECENT);
            saveRecent(updated);
            return updated;
          });
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          const errorMessage = err instanceof Error ? err.message : 'AI request failed';
          const isAborted = err instanceof DOMException && err.name === 'AbortError';

          if (!isAborted) {
            setResults((prev) => {
              const next = new Map(prev);
              next.set(id, {
                suggestion,
                status: 'error',
                error: errorMessage,
                startedAt: prev.get(id)?.startedAt,
                completedAt: Date.now(),
              });
              return next;
            });
            setError(errorMessage);
          }
          setExecutingId(null);
        });
    },
    [executingId],
  );

  // ── Dismiss a result ──
  const dismissResult = useCallback((suggestionId: string) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(suggestionId);
      return next;
    });
  }, []);

  // ── Cleanup abort controllers on unmount ──
  useEffect(() => {
    const controllers = abortControllerRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  return {
    suggestions,
    isOpen,
    toggle,
    open,
    close,
    executeSuggestion,
    dismissResult,
    results,
    executingId,
    usedSuggestionIds,
    recentSuggestions,
    pageContext: resolvedContext,
    error,
  };
}
