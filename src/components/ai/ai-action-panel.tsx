'use client'

// ============================================================================
// ExamForge AI — AI Action Panel Component
// ============================================================================
// Reusable panel for triggering AI workflows with loading states,
// error handling, and streaming support. Used across all AI modules.
// ============================================================================

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface AIActionStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: unknown
  error?: string
}

interface AIActionPanelProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions: Array<{
    id: string
    label: string
    icon?: React.ReactNode
    handler: () => Promise<unknown>
    variant?: 'primary' | 'secondary' | 'outline'
  }>
  result?: {
    content: string
    data?: unknown
  }
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function AIActionPanel({
  title,
  description,
  icon,
  actions,
  result,
  isLoading,
  error,
  onRetry,
  className,
}: AIActionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result?.content])

  return (
    <div className={cn(
      'rounded-xl border border-border/50 forge-glass-elevated neural-glow forge-card-shadow',
      'transition-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]',
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-cyan-500/10">
            {icon ?? <Sparkles className="h-4 w-4 text-cyan-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold forge-gradient-text">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-cyan-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Using tool...</span>
            </div>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 p-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.handler}
                    disabled={isLoading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'hover:shadow-md hover:shadow-primary/5 active:scale-[0.97]',
                      action.variant === 'primary' || !action.variant
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:from-primary/90 hover:to-blue-600/90 forge-glow'
                        : action.variant === 'secondary'
                          ? 'forge-glass-surface text-cyan-400 hover:border-cyan-400/30'
                          : 'border border-border/50 text-cyan-400 hover:bg-cyan-400/5 hover:border-cyan-400/30'
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-cyan-400">
                  <span className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think" />
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think [animation-delay:0.4s]" />
                  </span>
                  <span>AI is thinking...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 dark:bg-destructive/10">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive">{error}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-1 text-xs font-medium text-destructive underline hover:text-destructive"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {result?.content && !isLoading && !error && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Generated successfully</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      {onRetry && (
                        <button
                          onClick={onRetry}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-white/[0.03] border border-border/20 border-l-2 border-l-cyan-400/50 p-3 text-sm text-foreground whitespace-pre-wrap font-mono">
                    {result.content}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// AI Status Badge
// ──────────────────────────────────────────────────────────────

interface AIStatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  label?: string
  className?: string
}

export function AIStatusBadge({ status, label, className }: AIStatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      status === 'idle' && 'bg-white/[0.04] text-muted-foreground',
      status === 'loading' && 'bg-cyan-400/10 text-cyan-400',
      status === 'success' && 'bg-emerald-500/10 text-emerald-500',
      status === 'error' && 'bg-destructive/10 text-destructive',
      className
    )}>
      {status === 'loading' && <span className="size-2 rounded-full bg-cyan-400 animate-ai-think" />}
      {status === 'success' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'error' && <AlertCircle className="h-3 w-3" />}
      {status === 'idle' && <Sparkles className="h-3 w-3" />}
      {label ?? (status === 'idle' ? 'AI Ready' : status === 'loading' ? 'Processing...' : status === 'success' ? 'Complete' : 'Error')}
    </span>
  )
}
