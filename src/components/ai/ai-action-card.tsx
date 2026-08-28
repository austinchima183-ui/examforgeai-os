'use client';

// ============================================================================
// ExamForge AI — AI Action Card Component
// ============================================================================
// Individual card for a single AI suggestion/action. Shows icon, title,
// description, a "Run" button, loading state with AI typing indicator,
// success result with animation, and dismiss capability. Premium styling
// with subtle gradient, hover effects, and micro-animations.
// ============================================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  X,
  Copy,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion, useMotionConfig } from '@/hooks/use-reduced-motion';
import { AITypingIndicator } from '@/components/ui/ai-typing-indicator';
import { SuccessAnimation } from '@/components/ui/success-animation';
import type { AISuggestion } from '@/components/ai/contextual-suggestions';
import type { SuggestionStatus } from '@/hooks/use-contextual-ai';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AIActionCardProps {
  /** The suggestion to display */
  suggestion: AISuggestion;
  /** Current execution status */
  status: SuggestionStatus;
  /** Result text when status is 'success' */
  resultText?: string;
  /** Error text when status is 'error' */
  error?: string;
  /** Callback when user clicks "Run" */
  onExecute: (suggestion: AISuggestion) => void;
  /** Callback when user dismisses the result */
  onDismiss?: (suggestionId: string) => void;
  /** Callback to retry/re-run */
  onRetry?: (suggestion: AISuggestion) => void;
  /** Whether this is in the "recently used" section */
  isRecent?: boolean;
  /** Whether it has been used this session */
  isUsed?: boolean;
  /** Additional className */
  className?: string;
}

// ──────────────────────────────────────────────────────────────
// Category color mapping
// ──────────────────────────────────────────────────────────────

const categoryColors: Record<string, { bg: string; border: string; icon: string; accent: string; glow: string }> = {
  generate: {
    bg: 'forge-glass-surface',
    border: 'border-emerald-500/20',
    icon: 'bg-emerald-500/10 text-emerald-400',
    accent: 'text-emerald-400',
    glow: 'shadow-emerald-500/5',
  },
  analyze: {
    bg: 'forge-glass-surface',
    border: 'border-amber-500/20',
    icon: 'bg-amber-500/10 text-amber-400',
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/5',
  },
  predict: {
    bg: 'forge-glass-surface',
    border: 'border-violet-500/20',
    icon: 'bg-violet-500/10 text-violet-400',
    accent: 'text-violet-400',
    glow: 'shadow-violet-500/5',
  },
  recommend: {
    bg: 'forge-glass-surface',
    border: 'border-cyan-500/20',
    icon: 'bg-cyan-500/10 text-cyan-400',
    accent: 'text-cyan-400',
    glow: 'shadow-cyan-500/5',
  },
  optimize: {
    bg: 'forge-glass-surface',
    border: 'border-rose-500/20',
    icon: 'bg-rose-500/10 text-rose-400',
    accent: 'text-rose-400',
    glow: 'shadow-rose-500/5',
  },
};

const defaultColors = categoryColors.generate;

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function AIActionCard({
  suggestion,
  status,
  resultText,
  error,
  onExecute,
  onDismiss,
  onRetry,
  isRecent = false,
  isUsed = false,
  className,
}: AIActionCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { duration } = useMotionConfig({ defaultDuration: 0.25 });

  const { id, icon: Icon, title, description, category, premium } = suggestion;
  const colors = (category && categoryColors[category]) ?? defaultColors;

  // ── Copy result ──
  const handleCopy = useCallback(() => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [resultText]);

  // ── Show success animation briefly ──
  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // ── Trigger success animation when result arrives ──
  if (status === 'success' && !showSuccess) {
    // We use a micro-effect approach — the result appearing IS the animation
  }

  // ── Animation variants ──
  const cardVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
    },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.98,
      transition: { duration: duration * 0.6 },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout={prefersReducedMotion ? false : true}
      className={cn(
        'group relative overflow-hidden rounded-xl border forge-glass-surface',
        'transition-all duration-200 hover:shadow-md neural-glow',
        colors.border,
        isUsed && status !== 'loading' && 'ring-1 ring-inset ring-cyan-400/30',
        className,
      )}
    >
      {/* Neural glow shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/[0.06] to-transparent" />
      </div>
      {/* Sparkles indicator in top-right */}
      <div className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-white/[0.06] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Sparkles className="size-2.5 text-cyan-400" />
      </div>

      {/* Main content */}
      <div className="relative p-3.5">
        {/* Header row: icon + title + actions */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'transition-transform group-hover:scale-105',
            colors.icon,
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>

          {/* Title + description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate text-sm font-semibold text-foreground">
                {title}
              </h4>
              {premium && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-50 dark:bg-yellow-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400 dark:bg-yellow-950 dark:text-yellow-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  Pro
                </span>
              )}
              {isRecent && !isUsed && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Recent
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Dismiss button (only when result is shown) */}
          {status === 'success' && onDismiss && (
            <button
              onClick={() => onDismiss(id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Dismiss result"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action area */}
        <div className="mt-3">
          {/* Idle state — Run button */}
          {status === 'idle' && (
            <button
              onClick={() => onExecute(suggestion)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                'transition-all active:scale-[0.97]',
                'bg-gradient-to-r from-primary to-blue-600 text-white hover:from-primary/90 hover:to-blue-600/90 forge-glow',
              )}
            >
              <Play className="h-3 w-3" />
              Run
            </button>
          )}

          {/* Loading state — AI typing indicator */}
          {status === 'loading' && (
            <div className="py-1">
              <AITypingIndicator
                active
                label="Thinking..."
                size="sm"
              />
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-destructive">
                {error ?? 'Something went wrong. Please try again.'}
              </p>
              {onRetry && (
                <button
                  onClick={() => onRetry(suggestion)}
                  className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:bg-destructive/10 dark:text-destructive dark:hover:bg-red-950/50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Success state — result with actions */}
          <AnimatePresence>
            {status === 'success' && resultText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration }}
                className="overflow-hidden"
              >
                <div className="mt-1 rounded-lg bg-white/[0.03] border border-border/20 border-l-2 border-l-cyan-400/50 p-2.5 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
                  {resultText}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {onRetry && (
                    <button
                      onClick={() => onRetry(suggestion)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-run
                    </button>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400">
                    <Check className="h-3 w-3" />
                    Done
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Compact variant for inline / quick-access use
// ──────────────────────────────────────────────────────────────

export interface AIActionCardCompactProps {
  suggestion: AISuggestion;
  onExecute: (suggestion: AISuggestion) => void;
  isLoading?: boolean;
  className?: string;
}

export function AIActionCardCompact({
  suggestion,
  onExecute,
  isLoading = false,
  className,
}: AIActionCardCompactProps) {
  const { icon: Icon, title } = suggestion;
  const colors = (suggestion.category && categoryColors[suggestion.category]) ?? defaultColors;

  return (
    <button
      onClick={() => onExecute(suggestion)}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm',
        'transition-all hover:shadow-sm active:scale-[0.98] forge-glass-surface',
        'disabled:cursor-not-allowed disabled:opacity-60',
        colors.border,
        className,
      )}
    >
      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', colors.icon)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="truncate font-medium text-foreground">{title}</span>
      {isLoading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </button>
  );
}
