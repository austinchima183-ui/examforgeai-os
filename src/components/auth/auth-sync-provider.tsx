'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { User, UserRole } from '@/lib/types'

// ============================================================================
// ExamForge AI — Auth Sync Provider
// ============================================================================
// Keeps the Zustand auth store synchronized with the real Supabase session.
//
// WHY THIS EXISTS: the store's persist middleware only persists `role`
// (partialize), so after any page reload `user` was null until the login
// form ran — every auth-dependent client component silently degraded.
// This provider:
//   1. On mount: fetches the current session + user profile row
//   2. Subscribes to onAuthStateChange (login / logout / token refresh)
//   3. Initializes or clears the store accordingly
// ============================================================================

function mapAuthUser(authUser: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
  created_at?: string
  email_confirmed_at?: string | null
}): User {
  const meta = authUser.user_metadata ?? {}
  const appMeta = authUser.app_metadata ?? {}
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    fullName: (meta.full_name as string) ?? (meta.fullName as string) ?? authUser.email ?? 'User',
    role: ((appMeta.role as UserRole) ?? (meta.role as UserRole) ?? 'student') as UserRole,
    avatarUrl: (meta.avatar_url as string) ?? (meta.avatarUrl as string) ?? null,
    isEmailVerified: Boolean(authUser.email_confirmed_at),
    createdAt: authUser.created_at ?? new Date().toISOString(),
    updatedAt: authUser.created_at ?? new Date().toISOString(),
  }
}

async function fetchProfileRole(supabase: NonNullable<ReturnType<typeof useSupabase>>, userId: string): Promise<{ role?: UserRole; schoolId?: string | null }> {
  try {
    const { data } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', userId)
      .maybeSingle()
    if (data) {
      return { role: data.role as UserRole, schoolId: data.school_id ?? null }
    }
  } catch {
    // Profile lookup failure is non-fatal — fall back to metadata role
  }
  return {}
}

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()
  const initialize = useAuthStore((s) => s.initialize)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setLoading = useAuthStore((s) => s.setLoading)
  const router = useRouter()
  const didInit = useRef(false)

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    async function syncUser(sessionUser: Parameters<typeof mapAuthUser>[0] | null) {
      if (cancelled) return
      if (!sessionUser) {
        clearAuth()
        return
      }
      // Merge the profile row's role/school over auth metadata (DB is authoritative)
      const profile = await fetchProfileRole(supabase!, sessionUser.id)
      const base = mapAuthUser(sessionUser)
      initialize({
        ...base,
        role: profile.role ?? base.role,
        schoolId: profile.schoolId ?? null,
      })
    }

    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      didInit.current = true
      if (session?.user) {
        syncUser(session.user)
      } else {
        clearAuth()
      }
    })

    // 2. Live auth changes (login, logout, refresh, recovery links)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT' || !session?.user) {
        clearAuth()
        return
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        syncUser(session.user)
        if (event === 'PASSWORD_RECOVERY') {
          router.refresh()
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, initialize, clearAuth, setLoading, router])

  // Safety: after 5s, stop the loading state even if no session resolved
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(t)
  }, [setLoading])

  return <>{children}</>
}
