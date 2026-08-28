import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — API Method Badge
// ============================================================================
// Simple component for HTTP method badges with semantic color coding:
// GET=green, POST=blue, PUT=amber, DELETE=red, PATCH=purple.
// ============================================================================

interface ApiMethodBadgeProps {
  method: string
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/30 dark:text-green-400 border-emerald-200 dark:border-emerald-800',
  POST: 'bg-primary/10 text-blue-800 dark:bg-primary/10 dark:text-primary border-primary/20',
  PUT: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
  DELETE: 'bg-destructive/10 text-red-800 dark:bg-destructive/10 dark:text-destructive border-destructive/20',
  PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
}

const DEFAULT_STYLE =
  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'

export function ApiMethodBadge({ method }: ApiMethodBadgeProps) {
  const normalizedMethod = method.toUpperCase()
  const style = METHOD_STYLES[normalizedMethod] ?? DEFAULT_STYLE

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
        style
      )}
      aria-label={`HTTP method: ${normalizedMethod}`}
    >
      {normalizedMethod}
    </span>
  )
}
