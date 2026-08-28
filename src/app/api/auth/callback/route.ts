import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants/routes'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Auth Callback Route Handler
// ============================================================================
// Handles Supabase auth callback (code exchange). Exchanges the code
// from the URL for a session, then redirects to /dashboard.
// ============================================================================

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? ROUTES.DASHBOARD
  // SECURITY: Prevent open redirect — only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : ROUTES.DASHBOARD
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth error responses
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}${ROUTES.LOGIN}?error=${encodeURIComponent(errorDescription ?? error)}`
    )
  }

  // Exchange code for session
  if (code) {
    try {
      const supabase = await requireSupabase()
      // ── Dev Adapter Guard ──
      if (!supabase && isDevAdapterMode()) {
        return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback] Code exchange error:', exchangeError.message)
        return NextResponse.redirect(
          `${origin}${ROUTES.LOGIN}?error=${encodeURIComponent('Authentication failed. Please try again.')}`
        )
      }

      // Successful code exchange — redirect to the intended destination
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      return NextResponse.redirect(
        `${origin}${ROUTES.LOGIN}?error=${encodeURIComponent('An unexpected error occurred.')}`
      )
    }
  }

  // No code present — redirect to login
  return NextResponse.redirect(
    `${origin}${ROUTES.LOGIN}?error=${encodeURIComponent('Invalid authentication link.')}`
  )
}
