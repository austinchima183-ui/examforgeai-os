'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MAIN_NAV, type NavSection, type NavItem } from '@/lib/constants/routes'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { type LucideIcon } from 'lucide-react'

// ============================================================================
// ExamForge AI OS — Mobile Navigation
// ============================================================================
// Sheet-based mobile nav. forge-glass-elevated surface, clean items,
// AI status indicator. Minimal, calm, focused.
// ============================================================================

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ──────────────────────────────────────────────────────────────
// Mobile Nav Item
// ──────────────────────────────────────────────────────────────

function MobileNavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon: LucideIcon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/40',
        isActive
          ? 'bg-white/[0.06] text-foreground/90'
          : 'text-foreground/60 hover:text-foreground/60 hover:bg-white/[0.03]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.title}</span>
      {item.badge && (
        <Badge
          variant={item.badgeVariant ?? 'default'}
          className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-cyan-400/10 text-cyan-400/70 border-cyan-400/20"
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  )
}

// ──────────────────────────────────────────────────────────────
// Mobile Navigation Component
// ──────────────────────────────────────────────────────────────

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname()
  const { role } = useAuthStore()

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

  const isItemActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLinkClick = () => {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 border-r border-white/[0.04]">
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-white/[0.04]">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-cyan-400/70"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="text-foreground/90 font-semibold tracking-tight">ExamForge</span>
            {/* AI Status Indicator */}
            <span className="status-live text-[10px] text-cyan-400/60 ml-auto">AI Online</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu for ExamForge AI
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-5rem)]">
          <nav className="flex flex-col gap-1 p-2">
            {filteredNav.map((section: NavSection, sectionIndex: number) => (
              <div key={section.label}>
                {/* Section label */}
                <div className="px-3 py-2 mt-2 first:mt-0">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/20">
                    {section.label}
                  </span>
                </div>

                {/* Section items */}
                {section.items.map((item: NavItem) => (
                  <MobileNavItem
                    key={item.href}
                    item={item}
                    isActive={isItemActive(item.href)}
                    onClick={handleLinkClick}
                  />
                ))}

                {/* Subtle separator between sections */}
                {sectionIndex < filteredNav.length - 1 && (
                  <div className="my-2 h-px bg-white/[0.04]" />
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
