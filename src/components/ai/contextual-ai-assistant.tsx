'use client';

// ============================================================================
// ExamForge AI — Contextual AI Assistant
// ============================================================================
// A floating button in the bottom-right corner (like Notion's AI) that
// expands to show contextual AI suggestions based on the current page.
// "How can AI help?" pattern — feels like a natural assistant, not a
// chatbot bolted on.
//
// Features:
//   - Floating Sparkles button with tooltip
//   - Smooth expand/collapse with Framer Motion
//   - 3-5 page-specific contextual suggestions
//   - Recently used suggestions quick-access
//   - AI action cards with loading/success states
//   - Keyboard: Escape to close, Tab navigation
//   - Respects prefers-reduced-motion
//   - ARIA: proper roles, labels, live region
// ============================================================================

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion, useMotionConfig } from '@/hooks/use-reduced-motion';
import { useContestualAI } from '@/hooks/use-contextual-ai';
import { AIActionCard } from '@/components/ai/ai-action-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { PageContext } from '@/components/ai/contextual-suggestions';

// ──────────────────────────────────────────────────────────────
// Custom event name (matches what ai-suggestion-chip dispatches)
// ──────────────────────────────────────────────────────────────

const CONTEXTUAL_AI_OPEN_EVENT = 'examforge:contextual-ai:open';

// ──────────────────────────────────────────────────────────────
// Page context labels for the header
// ──────────────────────────────────────────────────────────────

const contextLabels: Record<PageContext, string> = {
  'teacher-dashboard': 'Teacher',
  'student-dashboard': 'Student',
  'parent-dashboard': 'Parent',
  'school-admin': 'School Admin',
  government: 'Government',
  exam: 'Exam',
  analytics: 'Analytics',
  'question-bank': 'Question Bank',
};

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────

export interface ContextualAIAssistantProps {
  /** Override the page context (auto-detected from pathname if not provided) */
  pageContext?: PageContext;
  /** Whether to show the floating button (default: true) */
  showFloatingButton?: boolean;
  /** Additional className for the container */
  className?: string;
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function ContextualAIAssistant({
  pageContext,
  showFloatingButton = true,
  className,
}: ContextualAIAssistantProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { duration } = useMotionConfig({ defaultDuration: 0.3 });

  // ── Hook ──
  const {
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
  } = useContestualAI(pageContext, pathname);

  // ── Refs ──
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── Listen for custom events from AISuggestionChip ──
  useEffect(() => {
    const handler = () => {
      open();
    };
    window.addEventListener(CONTEXTUAL_AI_OPEN_EVENT, handler);
    return () => window.removeEventListener(CONTEXTUAL_AI_OPEN_EVENT, handler);
  }, [open]);

  // ── Escape to close ──
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // ── Focus trap: focus panel on open ──
  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Small delay for animation to start
      const timer = setTimeout(() => {
        panelRef.current?.focus();
      }, prefersReducedMotion ? 0 : 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, prefersReducedMotion]);

