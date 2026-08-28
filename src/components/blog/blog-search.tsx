'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — Blog Search Component
// ============================================================================
// Debounced search input for blog post filtering.
// Uses a 300ms debounce to avoid excessive re-renders while typing.
// ============================================================================

interface BlogSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function BlogSearch({ onSearch, placeholder = 'Search articles...', className }: BlogSearchProps) {
  const [value, setValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onSearch(newValue)
    }, 300)
  }, [onSearch])

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
  }, [onSearch])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search blog articles"
        className="pl-9 pr-9 h-10 rounded-lg bg-[#1D1D1D]/50 border-white/[0.04] forge-input-glow focus-visible:border-white/[0.08]"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
