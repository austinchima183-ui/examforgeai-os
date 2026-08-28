'use client'

// ============================================================================
// ExamForge AI — Social Auth Buttons
// ============================================================================
// Social authentication options (Google, Apple) for login/register pages.
// These redirect to Supabase OAuth flows.
// ============================================================================

import { Globe, Smartphone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SocialAuthProps {
  /** Callback when a social provider is selected */
  onSocialLogin: (_provider: 'google' | 'apple') => Promise<void>
  /** Whether a social login is in progress */
  loading?: boolean
  /** Which provider is currently loading */
  loadingProvider?: string | null
  /** Whether Supabase is available */
  supabaseAvailable: boolean
}

export function SocialAuthButtons({
  onSocialLogin,
  loading = false,
  loadingProvider = null,
  supabaseAvailable = true,
}: SocialAuthProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2 text-sm font-medium border-border/30 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-200"
          onClick={() => onSocialLogin('google')}
          disabled={loading || !supabaseAvailable}
          aria-label="Sign in with Google"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Globe className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sm:inline">Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2 text-sm font-medium border-border/30 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-200"
          onClick={() => onSocialLogin('apple')}
          disabled={loading || !supabaseAvailable}
          aria-label="Sign in with Apple"
        >
          {loadingProvider === 'apple' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sm:inline">Apple</span>
        </Button>
      </div>

      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  )
}
