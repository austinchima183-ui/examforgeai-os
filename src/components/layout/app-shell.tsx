'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { useIsMobile } from '@/hooks/use-mobile'
import { SkipNavLink, SkipToSection } from '@/components/ui/skip-nav'

// ============================================================================
// ExamForge AI — Enterprise App Shell
// ============================================================================
// Combines Sidebar, Header, and MobileNav into a responsive layout with:
// - Sidebar collapse state persisted to localStorage
// - Keyboard shortcut (Cmd/Ctrl+B) to toggle sidebar
// - Skip navigation link (first focusable element)
// - ARIA landmarks (banner, navigation, main, complementary)
// - Proper focus management for mobile nav
// - Reduced motion support
// - Ambient background (#090909) — content breathes full width
// - Smooth 300ms sidebar width transitions
// - Recent pages tracking (for sidebar intelligence)
// WCAG 2.2 AA: 1.3.1, 2.4.1, 2.4.3, 2.4.7
// ============================================================================

export interface AppShellProps {
  children: React.ReactNode
}

const SIDEBAR_STORAGE_KEY = 'examforge-sidebar-collapsed'

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // ── Restore persisted collapse state on mount ──
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  // ── Persist collapse state + broadcast to other tabs ──
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // ── Keyboard shortcut: Cmd/Ctrl+B to toggle sidebar ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !e.shiftKey && !e.altKey) {
        // Don't trigger if focus is in an input/textarea/select
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
        e.preventDefault()
        if (isMobile) {
          setMobileNavOpen(o => !o)
        } else {
          setSidebarCollapsed(c => !c)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile])

  // ── Track recent pages for sidebar intelligence ──
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/' || path.startsWith('/login') || path.startsWith('/register')) return

    try {
      const recentRaw = localStorage.getItem('examforge-recent-pages')
      const recent: Array<{ path: string; title: string; ts: number }> = recentRaw ? JSON.parse(recentRaw) : []
      const filtered = recent.filter(r => r.path !== path)
      const title = document.title.replace(/ \| ExamForge AI.*$/, '')
      filtered.unshift({ path, title, ts: Date.now() })
      // Keep last 8 pages
      localStorage.setItem('examforge-recent-pages', JSON.stringify(filtered.slice(0, 8)))
    } catch {
      // localStorage may be unavailable (incognito)
    }
  }, [])

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileNavOpen(o => !o)
    } else {
      setSidebarCollapsed(c => !c)
    }
  }, [isMobile])

  return (
    <div className="min-h-screen flex bg-[#090909] forge-ambient-bg">
      {/* Skip Navigation — MUST be the first focusable element */}
      <SkipNavLink contentId="main-content" label="Skip to main content" />
      <SkipToSection targetId="sidebar-nav" label="Skip to navigation" />

      {/* Desktop Sidebar — ARIA navigation landmark */}
      {!isMobile && (
        <div
          id="sidebar-nav"
          tabIndex={-1}
          className="outline-none transition-all duration-300 ease-out"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
        </div>
      )}

      {/* Mobile Navigation (Sheet) — managed by Sheet with built-in focus trap */}
      {isMobile && (
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      )}

      {/* Main Content Area — ARIA main landmark */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out">
        {/* Header — ARIA banner landmark */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Main landmark with skip nav target — full width, no max-w constraint */}
        <main
          id="main-content"
          className="flex-1 overflow-auto outline-none"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          <div className="p-6 sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
