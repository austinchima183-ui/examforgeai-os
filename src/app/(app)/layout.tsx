'use client'

import dynamic from 'next/dynamic'
import { EnterpriseAppShell } from '@/components/layout/enterprise-app-shell'
import { RealtimeProvider } from '@/lib/hooks/use-realtime-provider'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { GlobalSearchProvider } from '@/components/search/global-search-provider'

// Lazy-loaded heavy providers/components — reduces initial JS bundle
const AiCopilotProvider = dynamic(
  () => import('@/components/ai/ai-copilot-provider').then((m) => m.AiCopilotProvider),
  { ssr: false }
)
const ContextualAIAssistant = dynamic(
  () => import('@/components/ai/contextual-ai-assistant').then((m) => m.ContextualAIAssistant),
  { ssr: false }
)
const CommandPaletteProvider = dynamic(
  () => import('@/components/command-palette').then((m) => m.CommandPaletteProvider),
  { ssr: false }
)

// ============================================================================
// ExamForge AI OS — Authenticated Layout (Enterprise AppShell)
// ============================================================================
// Layout for all authenticated routes. #090909 ambient bg.
// Uses EnterpriseAppShell which combines:
//   - Enterprise Sidebar (collapse/expand/hover/pin/floating/resize/favorites/
//     recent/search/context menu/workspace switcher)
//   - Header (breadcrumbs, search, AI copilot, notifications, user menu)
//   - Mobile drawer + Command palette (Cmd+K)
//   - ARIA landmarks + skip navigation
// ============================================================================

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="h-dvh overflow-hidden bg-[#090909]">
      <RealtimeProvider>
        <OnboardingProvider>
          <AiCopilotProvider>
            <GlobalSearchProvider>
              <CommandPaletteProvider>
                <EnterpriseAppShell>{children}</EnterpriseAppShell>

                {/* Contextual AI Assistant — subtle floating button */}
                <ContextualAIAssistant />
              </CommandPaletteProvider>
            </GlobalSearchProvider>
          </AiCopilotProvider>
        </OnboardingProvider>
      </RealtimeProvider>
    </div>
  )
}
