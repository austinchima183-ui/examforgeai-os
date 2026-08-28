import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// ExamForge AI — Middleware Supabase Client
// ============================================================================
// Uses the modern @supabase/ssr pattern with getAll/setAll cookie methods.
// The deprecated updateSession() function has been removed.
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function createClient(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Return a passthrough response when Supabase is not configured
    return {
      supabase: null as unknown as ReturnType<typeof createServerClient>,
      response: NextResponse.next({ request: { headers: request.headers } }),
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  return { supabase, response }
}
