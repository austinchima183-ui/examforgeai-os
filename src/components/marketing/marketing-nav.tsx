'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, BookOpen, ChevronDown, ArrowRight, Search,
  MonitorPlay, Users, Building2, BarChart3, Store,
  Bot, CreditCard, MessageSquare, GraduationCap,
  FileText, Code, HelpCircle, Newspaper, Sparkles,
  Landmark, Globe, Radio, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — Marketing Navigation (AI OS World-Class)
// ============================================================================
// Vercel/Linear/Stripe-quality navigation with:
// - #090909 background with progressive backdrop-blur on scroll
// - forge-gradient-text logo ("ExamForge" bold + "AI" gradient)
// - Mega menu with forge-glass-elevated + premium borders
// - Minimal hover — subtle text brightness increase only
// - ⌘K search pill with forge-input-glow
// - Primary CTA with subtle glow on hover
// - Mobile right-slide drawer with forge-glass-floating
// - Minimal announcement bar — neural-cyan, one line
// - Active link: thin underline with spring animation
// - Scroll: navbar becomes more opaque/blurred
// ============================================================================

interface MegaMenuItem {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  href: string
  badge?: string
}

const productItems: MegaMenuItem[] = [
  { icon: Users, title: 'Student Information System', desc: 'Complete student lifecycle management', href: '/features#students' },
  { icon: MonitorPlay, title: 'AI CBT Platform', desc: 'Create, deliver, and grade CBT exams', href: '/features#cbt' },
  { icon: Building2, title: 'School ERP', desc: 'End-to-end school administration', href: '/features#erp' },
  { icon: BarChart3, title: 'Analytics & Insights', desc: 'Real-time dashboards and predictive analytics', href: '/features#analytics' },
  { icon: Store, title: 'Marketplace', desc: 'Browse and share exam resources', href: '/features#marketplace' },
  { icon: Bot, title: 'AI Assistant', desc: 'Intelligent assistant for teachers', href: '/features#ai-assistant' },
  { icon: CreditCard, title: 'Billing & Payments', desc: 'Integrated payment processing', href: '/features#billing' },
  { icon: MessageSquare, title: 'Messaging', desc: 'Built-in communication tools', href: '/features#messaging' },
  { icon: Radio, title: 'Realtime Collaboration', desc: 'Co-edit exams and documents', href: '/features#collaboration' },
  { icon: Bell, title: 'Notifications', desc: 'Smart multi-channel alerts', href: '/features#notifications' },
]

const solutionItems: MegaMenuItem[] = [
  { icon: GraduationCap, title: 'Primary Schools', desc: 'Simple assessment for young learners', href: '/solutions#primary' },
  { icon: Building2, title: 'Secondary Schools', desc: 'WAEC/NECO/JAMB preparation', href: '/solutions#secondary' },
  { icon: Landmark, title: 'Universities', desc: 'Large-scale CBT delivery', href: '/solutions#universities' },
  { icon: Users, title: 'School Groups', desc: 'Multi-school management', href: '/solutions#school-groups' },
  { icon: Globe, title: 'Government Agencies', desc: 'Massive concurrent exam delivery', href: '/solutions#government' },
  { icon: GraduationCap, title: 'Examination Bodies', desc: 'Professional certification workflows', href: '/solutions#examination-bodies' },
]

const resourceItems: MegaMenuItem[] = [
  { icon: FileText, title: 'Documentation', desc: 'Guides, tutorials, and API docs', href: '/docs' },
  { icon: Code, title: 'API Reference', desc: 'RESTful API docs and SDKs', href: '/api-docs' },
  { icon: Code, title: 'Developers', desc: 'SDKs, code examples, and tools', href: '/developers' },
  { icon: Newspaper, title: 'Blog', desc: 'Insights and product updates', href: '/blog' },
  { icon: HelpCircle, title: 'Help Center', desc: 'FAQs, walkthroughs, and support', href: '/help-center' },
  { icon: Sparkles, title: 'Changelog', desc: 'What\'s new in ExamForge AI', href: '/changelog' },
  { icon: Users, title: 'Community', desc: 'Connect with educators and developers', href: '/community' },
  { icon: BarChart3, title: 'Case Studies', desc: 'Real results from institutions', href: '/case-studies' },
  { icon: Globe, title: 'Integrations', desc: 'Connect with your tools', href: '/integrations' },
]

