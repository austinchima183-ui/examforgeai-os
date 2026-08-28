'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

// ============================================================================
// ExamForge AI — Marketplace Search Component
// ============================================================================
// Client component that updates the URL search param for marketplace search.
// Uses debounced input to avoid excessive re-renders.
// ============================================================================

export function MarketplaceSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSearch = searchParams.get('q') ?? ''
  const [value, setValue] = useState(currentSearch)

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }
      router.push(`?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, router, searchParams])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search marketplace..."
        className="pl-9 h-10"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
