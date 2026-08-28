'use client';

// ============================================================================
// ExamForge AI — AI Suggestion Chip Component
// ============================================================================
// Small inline chip that appears near relevant content (empty states, headers,
// form fields, etc.) to offer AI assistance. On click, triggers the contextual
// AI panel to open. Lightweight and unobtrusive — feels like a natural nudge,
// not an ad.
// ============================================================================

import { forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AISuggestionChipProps {
  /** Label text. Defaults to "Ask AI" */
  label?: 'Ask AI' | 'Try AI' | 'AI Help' | 'AI Suggest';
  /** Variant style */
  variant?: 'default' | 'subtle' | 'glow';
  /** Size */
  size?: 'sm' | 'md';
  /** Callback when chip is clicked */
  onClick?: () => void;
  /** Whether to dispatch a custom event to open the contextual AI panel */
  openContextualAI?: boolean;
  /** Whether the chip is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

// ──────────────────────────────────────────────────────────────
// Custom event name (matches what contextual-ai-assistant listens for)
// ──────────────────────────────────────────────────────────────

const CONTEXTUAL_AI_OPEN_EVENT = 'examforge:contextual-ai:open';

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export const AISuggestionChip = forwardRef<HTMLButtonElement, AISuggestionChipProps>(
  function AISuggestionChip(
    {
      label = 'Ask AI',
      variant = 'default',
      size = 'sm',
      onClick,
      openContextualAI = true,
      disabled = false,
      className,
    },
    ref,
  ) {
    const prefersReducedMotion = useReducedMotion();

    const handleClick = useCallback(() => {
      // Dispatch custom event to open the contextual AI panel
      if (openContextualAI) {
        const event = new CustomEvent(CONTEXTUAL_AI_OPEN_EVENT, {
          bubbles: true,
          detail: { source: 'chip', label },
        });
        window.dispatchEvent(event);
      }
      onClick?.();
    }, [onClick, openContextualAI, label]);

    // ── Size styles ──
    const sizeStyles = {
      sm: 'px-2.5 py-1 text-[11px] gap-1.5',
      md: 'px-3 py-1.5 text-xs gap-2',
    };

    // ── Variant styles — rounded-full pills with premium glass ──
    const variantStyles = {
      default: cn(
        'bg-white/[0.04] text-cyan-400 hover:bg-white/[0.08]',
        'border border-white/[0.06] hover:border-cyan-400/30',
        'backdrop-blur-sm',
        'hover:shadow-sm hover:shadow-cyan-400/5',
      ),
      subtle: cn(
        'bg-white/[0.02] text-cyan-400/80 hover:text-cyan-400 hover:bg-white/[0.06]',
        'border border-transparent hover:border-cyan-400/20',
      ),
      glow: cn(
        'bg-gradient-to-r from-primary/80 to-cyan-500/80 text-white',
        'hover:from-primary hover:to-cyan-500',
        'shadow-sm shadow-primary/20 forge-glow',
        'border border-transparent',
      ),
    };

    const chip = (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={`${label} — open AI assistant`}
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'transition-all duration-200',
          'active:scale-[0.96]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-cyan-400/50',
          sizeStyles[size],
          variantStyles[variant],
          className,
        )}
      >
        <Sparkles className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <span>{label}</span>
      </button>
    );

    // Wrap with motion for hover micro-animation (respects reduced motion)
    if (prefersReducedMotion) {
      return chip;
    }

    return (
      <motion.div
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="inline-flex"
      >
        {chip}
      </motion.div>
    );
  },
);

// ──────────────────────────────────────────────────────────────
// Convenience: InlineAIHelp — even more minimal, just sparkle + text
// ──────────────────────────────────────────────────────────────

export interface InlineAIHelpProps {
  /** Text to show next to sparkle */
  text?: string;
  /** Click handler */
  onClick?: () => void;
  /** Open contextual AI panel on click? */
  openContextualAI?: boolean;
  className?: string;
}

export function InlineAIHelp({
  text = 'AI can help',
  onClick,
  openContextualAI = true,
  className,
}: InlineAIHelpProps) {
  const handleClick = useCallback(() => {
    if (openContextualAI) {
      const event = new CustomEvent(CONTEXTUAL_AI_OPEN_EVENT, {
        bubbles: true,
        detail: { source: 'inline-help' },
      });
      window.dispatchEvent(event);
    }
    onClick?.();
  }, [onClick, openContextualAI]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-cyan-400 transition-colors hover:text-cyan-300',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span className="underline decoration-cyan-400/30 underline-offset-2 decoration-dashed hover:decoration-solid">
        {text}
      </span>
    </button>
  );
}
