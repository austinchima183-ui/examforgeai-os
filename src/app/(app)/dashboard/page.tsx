import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode, devUser } from '@/lib/supabase/dev-adapter'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants/routes'
import type { UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Dashboard Redirector
// ============================================================================
// Server Component. Reads the user role from the Supabase session
// and redirects to the role-specific dashboard.
// In dev mode without Supabase, uses dev adapter user data.
// ============================================================================

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  school_admin: '/dashboard/school-admin',
  super_admin: '/dashboard/super-admin',
  parent: '/parent/dashboard',
}

export default async function DashboardPage() {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  // When Supabase is unavailable, use dev adapter role to redirect.
  if (!supabase && isDevAdapterMode()) {
    const role = devUser.role as UserRole
    const targetPath = ROLE_DASHBOARD_MAP[role] ?? ROLE_DASHBOARD_MAP.school_admin
    redirect(targetPath)
  }

  const { data: { user } } = await supabase!.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Get role from profile (more reliable than app_metadata)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole) ?? (user.app_metadata?.role as UserRole) ?? 'student'
  const targetPath = ROLE_DASHBOARD_MAP[role] ?? ROLE_DASHBOARD_MAP.student
  redirect(targetPath)
}
