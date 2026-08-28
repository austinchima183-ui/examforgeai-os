'use client'

// ============================================================================
// ExamForge AI — Command Palette (Cmd+K)
// ============================================================================
// A Linear/Notion-style command palette that provides instant navigation,
// search, and quick actions. Wraps the existing GlobalSearch infrastructure
// with enhanced features: recent searches (localStorage), contextual quick
// actions based on user role, and Framer Motion animations.
// ============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  School,
  Sparkles,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Send,
  LayoutDashboard,
  HelpCircle,
  Brain,
  Store,
  type LucideIcon,
} from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface CommandItemDef {
  id: string
  label: string
  subtitle?: string
  icon: string | LucideIcon
  href?: string
  action?: () => void | Promise<void>
  category: string
  keywords?: string[]
}

interface SearchResultSet {
  id: string
  title: string
  subtitle: string
  type: string
  href: string
  icon: string
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'examforge-recent-searches'
const MAX_RECENT_SEARCHES = 8
const DEBOUNCE_MS = 200

const ICON_MAP: Record<string, LucideIcon> = {
  School,
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  Settings,
  Brain,
  Store,
  Search,
  Bell: Settings,
}

// ──────────────────────────────────────────────────────────────
// Quick Actions by Role
// ──────────────────────────────────────────────────────────────

function getQuickActions(role: string, router: ReturnType<typeof useRouter>): CommandItemDef[] {
  const base: CommandItemDef[] = [
    {
      id: 'go-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      category: 'Navigation',
      keywords: ['home', 'main'],
    },
    {
      id: 'go-settings',
      label: 'Go to Settings',
      icon: Settings,
      href: '/settings',
      category: 'Navigation',
      keywords: ['preferences', 'config'],
    },
    {
      id: 'go-analytics',
      label: 'View Analytics',
      icon: BarChart3,
      href: '/analytics',
      category: 'Navigation',
      keywords: ['stats', 'reports', 'data'],
    },
  ]

  const teacherActions: CommandItemDef[] = [
    {
      id: 'create-exam',
      label: 'Create Exam',
      icon: Plus,
      href: '/cbt',
      category: 'Actions',
      keywords: ['new', 'exam', 'test'],
    },
    {
      id: 'generate-questions',
      label: 'Generate Questions (AI)',
      icon: Sparkles,
      href: '/cbt',
      category: 'Actions',
      keywords: ['ai', 'auto', 'create'],
    },
    {
      id: 'go-question-bank',
      label: 'Go to Question Bank',
      icon: HelpCircle,
      href: '/question-bank',
      category: 'Navigation',
      keywords: ['questions', 'bank', 'library'],
    },
    {
      id: 'go-students',
      label: 'View Students',
      icon: GraduationCap,
      href: '/students',
      category: 'Navigation',
      keywords: ['learners', 'class'],
    },
  ]

  const adminActions: CommandItemDef[] = [
    {
      id: 'add-student',
      label: 'Add Student',
      icon: Plus,
      href: '/students',
      category: 'Actions',
      keywords: ['new', 'student', 'enroll'],
    },
    {
      id: 'add-teacher',
      label: 'Add Teacher',
      icon: Plus,
      href: '/teachers',
      category: 'Actions',
      keywords: ['new', 'teacher', 'staff'],
    },
    {
      id: 'add-school',
      label: 'Add School',
      icon: Plus,
      href: '/schools',
      category: 'Actions',
      keywords: ['new', 'school', 'register'],
    },
    {
      id: 'go-users',
      label: 'Manage Users',
      icon: Users,
      href: '/admin/users',
      category: 'Navigation',
      keywords: ['admin', 'people', 'accounts'],
    },
  ]

  const studentActions: CommandItemDef[] = [
    {
      id: 'go-exams',
      label: 'My Exams',
      icon: FileText,
      href: '/cbt',
      category: 'Navigation',
      keywords: ['tests', 'upcoming'],
    },
    {
      id: 'go-results',
      label: 'My Results',
      icon: BarChart3,
      href: '/results',
      category: 'Navigation',
      keywords: ['scores', 'grades'],
    },
    {
      id: 'go-ai-tutor',
      label: 'AI Tutor',
      icon: Brain,
      href: '/student/ai-tutor',
      category: 'Navigation',
      keywords: ['tutor', 'learn', 'help'],
    },
  ]

  switch (role) {
    case 'super_admin':
      return [...base, ...adminActions, ...teacherActions]
    case 'school_admin':
      return [...base, ...adminActions, ...teacherActions]
    case 'teacher':
      return [...base, ...teacherActions]
    case 'student':
      return [...base, ...studentActions]
    case 'parent':
      return [...base, {
        id: 'go-child-progress',
        label: "View Child's Progress",
        icon: BarChart3,
        href: '/parent/child-progress',
        category: 'Navigation',
        keywords: ['children', 'monitor', 'grades'],
      }]
    default:
      return base
  }
}

// ──────────────────────────────────────────────────────────────
// Recent Searches Helper
// ──────────────────────────────────────────────────────────────

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentSearches().filter(s => s !== query)
    const updated = [query, ...existing].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // localStorage unavailable
  }
}

