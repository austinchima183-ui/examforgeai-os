'use client'

import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  Settings,
  User,
  LogOut,
  CreditCard,
  HelpCircle,
  Sparkles,
  Command,
} from 'lucide-react'
import { useGlobalSearch } from '@/components/search/global-search-provider'
import { useAiCopilot } from '@/components/ai/ai-copilot-provider'

// ============================================================================
// ExamForge AI — Header Component (AI OS Shell — World-Class)
// ============================================================================
// Compact 48px header with glass effect, command-bar search, breadcrumbs,
// theme toggle, AI copilot trigger, notification bell, and user menu.
// Inspired by Vercel/Linear — minimal, dense, purposeful.
// ============================================================================

interface HeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

// ──────────────────────────────────────────────────────────────
// Helper: Get user initials for avatar fallback
// ──────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ──────────────────────────────────────────────────────────────
// Role display label
// ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
}

// ──────────────────────────────────────────────────────────────
// Header Component
// ──────────────────────────────────────────────────────────────

export function Header({ sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, clearAuth } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const supabase = useSupabase()
  const { openSearch } = useGlobalSearch()
  const { toggleCopilot } = useAiCopilot()

  // Derive user display info
  const displayName = user?.fullName ?? 'User'
  const displayEmail = user?.email ?? ''
  const avatarUrl = user?.avatarUrl
  const roleLabel = role ? ROLE_LABELS[role] ?? role : ''

  // Handle logout
  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
    } catch {
      // Supabase may be unavailable in dev adapter mode — still clear local auth
    }
    clearAuth()
    router.push('/login')
  }

  return (
    <header
      className="z-30 flex h-12 shrink-0 items-center gap-3 border-b bg-[#090909]/80 backdrop-blur-2xl px-4 sm:px-5 border-[rgba(255,255,255,0.04)]"
      role="banner"
    >
      {/* Mobile menu button — compact */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0 h-7 w-7 text-foreground/35 hover:text-foreground/70 hover:bg-[#1A1A1A]"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      {/* Breadcrumbs — small, muted */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs pathname={pathname} />
      </div>

      {/* Right-side actions — compact ghost buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search — Pill command bar */}
        <button
          onClick={openSearch}
          className="hidden sm:flex items-center gap-2 h-7 w-[260px] rounded-full border border-[rgba(255,255,255,0.06)] bg-[#111111] px-3 text-[13px] text-foreground/35 forge-input-glow transition-all duration-200 hover:border-[rgba(255,255,255,0.1)] hover:bg-[#151515] hover:text-foreground/60"
          aria-label="Search (⌘K)"
        >
          <Search className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left text-foreground/30">Search or type a command...</span>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-[rgba(255,255,255,0.06)] bg-[#1A1A1A] px-1 font-mono text-[9px] font-medium text-foreground/30">
            <Command className="h-2 w-2" aria-hidden="true" />K
          </kbd>
        </button>
        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden shrink-0 h-7 w-7 text-foreground/30 hover:text-foreground/70 hover:bg-[#1A1A1A]"
          aria-label="Search (⌘K)"
          onClick={openSearch}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        {/* Theme toggle — very subtle, almost hidden */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground/20 hover:text-foreground/50 hover:bg-[#1A1A1A]"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
          <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* AI Copilot trigger — sparkles, neural-glow on hover */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open AI Copilot"
          onClick={toggleCopilot}
          className="h-7 w-7 text-foreground/30 hover:text-neural group transition-all duration-200 hover:bg-[#1A1A1A] hover:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
        >
          <Sparkles className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" aria-hidden="true" />
        </Button>

        {/* Notification bell — forge-glow on badge */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 text-foreground/30 hover:text-foreground/70 hover:bg-[#1A1A1A]"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          onClick={() => router.push('/notifications')}
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground forge-glow">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User menu dropdown — small avatar, thin ring */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-7 w-7 rounded-full ring-1 ring-[rgba(255,255,255,0.06)] ring-offset-0 transition-all duration-200 hover:ring-primary/25 hover:scale-[1.05]"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-[10px] font-semibold bg-[#1A1A1A] text-foreground/60">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52 forge-glass-elevated border-[rgba(255,255,255,0.06)]" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {displayEmail}
                </p>
                {roleLabel && (
                  <Badge variant="secondary" className="w-fit mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                    {roleLabel}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.04)]" />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2 cursor-pointer">
                <User className="h-3.5 w-3.5 text-foreground/40" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/billing')} className="gap-2 cursor-pointer">
                <CreditCard className="h-3.5 w-3.5 text-foreground/40" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 cursor-pointer">
                <Settings className="h-3.5 w-3.5 text-foreground/40" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <HelpCircle className="h-3.5 w-3.5 text-foreground/40" />
                <span>Help & Support</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.04)]" />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
