'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — Documentation Search Bar (Client Component)
// ============================================================================
// Interactive search bar with clear button and keyboard shortcut hint.
// ============================================================================

interface DocsSearchBarProps {
  placeholder?: string
  className?: string
}

export function DocsSearchBar({
  placeholder = 'Search documentation, guides, API reference...',
  className,
}: DocsSearchBarProps) {
  const [query, setQuery] = useState('')

  return (
    <div className={`relative max-w-xl mx-auto ${className ?? ''}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-border/50 bg-card pl-11 pr-20 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        aria-label="Search documentation"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-16 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => setQuery('')}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </div>
  )
}