// ──────────────────────────────────────────────────────────────
// Command Palette Component
// ──────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: string
}

export function CommandPalette({ open, onOpenChange, userRole = 'student' }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultSet[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery('')
      setSearchResults([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results ?? [])
        }
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const handleSelect = useCallback((item: CommandItemDef) => {
    // Save search to recent
    if (query) {
      addRecentSearch(query)
    }

    onOpenChange(false)

    if (item.href) {
      router.push(item.href)
    } else if (item.action) {
      item.action()
    }
  }, [query, onOpenChange, router])

  const handleSelectSearchResult = useCallback((result: SearchResultSet) => {
    if (query) {
      addRecentSearch(query)
    }

    onOpenChange(false)
    router.push(result.href)
  }, [query, onOpenChange, router])

  const handleRecentSearchClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  // Build quick actions for the current role
  const quickActions = useMemo(
    () => getQuickActions(userRole, router),
    [userRole, router]
  )

  // Convert search results to command items
  const searchCommandItems = useMemo<CommandItemDef[]>(
    () => searchResults.map(r => ({
      id: r.id,
      label: r.title,
      subtitle: r.subtitle,
      icon: ICON_MAP[r.icon] ?? Search,
      href: r.href,
      category: r.type.charAt(0).toUpperCase() + r.type.slice(1),
    })),
    [searchResults]
  )

  // Group items by category
  const groupedSearchResults = useMemo(() => {
    const groups: Record<string, CommandItemDef[]> = {}
    for (const item of searchCommandItems) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [searchCommandItems])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-[640px] -translate-x-1/2">
            <Command className="rounded-2xl border border-border/30 shadow-2xl forge-glass-floating backdrop-blur-md text-popover-foreground">
              <div className="flex items-center border-b border-border/20 px-4">
                <Search className="mr-2 h-4 w-4 shrink-0 text-cyan-400" />
                <CommandInput
                  placeholder="Type a command or search..."
                  value={query}
                  onValueChange={setQuery}
                  className="border-0 focus:ring-0 forge-input-glow"
                />
              </div>
              <CommandList className="max-h-[400px] overflow-y-auto overscroll-contain">
                <CommandEmpty>
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Search className="h-4 w-4" />
                      </motion.div>
                      Searching...
                    </div>
                  ) : query ? (
                    'No results found.'
                  ) : null}
                </CommandEmpty>

                {/* Recent Searches */}
                {!query && recentSearches.length > 0 && (
                  <>
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <CommandItem
                          key={`recent-${i}`}
                          value={`recent:${search}`}
                          onSelect={() => handleRecentSearchClick(search)}
                          className="gap-2 hover:bg-white/[0.04]"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{search}</span>
                        </CommandItem>
                      ))}
                      <CommandItem
                        value="clear-recent"
                        onSelect={handleClearRecent}
                        className="gap-2 text-muted-foreground hover:bg-white/[0.04]"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear recent searches</span>
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                {/* Quick Actions */}
                {!query && (
                  <>
                    <CommandGroup heading="Quick Actions">
                      {quickActions.map(item => (
                        <CommandItem
                          key={item.id}
                          value={`${item.id}:${item.label}`}
                          onSelect={() => handleSelect(item)}
                          className="gap-2 hover:bg-white/[0.04]"
                        >
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                          {item.keywords && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {item.keywords.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                {/* Search Results by Category */}
                {Object.entries(groupedSearchResults).map(([category, items]) => (
                  <CommandGroup key={category} heading={category}>
                    {items.map(item => (
                      <CommandItem
                        key={item.id}
                        value={`${item.id}:${item.label}`}
                        onSelect={() => handleSelectSearchResult(searchResults.find(r => r.id === item.id)!)}
                        className="gap-2 hover:bg-white/[0.04]"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">{item.label}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{category}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
              <div className="border-t border-border/20 px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground bg-white/[0.02]">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">esc</kbd>
                  Close
                </span>
              </div>
            </Command>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ──────────────────────────────────────────────────────────────
// Command Palette Provider with Cmd+K
// ──────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

interface CommandPaletteContextValue {
  isOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

interface CommandPaletteProviderProps {
  children: ReactNode
  userRole?: string
}

export function CommandPaletteProvider({ children, userRole }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openPalette = useCallback(() => setIsOpen(true), [])
  const closePalette = useCallback(() => setIsOpen(false), [])
  const togglePalette = useCallback(() => setIsOpen(prev => !prev), [])

  // NOTE: Cmd+K keyboard shortcut is NOT registered here.
  // It is registered by GlobalSearchProvider (the primary search trigger).
  // CommandPalette opens/closes via the `open` prop controlled by its parent.
  // This avoids a double-registration conflict when both providers are active.

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openPalette, closePalette, togglePalette }}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} userRole={userRole} />
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a <CommandPaletteProvider>')
  }
  return context
}

export default CommandPalette
