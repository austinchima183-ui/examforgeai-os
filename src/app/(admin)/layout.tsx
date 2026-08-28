'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  Mail,
  Calendar,
  TrendingUp,
  Contact,
  LayoutDashboard,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// ============================================================================
// ExamForge AI — Admin Layout (Marketing Admin Panel)
// ============================================================================
// Provides a sidebar navigation for the marketing admin panel with
// responsive mobile drawer. Uses consistent styling with the main app.
// ============================================================================

const navItems = [
  {
    label: 'Dashboard',
    href: '/marketing',
    icon: LayoutDashboard,
  },
  {
    label: 'Leads',
    href: '/marketing/leads',
    icon: Users,
  },
  {
    label: 'Contacts',
    href: '/marketing/contacts',
    icon: Contact,
  },
  {
    label: 'Newsletter',
    href: '/marketing/newsletter',
    icon: Mail,
  },
  {
    label: 'Demo Bookings',
    href: '/marketing/demos',
    icon: Calendar,
  },
  {
    label: 'Analytics',
    href: '/marketing/analytics',
    icon: TrendingUp,
  },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('flex items-center border-b border-border px-4 h-14', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Marketing Admin</span>
          </div>
        )}
        {collapsed && <BarChart3 className="h-5 w-5 text-primary" />}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2" role="navigation" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/marketing' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border bg-card w-64 transition-all duration-200" aria-label="Admin sidebar">
        <SidebarContent collapsed={false} />
      </aside>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-40">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center h-14 border-b border-border px-4 bg-card">
          <div className="md:hidden w-10" />
          <h1 className="text-sm font-medium text-muted-foreground">ExamForge AI &mdash; Marketing Admin</h1>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
