import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/types'
import { PUBLIC_ROUTES, ROUTE_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/lib/constants/route-rbac'

// ============================================================================
// ExamForge AI — Production Middleware
// ============================================================================
// Auth guard + RBAC enforcement. Runs on every request.
// 1. Refreshes the Supabase session (cookie-based)
// 2. Redirects unauthenticated users to /login
// 3. Enforces role-based access control on protected routes
// ============================================================================

// (PUBLIC_ROUTES, ROUTE_ROLE_MAP, and ROLE_DASHBOARD_MAP imported from @/lib/constants/route-rbac)

// ──────────────────────────────────────────────────────────────
// Helper: Find the most specific matching route
// ──────────────────────────────────────────────────────────────

function findMatchingRoute(pathname: string): string | null {
  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter(route => pathname === route || pathname.startsWith(route + '/'))

  if (matchingRoutes.length === 0) return null

  // Return the longest (most specific) match
  return matchingRoutes.sort((a, b) => b.length - a.length)[0]
}

// ──────────────────────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request)

  // ─── Step 0: If Supabase is not configured, allow public routes through ──
  if (!supabase) {
    const pathname = request.nextUrl.pathname
    const isPublicRoute = PUBLIC_ROUTES.some(
      route => pathname === route || pathname.startsWith(route + '/')
    )
    if (isPublicRoute || pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
      return response
    }
    // For protected routes without Supabase, redirect to login
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // ─── Step 1: Refresh session ──────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ─── Step 2: Allow public routes ─────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    // If authenticated and trying to access login/register, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
      const role = (user.app_metadata?.role as string) ?? 'student'
      const dashboardPath = ROLE_DASHBOARD_MAP[role] ?? '/dashboard'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = dashboardPath
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  // ─── Step 3: Allow static assets and explicitly public API routes ──
  const PUBLIC_API_ROUTES = [
    '/api/auth/callback',
    '/api/billing/webhook',
    '/api/billing/webhooks',
    '/api/billing/paystack/webhook',
    '/api/marketplace/webhook',
    '/api/health',
    '/api/contact',
    '/api/newsletter/',
    '/api/demo-booking',
    '/api/analytics/events',  // has its own rate limiting
  ]

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return response
  }

  if (pathname.startsWith('/api/')) {
    // Allow explicitly public API routes
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return response
    }
    // All other API routes require authentication
    if (!user) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    return response
  }

  // ─── Step 4: Auth guard ───────────────────────────────────
  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ─── Step 5: Get user role from app_metadata ─────────────
  const role = (user.app_metadata?.role as UserRole) ?? 'student'

  // ─── Step 6: RBAC guard (DEFAULT DENY) ──────────────────
  const matchingRoute = findMatchingRoute(pathname)

  if (matchingRoute) {
    const allowedRoles = ROUTE_ROLE_MAP[matchingRoute]

    if (!allowedRoles.includes(role)) {
      // User doesn't have access to this route — redirect to their dashboard
      const dashboardPath = ROLE_DASHBOARD_MAP[role] ?? '/dashboard'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = dashboardPath
      return NextResponse.redirect(redirectUrl)
    }
  } else {
    // P1-RBAC FIX: DEFAULT DENY — Unmapped page routes are denied.
    // Only routes explicitly in ROUTE_ROLE_MAP are accessible.
    // This prevents access to newly added pages that haven't been
    // registered in the RBAC map. Redirect to the user's dashboard.
    const dashboardPath = ROLE_DASHBOARD_MAP[role] ?? '/dashboard'
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = dashboardPath
    return NextResponse.redirect(redirectUrl)
  }

  // ─── Step 7: Redirect /dashboard to role-specific dashboard ─
  if (pathname === '/dashboard') {
    const dashboardPath = ROLE_DASHBOARD_MAP[role] ?? '/dashboard/student'
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = dashboardPath
    return NextResponse.redirect(redirectUrl)
  }

  // ─── Step 8: Apply security headers ─────────────────────
  const { applySecurityHeaders } = await import('@/lib/security/content-security')
  applySecurityHeaders(response)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
