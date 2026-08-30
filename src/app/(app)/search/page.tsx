'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Search, School, GraduationCap, BookOpen, Users, HelpCircle, FileText, Store, Bell, CreditCard } from 'lucide-react'
import Link from 'next/link'
import type { SearchResult } from '@/lib/services/search-service'

// ============================================================================
// ExamForge AI — Global Search Page
// ============================================================================
// Client component with live Supabase search across all entities.
// Premium AI OS visual treatment applied.
// ============================================================================

const iconMap: Record<string, typeof School> = {
  School,
  GraduationCap,
  BookOpen,
  Users,
  HelpCircle,
  FileText,
  Store,
  Bell,
  CreditCard,
}

const typeLabelMap: Record<string, string> = {
  school: 'School',
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  question: 'Question',
  exam: 'Exam',
  marketplace: 'Marketplace',
  notification: 'Notification',
  payment: 'Payment',
}

const typeColorMap: Record<string, string> = {
  school: 'text-primary bg-primary/10',
  student: 'text-emerald-500 bg-emerald-500/10',
  teacher: 'text-violet-500 bg-violet-500/10',
  parent: 'text-teal-500 bg-teal-500/10',
  question: 'text-ember bg-ember/10',
  exam: 'text-neural bg-neural/10',
  marketplace: 'text-pink-500 bg-pink-500/10',
  notification: 'text-muted-foreground bg-muted',
  payment: 'text-emerald-500 bg-emerald-500/10',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results ?? [])
      setSearched(true)
    } catch {
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Search across schools, students, teachers, questions, exams, and more.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search schools, students, teachers, questions, exams..."
          className="pl-11 h-12 text-base forge-input-glow bg-[#1D1D1D]/50 border-white/[0.04] rounded-xl"
          autoFocus
        />
        <Button
          onClick={handleSearch}
          disabled={loading || query.trim().length < 2}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 forge-glow"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching...</p>
          </div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                  <Search className="h-7 w-7 text-foreground/60" />
                </div>
              </div>
            </div>
            <h3 className="text-base font-medium text-foreground">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              No results matched &ldquo;{query}&rdquo;. Try different keywords.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} found for &ldquo;{query}&rdquo;
          </p>

          {Object.entries(groupedResults).map(([type, items]) => {
            const Icon = iconMap[type] ?? Search
            const colorClass = typeColorMap[type] ?? 'text-muted-foreground bg-muted'

            return (
              <div key={type}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {typeLabelMap[type] ?? type} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Link key={item.id} href={item.href}>
                      <Card className="forge-glass-surface border-white/[0.04] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] transition-all duration-200 cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border-white/[0.04] ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] border-white/[0.04]">
                            {typeLabelMap[item.type] ?? item.type}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!searched && !loading && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                  <Search className="h-7 w-7 text-foreground/60" />
                </div>
              </div>
            </div>
            <h3 className="text-base font-medium text-foreground">Start searching</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              Search across schools, students, teachers, parents, questions, exams, results, marketplace, and payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
