'use client'

// ============================================================================
// ExamForge AI OS — 404 Not Found Page
// ============================================================================
// Full-bleed dark page (#090909), large icon with primary glow,
// clear message, helpful CTA. Minimal, elegant, AI OS design language.
// ============================================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: '#090909' }}
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        {/* Icon with primary glow */}
        <div className="relative">
          {/* Outer glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-primary/15 blur-3xl scale-[2.5]"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
          {/* 404 badge */}
          <div className="absolute -top-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-[#090909]">
            404
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Page not found
          </h1>
          <p className="text-sm text-white/50 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or navigate back to the dashboard.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className={cn(
              'gap-2 border-white/10 text-white/70',
              'hover:bg-white/5 hover:text-white',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button
            asChild
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
