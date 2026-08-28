'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ============================================================================
// ExamForge AI — Filter Select Component
// ============================================================================
// A client component that updates URL search params when a filter value
// changes, causing the server component to re-render with filtered data.
// ============================================================================

interface FilterOption {
  label: string
  value: string
}

interface FilterSelectProps {
  name: string
  placeholder: string
  options: FilterOption[]
  className?: string
}

export function FilterSelect({ name, placeholder, options, className }: FilterSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentValue = searchParams.get(name) ?? 'all'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(name)
    } else {
      params.set(name, value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className={className ?? 'h-9 w-[140px]'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
