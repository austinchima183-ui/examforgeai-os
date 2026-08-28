'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { EnterpriseSidebar } from '@/components/layout/enterprise-sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { CommandPalette } from '@/components/command-palette'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { SkipNavLink, SkipToSection } from '@/components/ui/skip-nav'

// ============================================================================
// ExamForge AI — Enterprise App Shell (UX 2.0 — Fixed Scroll Frame)
// ============================================================================
// App-frame scroll architecture (Linear / Vercel / Stripe style):
//
//   ┌─ h-dvh · overflow-hidden ────────────────────────────────────────┐
//   │ ┌─ Sidebar ────────┐ ┌─ Main column (flex-col, h-full) ────────┐ │
//   │ │ workspace (fix)  │ │ Header 48px  — fixed, never scrolls     │ │
//   │ │ search (fix)     │ │ ┌─ main — OWN independent scroll ─────┐ │ │
//   │ │ ├─ ScrollArea ─┤ │ │ │ sticky page header + action bar     │ │ │
//   │ │ │ nav (scrolls) │ │ │ │ KPI strip / dashboard grid          │ │ │
//   │ │ └───────────────┤ │ │ │ widgets (internal scroll where apt) │ │ │
//   │ │ AI status (fix) │ │ └───────────────────────────────────────┘ │ │
//   │ │ collapse (fix)  │ │                                          │ │
//   │ └─────────────────┘ └──────────────────────────────────────────┘ │
//   └──────────────────────────────────────────────────────────────────┘
//
// Rules enforced:
//   - The document body NEVER scrolls — the app is a fixed h-dvh frame.
//   - Sidebar has its own scroll (nav area), header + workspace stay fixed.
//   - Main content scrolls independently with overscroll-contain (no chaining).
//   - Header (breadcrumbs, search, actions) stays visible at all times.
//   - Sticky page headers inside main keep title + actions visible.
//   - Route change resets main scroll to top + plays a subtle page transition.
//   - Reduced motion: transitions degrade to instant (WCAG 2.3.3).
//   - Floating sidebar mode gets a click-away backdrop; Escape dismisses.
//
// Keyboard: Cmd/Ctrl+B sidebar · Cmd/Ctrl+K command palette · Cmd/Ctrl+. pin
// WCAG 2.2 AA: 1.3.1, 2.4.1, 2.4.3, 2.4.7, 2.3.3
// ============================================================================

export interface AppShellProps {
  children: React.ReactNode
}

export function EnterpriseAppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const { mode, setMode, trackRecent } = useSidebarStore()

  // ── Restore persisted collapse state on mount ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem('examforge-sidebar-collapsed')
      if (stored === 'true') setSidebarCollapsed(true)
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  // ── Persist collapse state ──
  useEffect(() => {
    try {
      localStorage.setItem(
        'examforge-sidebar-collapsed',
        String(sidebarCollapsed)
      )
    } catch {
      // localStorage may be unavailable
    }
  }, [sidebarCollapsed])

  // ── Auto-collapse below viewport threshold (desktop) ──
  useEffect(() => {
    const checkWidth = () => {
      if (typeof window === 'undefined') return
      if (window.innerWidth < 1024 && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [sidebarCollapsed])

  // ── Reset main scroll position on route change (app-frame scrolling) ──
  useEffect(() => {
    // The document never scrolls in the app frame, so Next's built-in
    // scroll restoration has no effect — reset the main pane explicitly.
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [pathname])

  // ── Keyboard shortcuts: Cmd/Ctrl+B (sidebar), Cmd/Ctrl+K (palette) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Cmd/Ctrl+K — always works (even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setCmdPaletteOpen((o) => !o)
        return
      }

      // Cmd/Ctrl+B — sidebar toggle, skip when typing
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !e.shiftKey && !e.altKey) {
        if (inInput) return
        e.preventDefault()
        if (isMobile) {
          setMobileNavOpen((o) => !o)
        } else {
          setSidebarCollapsed((c) => !c)
        }
      }

      // Cmd/Ctrl+. — toggle pin/floating mode (when not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === '.' && !inInput) {
        e.preventDefault()
        setMode(mode === 'pinned' ? 'expanded' : 'pinned')
      }

      // Escape — dismiss floating sidebar overlay
      if (e.key === 'Escape' && mode === 'floating') {
        setMode('expanded')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, mode, setMode])

  // ── Track recent pages for sidebar intelligence ──
  useEffect(() => {
    if (!pathname || pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')) return
    try {
      const recentRaw = localStorage.getItem('examforge-recent-pages')
      const recent: Array<{ path: string; title: string; ts: number }> = recentRaw ? JSON.parse(recentRaw) : []
      const filtered = recent.filter((r) => r.path !== pathname)
      const title = document.title.replace(/ \| ExamForge AI.*$/, '') || pathname
      const newEntry = { path: pathname, title, ts: Date.now() }
      const updated = [newEntry, ...filtered].slice(0, 8)
      localStorage.setItem('examforge-recent-pages', JSON.stringify(updated))

      // Also push to sidebar store
      trackRecent({ path: pathname, title, ts: Date.now() })
    } catch {
      // localStorage may be unavailable
    }
  }, [pathname, trackRecent])

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileNavOpen((o) => !o)
    } else {
      setSidebarCollapsed((c) => !c)
    }
  }, [isMobile])

  // Whether the sidebar overlays content (floating) and needs a backdrop
  const showFloatingBackdrop = !isMobile && mode === 'floating'

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#090909] forge-ambient-bg">
      <SkipNavLink contentId="main-content" label="Skip to main content" />
      <SkipToSection targetId="sidebar-nav" label="Skip to navigation" />

      {/* Floating-sidebar backdrop — click away to dock */}
      {showFloatingBackdrop && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setMode('expanded')}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar — full-height column with its own internal scroll */}
      {!isMobile && (
        <div
          id="sidebar-nav"
          tabIndex={-1}
          className="relative z-40 h-full shrink-0 outline-none transition-[width] duration-300 ease-out"
        >
          <EnterpriseSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          />
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      )}

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onOpenChange={setCmdPaletteOpen}
      />

      {/* Main Column — header fixed at top, main scrolls independently */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
        <main
          id="main-content"
          ref={mainRef}
          className="relative flex-1 overflow-y-auto overscroll-contain outline-none"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          {/* Page transition — subtle fade/slide keyed by route; respects reduced motion */}
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
