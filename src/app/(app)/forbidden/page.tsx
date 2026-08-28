'use client'

// ============================================================================
// ExamForge AI OS — Forbidden Page (403)
// ============================================================================
// Full-bleed dark page (#090909), large icon with red-tinted glow,
// clear message, helpful CTA. Minimal, elegant, AI OS design language.
// ============================================================================

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldX, Home, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Role-based dashboard routes
// ──────────────────────────────────────────────────────────────

const ROLE_DASHBOARD: Record<string, string> = {
  super_admin: '/dashboard/super-admin',
  school_admin: '/dashboard/school-admin',
  admin: '/dashboard/school-admin',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
  parent: '/parent/dashboard',
  government: '/government',
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function ForbiddenPage() {
  const searchParams = useSearchParams()
  const resource = searchParams.get('resource') ?? ''
  const role = searchParams.get('role') ?? ''

  const dashboardPath = (role && ROLE_DASHBOARD[role]) || '/dashboard'

  const description = resource
    ? `You don't have permission to access "${resource}". This resource requires elevated privileges that your current role doesn't have.`
    : "You don't have permission to access this page. If you believe this is an error, contact your administrator."

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6 animate-fade-in"
      style={{ backgroundColor: '#090909' }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        {/* Icon with red glow */}
        <div className="relative">
          {/* Outer glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-red-500/15 blur-3xl scale-[2.5]"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
            <ShieldX className="h-10 w-10 text-red-500" />
          </div>
          {/* 403 badge */}
          <div className="absolute -top-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-[#090909]">
            403
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Access denied
          </h1>
          <p className="text-sm text-white/50 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Role hint */}
        {role && (
          <p className="text-xs text-white/30">
            Current role: <span className="font-medium text-white/50">{role.replace('_', ' ')}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            aria-label="Go back to previous page"
            className={cn(
              'gap-2 border-white/10 text-white/70',
              'hover:bg-white/5 hover:text-white',
            )}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </Button>
          <Button
            asChild
            aria-label="Go to your dashboard"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href={dashboardPath}>
              <Home className="h-4 w-4" aria-hidden="true" />
              My Dashboard
            </Link>
          </Button>
        </div>

        {/* Contact support */}
        <Link
          href="/help-center"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs text-white/30',
            'transition-colors duration-150 hover:text-white/60',
          )}
          aria-label="Contact administrator"
        >
          <Mail className="h-3 w-3" aria-hidden="true" />
          Contact administrator
        </Link>
      </div>
    </div>
  )
}
