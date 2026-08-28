'use client'

// ============================================================================
// ExamForge AI — (app) Not Found Page (404)
// ============================================================================
// ExamForge-styled 404 page within the authenticated app shell.
// Includes search suggestion and home redirect.
// ============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileQuestion,
  Home,
  ArrowLeft,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { captureMessage } from '@/lib/observability/sentry'

export default function AppNotFound() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Report 404 with search attempt for analytics
      captureMessage('404 with search', {
        level: 'info',
        tags: { type: 'not_found_search', query: searchQuery.trim() },
      })
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div
      className="flex min-h-[480px] flex-col items-center justify-center p-6"
      role="status"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="relative">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"
            aria-hidden="true"
          >
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            404
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Try searching or navigate back to the dashboard.
          </p>
        </div>

        {/* Search suggestion */}
        <Card className="w-full max-w-sm">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a page..."
                  className="pl-9"
                  aria-label="Search for a page"
                />
              </div>
              <Button type="submit" size="sm" aria-label="Search">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Go back
          </Button>
          <Button asChild aria-label="Go to dashboard">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