interface MegaMenuProps {
  label: string
  items: MegaMenuItem[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  currentPath: string
}

function MegaMenu({ label, items, isOpen, onToggle, onClose, currentPath }: MegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuItemsRef = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Check if any item in this menu matches the current path (ignoring hash)
  const hasActiveItem = items.some((item) => currentPath === item.href.split('#')[0])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'Tab') {
      if (!isOpen) return
      e.preventDefault()
      const firstItem = menuItemsRef.current[0]
      if (firstItem) firstItem.focus()
    }
  }, [isOpen, onClose])

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape') {
      onClose()
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const nextIndex = index + 1
      if (nextIndex < menuItemsRef.current.length) {
        menuItemsRef.current[nextIndex]?.focus()
      } else {
        onClose()
      }
    }
    if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      if (index === 0) {
        triggerRef.current?.focus()
      } else {
        menuItemsRef.current[index - 1]?.focus()
      }
    }
  }, [onClose])

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={onToggle}
        className={cn(
          'relative flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium',
          'transition-colors duration-150',
          isOpen
            ? 'text-foreground'
            : 'text-foreground/60 hover:text-foreground/90',
          hasActiveItem && !isOpen && 'text-foreground'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
        {/* Active indicator — thin spring-animated underline */}
        {hasActiveItem && !isOpen && (
          <motion.span
            layoutId="nav-active-underline"
            className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 h-[1.5px] w-4 rounded-full bg-[#22D3EE]"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[580px] rounded-xl forge-glass-elevated border border-white/[0.08] shadow-2xl shadow-black/20 overflow-hidden"
            role="menu"
            aria-label={`${label} menu`}
          >
            {/* Premium gradient accent line at top */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />
            <div className="grid grid-cols-2 gap-px p-1.5">
              {items.map((item, index) => {
                const Icon = item.icon
                const isActive = currentPath === item.href.split('#')[0]
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    ref={(el) => { menuItemsRef.current[index] = el }}
                    onClick={onClose}
                    onKeyDown={(e) => handleItemKeyDown(e, index)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 transition-all duration-150 group',
                      'hover:bg-white/[0.04]',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40',
                      isActive && 'bg-white/[0.03]'
                    )}
                    role="menuitem"
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 transition-all duration-150',
                      'bg-white/[0.04] text-foreground/40 group-hover:text-[#3B82F6] group-hover:bg-[#3B82F6]/10',
                      isActive && 'bg-[#3B82F6]/10 text-[#3B82F6]'
                    )}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-[13px] font-medium transition-colors duration-150',
                          'text-foreground/80 group-hover:text-foreground',
                          isActive && 'text-foreground'
                        )}>
                          {item.title}
                        </p>
                        {item.badge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none bg-[#3B82F6]/15 text-[#3B82F6]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/60 mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const topNavLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Customers', href: '/customers' },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const pathname = usePathname()
  const mobileNavRef = useRef<HTMLDivElement>(null)

  // Reset mobile drawer and mega menus on route change
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
    setOpenMenu(null)
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      {/* ═══ Minimal Announcement Bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center h-8 bg-[#090909] border-b border-white/[0.04]">
        <p className="text-[11px] font-medium tracking-wide text-[#22D3EE]/80">
          Introducing AI-Powered Exam Analytics&nbsp;&nbsp;→
        </p>
      </div>

      {/* ═══ Main Navigation ═══ */}
      <header
        className={cn(
          'fixed left-0 right-0 z-50 transition-all duration-300 ease-out',
          'top-8', // below announcement bar
          scrolled
            ? 'bg-[#090909]/80 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-[#090909]/40 backdrop-blur-md'
        )}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
              aria-label="ExamForge AI Home"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/15 transition-all duration-200 group-hover:bg-[#3B82F6]/15 group-hover:border-[#3B82F6]/25">
                <BookOpen className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-foreground">
                ExamForge<span className="forge-gradient-text"> AI</span>
              </span>
            </Link>

            {/* Desktop Nav with Mega Menus */}
            <div className="hidden lg:flex lg:items-center lg:gap-0.5">
              <MegaMenu
                label="Products"
                items={productItems}
                isOpen={openMenu === 'products'}
                onToggle={() => setOpenMenu(openMenu === 'products' ? null : 'products')}
                onClose={() => setOpenMenu(null)}
                currentPath={pathname}
              />
              <MegaMenu
                label="Solutions"
                items={solutionItems}
                isOpen={openMenu === 'solutions'}
                onToggle={() => setOpenMenu(openMenu === 'solutions' ? null : 'solutions')}
                onClose={() => setOpenMenu(null)}
                currentPath={pathname}
              />
              <MegaMenu
                label="Resources"
                items={resourceItems}
                isOpen={openMenu === 'resources'}
                onToggle={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}
                onClose={() => setOpenMenu(null)}
                currentPath={pathname}
              />
              {topNavLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative px-3 py-1.5 text-[13px] font-medium',
                      'transition-colors duration-150',
                      isActive
                        ? 'text-foreground'
                        : 'text-foreground/60 hover:text-foreground/90'
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-underline"
                        className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 h-[1.5px] w-4 rounded-full bg-[#22D3EE]"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Desktop CTAs + Search */}
            <div className="hidden lg:flex lg:items-center lg:gap-3">
              {/* Search shortcut pill */}
              <Link
                href="/docs"
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1 text-[12px] text-foreground/60',
                  'rounded-md border border-white/[0.06] bg-white/[0.02]',
                  'forge-input-glow transition-colors duration-150',
                  'hover:text-foreground/60 hover:border-white/[0.1]'
                )}
                aria-label="Search documentation (Ctrl+K)"
              >
                <Search className="h-3 w-3" aria-hidden="true" />
                <span>Search</span>
                <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-white/[0.06] bg-white/[0.03] px-1 text-[10px] font-medium text-foreground/30">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </Link>

              <Link
                href="/login"
                className="text-[13px] font-medium text-foreground/60 hover:text-foreground/80 transition-colors duration-150"
              >
                Log in
              </Link>

              <Button
                size="sm"
                className={cn(
                  'h-8 px-3.5 text-[13px] font-medium rounded-md',
                  // #2563EB: AA-compliant shade of electric blue (white 13px text = 5.2:1)
                  'bg-[#2563EB] text-white',
                  'hover:bg-[#2563EB]/90 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
                  'transition-all duration-200'
                )}
                asChild
              >
                <Link href="/register">
                  Get Started
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-md text-foreground/60 hover:text-foreground transition-colors duration-150"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer with backdrop overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Slide-in drawer from right */}
            <motion.div
              ref={mobileNavRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed top-0 right-0 bottom-0 z-[80] w-[85vw] max-w-sm forge-glass-floating border-l border-white/[0.06] shadow-2xl lg:hidden overflow-y-auto"
              role="dialog"
              aria-label="Mobile navigation"
              aria-modal="true"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <Link href="/" className="flex items-center gap-2" aria-label="ExamForge AI Home">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/15">
                    <BookOpen className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                  </div>
                  <span className="text-[15px] font-bold tracking-tight text-foreground">
                    ExamForge<span className="forge-gradient-text"> AI</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center h-8 w-8 rounded-md text-foreground/40 hover:text-foreground transition-colors duration-150"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Mobile Products */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.1em]">Products</p>
                  <div className="space-y-px">
                    {productItems.slice(0, 6).map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href.split('#')[0]
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                            isActive
                              ? 'text-foreground bg-white/[0.04]'
                              : 'text-foreground/50 hover:text-foreground hover:bg-white/[0.03]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-foreground/30 flex-shrink-0" />
                          {item.title}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Solutions */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.1em]">Solutions</p>
                  <div className="space-y-px">
                    {solutionItems.slice(0, 4).map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href.split('#')[0]
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                            isActive
                              ? 'text-foreground bg-white/[0.04]'
                              : 'text-foreground/50 hover:text-foreground hover:bg-white/[0.03]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-foreground/30 flex-shrink-0" />
                          {item.title}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Resources */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.1em]">Resources</p>
                  <div className="space-y-px">
                    {resourceItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href.split('#')[0]
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                            isActive
                              ? 'text-foreground bg-white/[0.04]'
                              : 'text-foreground/50 hover:text-foreground hover:bg-white/[0.03]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-foreground/30 flex-shrink-0" />
                          {item.title}
                          {item.badge && (
                            <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none bg-[#3B82F6]/15 text-[#3B82F6]">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Top Links */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.1em]">Company</p>
                  <div className="space-y-px">
                    {topNavLinks.map((link) => {
                      const isActive = pathname === link.href
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            'block rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                            isActive
                              ? 'text-foreground bg-white/[0.04]'
                              : 'text-foreground/50 hover:text-foreground hover:bg-white/[0.03]'
                          )}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Search */}
                <Link
                  href="/docs"
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-foreground/50 hover:text-foreground hover:bg-white/[0.03] transition-colors duration-150"
                >
                  <Search className="h-3.5 w-3.5 text-foreground/30 flex-shrink-0" />
                  Search docs
                  <kbd className="ml-auto inline-flex h-4 items-center gap-0.5 rounded border border-white/[0.06] bg-white/[0.03] px-1 text-[10px] font-medium text-foreground/30">
                    <span className="text-[9px]">⌘</span>K
                  </kbd>
                </Link>

                {/* Mobile CTAs */}
                <div className="pt-4 space-y-2 border-t border-white/[0.06]">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-[13px] font-medium rounded-md border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150"
                    asChild
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button
                    className={cn(
                      'w-full h-9 text-[13px] font-medium rounded-md',
                      'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90',
                      'hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
                      'transition-all duration-200'
                    )}
                    asChild
                  >
                    <Link href="/register">
                      Get Started
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
