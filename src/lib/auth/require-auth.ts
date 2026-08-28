// ============================================================================
// ExamForge AI — Server-Side Auth Helper (RBAC + Data Isolation)
// ============================================================================
// Centralized authentication and authorization for Server Components,
// Server Actions, and API Routes. Every protected page/action MUST call
// one of these helpers before accessing any data.
// ============================================================================

import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode, devUser } from '@/lib/supabase/dev-adapter'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants/routes'
import { ROUTE_ROLE_MAP } from '@/lib/constants/route-rbac'
import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  schoolId: string | null
  avatarUrl: string | null
  isEmailVerified: boolean
}

export interface AuthResult {
  user: AuthenticatedUser
  supabase: Awaited<ReturnType<typeof createClient>>
}

// ──────────────────────────────────────────────────────────────
// Role Hierarchy (higher index = more permissions)
// ──────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  parent: 1,
  teacher: 2,
  school_admin: 3,
  super_admin: 4,
}

// (ROUTE_ROLE_MAP imported from @/lib/constants/route-rbac)

// ──────────────────────────────────────────────────────────────
// Core Auth Functions
// ──────────────────────────────────────────────────────────────

/**
 * Require an authenticated user. Returns the user and supabase client.
 * If the user is not authenticated, redirects to /login.
 * Use in Server Components and Server Actions.
 *
 * In dev mode without Supabase, returns dev adapter user data
 * so pages can render without crashing.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  // When Supabase is unavailable, return dev adapter user so pages render.
  if (!supabase && isDevAdapterMode()) {
    const devAuthenticatedUser: AuthenticatedUser = {
      id: devUser.id,
      email: devUser.email,
      fullName: devUser.full_name,
      role: devUser.role as UserRole,
      schoolId: devUser.school_id,
      avatarUrl: devUser.avatar_url,
      isEmailVerified: true,
    }
    return { user: devAuthenticatedUser, supabase: null as unknown as Awaited<ReturnType<typeof createClient>> }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Get the user's profile for role and school_id
  const { data: profile } = await supabase
    .from('users')
    .select('role, school_id, full_name, avatar_url, is_active')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole) ?? (user.app_metadata?.role as UserRole) ?? 'student'
  const schoolId = profile?.school_id ?? null
  const isActive = profile?.is_active ?? true

  // If user is deactivated, sign them out
  if (!isActive) {
    redirect(ROUTES.LOGIN)
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
    role,
    schoolId,
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    isEmailVerified: user.email_confirmed_at != null,
  }

  return { user: authenticatedUser, supabase }
}

/**
 * Require a specific role or higher. If the user doesn't have the required
 * role, redirects to /forbidden.
 */
export async function requireRole(minimumRole: UserRole): Promise<AuthResult> {
  const result = await requireAuth()

  if (ROLE_HIERARCHY[result.user.role] < ROLE_HIERARCHY[minimumRole]) {
    redirect('/forbidden')
  }

  return result
}

/**
 * Require one of the specified roles. If the user doesn't have any of the
 * required roles, redirects to /forbidden.
 */
export async function requireAnyRole(roles: UserRole[]): Promise<AuthResult> {
  const result = await requireAuth()

  if (!roles.includes(result.user.role)) {
    redirect('/forbidden')
  }

  return result
}

/**
 * Check if a route is accessible by the user's role.
 * Used by middleware and page-level guards.
 */
export function isRouteAccessible(pathname: string, role: UserRole): boolean {
  // Find the most specific matching route
  const matchingRoute = Object.keys(ROUTE_ROLE_MAP)
    .filter(route => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length)[0] // longest match

  if (!matchingRoute) {
    // P1-RBAC FIX: DEFAULT DENY — unmapped routes are NOT accessible.
    // Only explicitly mapped routes are accessible. This prevents
    // privilege escalation through newly added routes that haven't
    // been added to the RBAC map yet.
    return false
  }

  const allowedRoles = ROUTE_ROLE_MAP[matchingRoute]
  return allowedRoles.includes(role)
}

/**
 * Get the allowed roles for a given route path.
 */
export function getAllowedRolesForRoute(pathname: string): UserRole[] | null {
  const matchingRoute = Object.keys(ROUTE_ROLE_MAP)
    .filter(route => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchingRoute) return null
  return ROUTE_ROLE_MAP[matchingRoute]
}

/**
 * API Route auth helper — returns the user or null.
 * Does NOT redirect (API routes return JSON errors).
 */
export async function getAuthUser(): Promise<AuthResult | null> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      user: {
        id: devUser.id,
        email: devUser.email,
        fullName: devUser.full_name,
        role: devUser.role as UserRole,
        schoolId: devUser.school_id,
        avatarUrl: devUser.avatar_url,
        isEmailVerified: true,
      },
      supabase: null as unknown as Awaited<ReturnType<typeof createClient>>,
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, school_id, full_name, avatar_url, is_active')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole) ?? (user.app_metadata?.role as UserRole) ?? 'student'
  const schoolId = profile?.school_id ?? null

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      fullName: profile?.full_name ?? user.user_metadata?.full_name ?? 'User',
      role,
      schoolId,
      avatarUrl: profile?.avatar_url ?? null,
      isEmailVerified: user.email_confirmed_at != null,
    },
    supabase,
  }
}

/**
 * Verify that a user can access a specific resource.
 * Used for data isolation: school admins can only see their school,
 * teachers can only see their students, etc.
 */
export function canAccessResource(
  user: AuthenticatedUser,
  resourceSchoolId: string | null,
  resourceOwnerId?: string | null
): boolean {
  // Super admin can access everything
  if (user.role === 'super_admin') return true

  // School admin can only access resources in their school
  if (user.role === 'school_admin') {
    return user.schoolId !== null && resourceSchoolId === user.schoolId
  }

  // Teacher can only access resources in their school
  if (user.role === 'teacher') {
    return user.schoolId !== null && resourceSchoolId === user.schoolId
  }

  // Student can only access their own resources
  if (user.role === 'student') {
    return resourceOwnerId === user.id
  }

  // Parent can only access their children's resources
  if (user.role === 'parent') {
    return user.schoolId !== null && resourceSchoolId === user.schoolId
  }

  return false
}