  // ── Keyboard navigation within panel ──
  const handlePanelKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
        return;
      }

      // Tab trap within panel when open
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [close],
  );

  // ── Has recent suggestions? ──
  const hasRecent = recentSuggestions.length > 0;
  const contextLabel = resolvedContext ? contextLabels[resolvedContext] : null;

  // ── Panel animation variants ──
  const panelVariants = {
    hidden: {
      opacity: 0,
      y: 16,
      scale: 0.95,
      transition: { duration: duration * 0.6 },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      y: 12,
      scale: 0.97,
      transition: { duration: duration * 0.5 },
    },
  };

  // ── Floating button animation ──
  const buttonVariants = {
    idle: {
      scale: 1,
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
    },
    hover: {
      scale: 1.08,
      boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
    },
    tap: {
      scale: 0.95,
    },
  };

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* ── Expanded Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant suggestions"
            aria-live="polite"
            tabIndex={-1}
            onKeyDown={handlePanelKeyDown}
            className={cn(
              'absolute bottom-16 right-0 w-[360px] max-w-[calc(100vw-3rem)]',
              'overflow-hidden rounded-2xl border border-border/30',
              'forge-glass-floating neural-glow forge-card-shadow backdrop-blur-md',
              'focus:outline-none',
            )}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-border/30 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 shadow-sm shadow-primary/20 forge-glow">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground forge-gradient-text">
                    How can AI help?
                  </h2>
                  {contextLabel && (
                    <p className="text-[11px] text-muted-foreground">
                      {contextLabel} context
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={close}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                aria-label="Close AI suggestions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Content ── */}
            <ScrollArea className="max-h-[420px]">
              <div className="p-3">
                {/* ── No suggestions fallback ── */}
                {suggestions.length === 0 && !hasRecent && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 forge-glow">
                      <Lightbulb className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Navigate to a dashboard to see AI suggestions
                    </p>
                  </div>
                )}

                {/* ── Recent suggestions ── */}
                {hasRecent && (
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-1.5 px-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Recently used
                      </span>
                    </div>
                    <div className="space-y-2">
                      {recentSuggestions.slice(0, 3).map((suggestion) => {
                        const result = results.get(suggestion.id);
                        return (
                          <AIActionCard
                            key={`recent-${suggestion.id}`}
                            suggestion={suggestion}
                            status={result?.status ?? 'idle'}
                            resultText={result?.resultText}
                            error={result?.error}
                            onExecute={executeSuggestion}
                            onDismiss={dismissResult}
                            onRetry={executeSuggestion}
                            isRecent
                            isUsed={usedSuggestionIds.has(suggestion.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Contextual suggestions ── */}
                {suggestions.length > 0 && (
                  <div>
                    {hasRecent && (
                      <div className="mb-2 flex items-center gap-1.5 px-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                          Suggested for you
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => {
                        const result = results.get(suggestion.id);
                        return (
                          <AIActionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            status={result?.status ?? 'idle'}
                            resultText={result?.resultText}
                            error={result?.error}
                            onExecute={executeSuggestion}
                            onDismiss={dismissResult}
                            onRetry={executeSuggestion}
                            isUsed={usedSuggestionIds.has(suggestion.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ── */}
            <div className="border-t border-border/30 bg-white/[0.02] px-4 py-2.5">
              <p className="text-[10px] text-muted-foreground">
                AI suggestions are contextual — they change based on the page you&apos;re on.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ── */}
      {showFloatingButton && (
        <motion.button
          ref={buttonRef}
          variants={prefersReducedMotion ? undefined : buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={toggle}
          aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant — How can AI help?'}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-full',
            'bg-gradient-to-br from-primary to-cyan-500 text-white',
            'shadow-lg shadow-primary/25 forge-glow neural-glow',
            'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
            isOpen && 'ring-2 ring-primary/50 ring-offset-2',
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="sparkles"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse ring when closed (attention nudge) */}
          {!isOpen && !prefersReducedMotion && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{
                scale: [1, 1.4],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: 'easeOut',
              }}
            />
          )}
        </motion.button>
      )}

      {/* ── Tooltip (visible when closed, on hover) ── */}
      {showFloatingButton && !isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          role="tooltip"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-16 whitespace-nowrap rounded-lg forge-glass-elevated px-3 py-1.5 text-xs font-medium text-cyan-400 shadow-lg"
        >
          How can AI help?
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-card" />
        </motion.div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Standalone floating button (minimal — just the button, no panel)
// Useful for pages where you want to trigger the global AI copilot
// ──────────────────────────────────────────────────────────────

export function ContextualAIFloatingButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      aria-label="Ask AI"
      whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full',
        'bg-gradient-to-br from-primary to-cyan-500 text-white',
        'shadow-lg shadow-primary/25 forge-glow neural-glow',
        'transition-shadow hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
        className,
      )}
    >
      <Sparkles className="h-4.5 w-4.5" />
    </motion.button>
  );
}

export default ContextualAIAssistant;
