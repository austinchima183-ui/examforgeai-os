'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useRef, useCallback, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MAIN_NAV, type NavSection, type NavItem } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import {
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Sidebar Component (AI OS Shell — World-Class)
// ============================================================================
// Desktop sidebar navigation with:
// - ARIA navigation landmark (role="navigation", aria-label)
// - aria-current="page" for active navigation items
// - Roving tabindex for keyboard navigation (arrow keys)
// - Accessible section labels with aria-labelledby
// - Collapsed state with accessible tooltips
// - Skip-to-section keyboard shortcuts
// - Near-invisible sidebar (bg blends with main), subtle borders,
//   framer-motion active indicator, premium hover states
// WCAG 2.2 AA: 1.3.1, 2.4.3, 2.4.7, 4.1.2
// ============================================================================

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

// ──────────────────────────────────────────────────────────────
// Nav Item Component
// ──────────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  isActive,
  collapsed,
  itemIndex,
  onKeyDown,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  itemIndex: number
  onKeyDown?: (_event: KeyboardEvent<HTMLAnchorElement>, _index: number) => void
}) {
  const Icon: LucideIcon = item.icon
  const linkRef = useRef<HTMLAnchorElement>(null)

  const linkContent = (
    <Link
      ref={linkRef}
      href={item.href}
      data-nav-item=""
      // Roving tabindex: only the active/first item is in the tab order
      tabIndex={isActive ? 0 : -1}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium',
        'transition-all duration-200 ease-out',
        // Focus ring
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
        // Active state: bright text, primary icon
        isActive
          ? 'text-foreground/90'
          : // Inactive: nearly invisible until hover
            'text-foreground/60',
        // Hover: subtle bg slide, brighter text, left border
        !isActive && 'hover:bg-[#1A1A1A] hover:text-foreground/70',
        collapsed && 'justify-center px-0'
      )}
      onKeyDown={(e) => onKeyDown?.(e, itemIndex)}
    >
      {/* Active indicator: glowing left bar with framer-motion layoutId */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-primary"
          style={{
            boxShadow: '0 0 6px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.25)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}

      {/* Hover left border indicator (non-active only) */}
      {!isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 rounded-full bg-foreground/20 transition-all duration-200 group-hover:h-3" />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-all duration-200',
          isActive
            ? 'text-primary'
            : 'text-foreground/60 group-hover:text-foreground/60'
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="truncate transition-colors duration-200">{item.title}</span>
      )}
      {!collapsed && item.badge && (
        <Badge
          variant={item.badgeVariant ?? 'default'}
          className={cn(
            'ml-auto text-[10px] px-1.5 py-0 h-4 transition-all duration-200',
            isActive && 'bg-primary/15 text-primary border-primary/20'
          )}
        >
          {item.badge}
        </Badge>
      )}
      {/* Screen reader announcement for active items */}
      {isActive && <VisuallyHidden>(current page)</VisuallyHidden>}
    </Link>
  )

  // When collapsed, wrap in tooltip to show the label
  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="forge-glass-elevated border-[rgba(255,255,255,0.06)]">
          {item.title}
          {item.badge && ` (${item.badge})`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

// ──────────────────────────────────────────────────────────────
// Sidebar Component
// ──────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useAuthStore()
  const navRef = useRef<HTMLElement>(null)

  // Check if a nav item is active
  const isItemActive = useCallback((href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }, [pathname])

  // Filter navigation sections based on user role
  const filteredNav = useMemo(() => {
    if (!role) return MAIN_NAV

    return MAIN_NAV.map((section: NavSection) => ({
      ...section,
      items: section.items.filter((item: NavItem) => {
        if (!item.requiredRoles || item.requiredRoles.length === 0) return true
        return item.requiredRoles.includes(role)
      }),
    })).filter((section: NavSection) => section.items.length > 0)
  }, [role])

  // Keyboard navigation handler for arrow keys within the nav
  const handleNavKeyDown = useCallback(
    (event: KeyboardEvent<HTMLAnchorElement>, currentIndex: number) => {
      const nav = navRef.current
      if (!nav) return

      // Get all nav links in the sidebar
      const navLinks = Array.from(
        nav.querySelectorAll<HTMLAnchorElement>('[data-nav-item]')
      )

      let newIndex = currentIndex

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          newIndex = currentIndex + 1
          if (newIndex >= navLinks.length) newIndex = 0 // Wrap
          break

        case 'ArrowUp':
          event.preventDefault()
          newIndex = currentIndex - 1
          if (newIndex < 0) newIndex = navLinks.length - 1 // Wrap
          break

        case 'Home':
          event.preventDefault()
          newIndex = 0
          break

        case 'End':
          event.preventDefault()
          newIndex = navLinks.length - 1
          break

        default:
          return
      }

      // Move focus and update tabindex
      const targetLink = navLinks[newIndex]
      if (targetLink) {
        // Update roving tabindex
        navLinks.forEach((link) => link.setAttribute('tabIndex', '-1'))
        targetLink.setAttribute('tabIndex', '0')
        targetLink.focus()
      }
    },
    []
  )

  // Generate unique IDs for section labels (aria-labelledby)
  const getSectionId = (label: string) =>
    `nav-section-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-[#090909] transition-all duration-300 ease-out',
        // Extremely subtle border — nearly invisible
        'border-[rgba(255,255,255,0.04)]',
        collapsed ? 'w-[52px]' : 'w-[220px]'
      )}
      aria-label="Main navigation"
    >
      {/* Logo / Brand — Compact, hover glow on icon */}
      <div className={cn(
        'flex items-center h-12 px-3 shrink-0',
        collapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <div
          className={cn(
            'h-7 w-7 rounded-md bg-gradient-to-br from-primary to-neural flex items-center justify-center shrink-0',
            'transition-shadow duration-300',
            'hover:shadow-[0_0_12px_rgba(59,130,246,0.35),0_0_24px_rgba(34,211,238,0.15)]'
          )}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-white"
            aria-hidden="true"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex items-baseline gap-0.5 overflow-hidden">
            <span className="text-sm font-semibold tracking-tight text-foreground/80">ExamForge</span>
            <span className="text-sm font-semibold tracking-tight forge-gradient-text">AI</span>
          </div>
        )}
      </div>

      {/* Navigation with ARIA landmark */}
      <ScrollArea className="flex-1 py-1">
        <nav
          ref={navRef}
          className="flex flex-col gap-0.5 px-2"
          aria-label="Primary"
          role="navigation"
        >
          {filteredNav.map((section: NavSection, sectionIndex: number) => {
            const sectionId = getSectionId(section.label)
            return (
              <div
                key={section.label}
                role="group"
                aria-labelledby={!collapsed ? sectionId : undefined}
                className="animate-fade-in"
                style={{ animationDelay: `${sectionIndex * 50}ms` }}
              >
                {/* Section label — tiny caps, extending line, muted */}
                {!collapsed && (
                  <div className="flex items-center gap-2 px-2 py-2" id={sectionId}>
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/60 whitespace-nowrap">
                      {section.label}
                    </span>
                    <span className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" aria-hidden="true" />
                  </div>
                )}

                {/* Collapsed: use aria-label on group for screen readers */}
                {collapsed && (
                  <VisuallyHidden>
                    <span id={sectionId}>{section.label}</span>
                  </VisuallyHidden>
                )}

                {/* Section separator when collapsed */}
                {collapsed && sectionIndex > 0 && (
                  <Separator className="my-1.5 mx-1 bg-[rgba(255,255,255,0.04)]" />
                )}

                {section.items.map((item: NavItem, itemIndex: number) => {
                  // Calculate global item index across all sections
                  let globalIndex = 0
                  for (let s = 0; s < sectionIndex; s++) {
                    globalIndex += filteredNav[s].items.length
                  }
                  globalIndex += itemIndex

                  return (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      isActive={isItemActive(item.href)}
                      collapsed={collapsed}
                      itemIndex={globalIndex}
                      onKeyDown={handleNavKeyDown}
                    />
                  )
                })}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* AI Ready indicator — subtle: small cyan dot, ping, "AI", version */}
      {!collapsed && (
        <div className="mx-3 mb-1.5 flex items-center gap-2 px-2 py-1.5">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neural opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neural" />
          </span>
          <span className="text-[11px] font-medium text-neural/70">AI</span>
          <span className="text-[10px] text-foreground/60">v2.0</span>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mb-1.5 px-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="relative flex h-1.5 w-1.5 cursor-default">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neural opacity-50" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neural" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="forge-glass-elevated border-[rgba(255,255,255,0.06)]">
              AI Ready · v2.0
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Collapse Toggle — minimal, just a chevron */}
      <div className="border-t border-[rgba(255,255,255,0.04)] p-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'w-full h-7 text-foreground/60 hover:text-foreground/70 hover:bg-[#1A1A1A] transition-all duration-200 rounded-md'
          )}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <VisuallyHidden>Expand sidebar</VisuallyHidden>
            </>
          ) : (
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          )}
        </Button>
      </div>
    </aside>
  )
}
