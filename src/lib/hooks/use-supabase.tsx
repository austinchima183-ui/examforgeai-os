'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseBrowserClient = SupabaseClient

const SupabaseContext = createContext<SupabaseBrowserClient | null>(null)

interface SupabaseProviderProps {
  children: ReactNode
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const supabase = useMemo(() => createClient(), [])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

/** Returns the Supabase client or null if not configured */
export function useSupabase(): SupabaseBrowserClient | null {
  return useContext(SupabaseContext)
}

/** Returns the Supabase client, throws if not configured */
export function useSupabaseRequired(): SupabaseBrowserClient {
  const context = useContext(SupabaseContext)

  if (!context) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  return context
}
