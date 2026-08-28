import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { SupabaseProvider } from '@/lib/hooks/use-supabase'
import { QueryProvider } from '@/lib/hooks/use-query-provider'
import { WebVitalsMonitor } from '@/components/performance/web-vitals-monitor'
import { StyledJsxRegistry } from '@/lib/styled-jsx-registry'
import { AuthSyncProvider } from '@/components/auth/auth-sync-provider'
import './globals.css'

// ============================================================================
// ExamForge AI — Root Layout
// ============================================================================
// Wraps the entire application with required providers:
//   - ThemeProvider (next-themes for light/dark mode)
//   - SupabaseProvider (browser Supabase client)
//   - QueryProvider (TanStack React Query)
//   - Toaster (sonner for toast notifications)
// ============================================================================

// ── Environment Validation (Fail-Fast at Server Startup) ──────────────────────
// Validates all CRITICAL environment variables before the app renders.
// Throws if any CRITICAL variable is missing/invalid in production,
// preventing the server from starting with a broken configuration.
// Skips validation on the client (this is a server-only check).
// ──────────────────────────────────────────────────────────────────────────────

if (typeof window === 'undefined') {
  // Server-only: validate env vars at startup
  const { validateEnv } = require('@/lib/config/env-validator')
  try {
    validateEnv()
  } catch (error) {
    console.error('[ExamForge] Environment validation failed at startup:', (error as Error).message)
    // In production, re-throw to prevent server from starting
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    // In development, just warn — don't block the dev server
    console.warn('[ExamForge] Fix missing environment variables before deploying to production.')
  }
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// ──────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://examforge-ai.vercel.app'),
  title: {
    default: 'ExamForge AI',
    template: '%s | ExamForge AI',
  },
  description:
    'AI-powered exam creation, CBT engine, and educational platform for teachers, students, and school administrators.',
  keywords: [
    'ExamForge',
    'AI',
    'exam',
    'CBT',
    'education',
    'teacher',
    'student',
    'school',
    'assessment',
    'question bank',
  ],
  authors: [{ name: 'ExamForge AI Team' }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'ExamForge AI',
    description:
      'AI-powered exam creation, CBT engine, and educational platform.',
    siteName: 'ExamForge AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExamForge AI',
    description:
      'AI-powered exam creation, CBT engine, and educational platform.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

// ──────────────────────────────────────────────────────────────
// Root Layout Component
// ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
    >
      <body className="font-sans antialiased bg-background text-foreground forge-ambient-bg">
        <StyledJsxRegistry>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AuthSyncProvider>
            <QueryProvider>
              <WebVitalsMonitor />
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 4000,
                  classNames: {
                    toast: 'bg-background text-foreground border-border',
                  },
                }}
              />
            </QueryProvider>
            </AuthSyncProvider>
          </SupabaseProvider>
        </ThemeProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  )
}
