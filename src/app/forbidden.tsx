'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldX, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — 403 Forbidden Page
// ============================================================================
// Access denied message with link to the appropriate dashboard based on
// the user's role. Shown when a user lacks required permissions.
// ============================================================================

export default function Forbidden() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
            403
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access denied</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            You don&apos;t have permission to access this page. If you believe this
            is an error, contact your administrator or try signing in with a
            different account.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              My Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
