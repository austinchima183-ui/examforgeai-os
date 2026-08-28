'use client';

// ============================================================================
// ExamForge AI — Global Search (Cmd+K Command Palette)
// ============================================================================
// A Linear/Notion/Raycast-style command palette that lets users instantly
// navigate, search, and take actions from anywhere in the app.
// Features: fuzzy matching, recent searches, AI suggestions, role-based
// navigation, server-side entity search, Framer Motion animations.
// ============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  Brain,
  Sparkles,
  ArrowRight,
  Clock,
  Hash,
  School,
  Shield,
  CreditCard,
  Bell,
  HelpCircle,
  Plus,
  LayoutDashboard,
  Store,
  Target,
  FolderOpen,
  CalendarDays,
  ClipboardList,
  Presentation,
  PenTool,
  MessageSquare,
  BookMarked,
  Lightbulb,
  Globe,
  Activity,
  Database,
  Cpu,
  Wallet,
  Ticket,
  FileSpreadsheet,
  UserCog,
  Lock,
  type LucideIcon,
} from 'lucide-react';

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { MAIN_NAV, ROUTE_META, type NavItem } from '@/lib/constants/routes';
import type { UserRole } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface SearchItem {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Description/breadcrumb */
  description: string;
  /** Navigation href */
  href: string;
  /** Icon component name */
  icon: LucideIcon;
  /** Category for grouping */
  category: SearchCategory;
  /** Optional keyboard shortcut label */
  shortcut?: string;
  /** Optional badge text */
  badge?: string;
}

type SearchCategory =
  | 'recent'
  | 'navigation'
  | 'students'
  | 'teachers'
  | 'exams'
  | 'questions'
  | 'schools'
  | 'marketplace'
  | 'notifications'
  | 'actions'
  | 'ai';

interface ServerSearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  href: string;
  icon: string;
}

interface ServerSearchResponse {
  results: ServerSearchResult[];
  total: number;
  query: string;
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'examforge-recent-searches';
const MAX_RECENT_SEARCHES = 5;

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  recent: 'Recent',
  navigation: 'Navigation',
  students: 'Students',
  teachers: 'Teachers',
  exams: 'Exams',
  questions: 'Questions',
  schools: 'Schools',
  marketplace: 'Marketplace',
  notifications: 'Notifications',
  actions: 'Actions',
  ai: 'Ask AI',
};

const CATEGORY_ORDER: SearchCategory[] = [
  'recent',
  'ai',
  'navigation',
  'actions',
  'students',
  'teachers',
  'exams',
  'questions',
  'schools',
  'marketplace',
  'notifications',
];

// Map server icon strings to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  School,
  GraduationCap,
  BookOpen,
  Users,
  HelpCircle,
  FileText,
  Bell,
  Store,
  Brain,
  Search,
  Settings,
  BarChart3,
  LayoutDashboard,
  Shield,
  CreditCard,
  Target,
  FolderOpen,
  CalendarDays,
  ClipboardList,
  Presentation,
  PenTool,
  MessageSquare,
  Sparkles,
  BookMarked,
  Lightbulb,
  Globe,
  Activity,
  Database,
  Cpu,
  Wallet,
  Ticket,
  FileSpreadsheet,
  UserCog,
  Lock,
  Hash,
  Plus,
  ArrowRight,
  Clock,
};

// Common actions available in the command palette
const COMMON_ACTIONS: SearchItem[] = [
  {
    id: 'action:create-exam',
    title: 'Create Exam',
    description: 'Create a new exam',
    href: '/cbt',
    icon: Plus,
    category: 'actions',
    shortcut: '⌘N',
  },
  {
    id: 'action:add-student',
    title: 'Add Student',
    description: 'Register a new student',
    href: '/students',
    icon: GraduationCap,
    category: 'actions',
  },
  {
    id: 'action:add-teacher',
    title: 'Add Teacher',
    description: 'Register a new teacher',
    href: '/teachers',
    icon: BookOpen,
    category: 'actions',
  },
  {
    id: 'action:generate-questions',
    title: 'Generate Questions',
    description: 'AI-powered question generation',
    href: '/teacher/content-assistant',
    icon: Sparkles,
    category: 'actions',
    badge: 'AI',
  },
  {
    id: 'action:view-analytics',
    title: 'View Analytics',
    description: 'View performance analytics',
    href: '/analytics',
    icon: BarChart3,
    category: 'actions',
  },
  {
    id: 'action:open-ai-tutor',
    title: 'Open AI Tutor',
    description: 'Get help from your AI tutor',
    href: '/student/ai-tutor',
    icon: Brain,
    category: 'actions',
    badge: 'AI',
  },
  {
    id: 'action:open-settings',
    title: 'Open Settings',
    description: 'Application settings',
    href: '/settings',
    icon: Settings,
    category: 'actions',
    shortcut: '⌘,',
  },
];

// Question-like query patterns for AI suggestions
const AI_QUERY_PATTERNS = /^(how|what|why|where|when|who|which|explain|describe|tell|show|help|can|does|is|are|do)/i;

// ──────────────────────────────────────────────────────────────
// Utility: Fuzzy Matching
// ──────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): { matched: boolean; score: number } {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact substring match — highest score
  if (lowerText.includes(lowerQuery)) {
    const index = lowerText.indexOf(lowerQuery);
    // Score: earlier match = higher score, exact match = perfect
    const positionBonus = 1 - index / Math.max(lowerText.length, 1);
    const lengthBonus = lowerQuery.length / Math.max(lowerText.length, 1);
    return { matched: true, score: 80 + positionBonus * 15 + lengthBonus * 5 };
  }

  // Character-by-character fuzzy match
  let qi = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      // Consecutive match bonus
      if (lastMatchIndex === ti - 1) {
        score += 10;
      } else {
        score += 3;
      }
      // Word-boundary bonus
      if (ti === 0 || lowerText[ti - 1] === ' ' || lowerText[ti - 1] === '/') {
        score += 8;
      }
      lastMatchIndex = ti;
      qi++;
    }
  }

  return { matched: qi === lowerQuery.length, score };
}

// ──────────────────────────────────────────────────────────────
// Utility: Recent Searches (localStorage)
// ──────────────────────────────────────────────────────────────

function getRecentSearches(): SearchItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SearchItem[];
    return parsed.slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function addRecentSearch(item: SearchItem): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentSearches();
    // Remove duplicates, then prepend the new item
    const filtered = existing.filter((i) => i.id !== item.id);
    const updated = [{ ...item, category: 'recent' as const }, ...filtered].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// ──────────────────────────────────────────────────────────────
// Component Props
// ──────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ──────────────────────────────────────────────────────────────
// Global Search Component
// ──────────────────────────────────────────────────────────────

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { role, isAuthenticated } = useAuthStore();

  const [query, setQuery] = useState('');
  const [serverResults, setServerResults] = useState<ServerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchItem[]>([]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandRef = useRef<ComponentRef<typeof Command>>(null);

  // ── Load recent searches on open ──
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      // Reset query when opening
      setQuery('');
      setServerResults([]);
      // Focus the input after dialog opens
      requestAnimationFrame(() => {
        const input = commandRef.current?.querySelector('input');
        input?.focus();
      });
    }
  }, [open]);

  // ── Fetch server results with debounce ──
  useEffect(() => {
    if (!query || query.trim().length < 2 || !isAuthenticated) {
      setServerResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const data: ServerSearchResponse = await response.json();
          setServerResults(data.results);
        } else {
          setServerResults([]);
        }
      } catch {
        setServerResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isAuthenticated]);

  // ── Build navigation items filtered by role ──
  const navigationItems = useMemo<SearchItem[]>(() => {
    if (!role) return [];

    const items: SearchItem[] = [];

    for (const section of MAIN_NAV) {
      for (const item of section.items) {
        // Filter by role
        if (item.requiredRoles && !item.requiredRoles.includes(role)) {
          continue;
        }

        // Look up route meta for better description
        const meta = ROUTE_META[item.href as keyof typeof ROUTE_META];

        items.push({
          id: `nav:${item.href}`,
          title: item.title,
          description: meta?.description ?? section.label,
          href: item.href,
          icon: item.icon,
          category: 'navigation',
          badge: item.badge,
        });
      }
    }

    return items;
  }, [role]);

  // ── Build action items filtered by role ──
  const actionItems = useMemo<SearchItem[]>(() => {
    if (!role) return [];

    // Students shouldn't see admin actions
    if (role === 'student') {
      return COMMON_ACTIONS.filter(
        (a) =>
          !a.id.startsWith('action:add-') &&
          !a.id.includes('generate-questions') &&
          a.id !== 'action:view-analytics'
      );
    }

    return COMMON_ACTIONS;
  }, [role]);

  // ── Convert server results to SearchItems ──
  const serverSearchItems = useMemo<SearchItem[]>(() => {
    return serverResults.map((result) => ({
      id: `server:${result.type}:${result.id}`,
      title: result.title,
      description: result.subtitle,
      href: result.href,
      icon: ICON_MAP[result.icon] ?? Hash,
      category: result.type as SearchCategory,
    }));
  }, [serverResults]);

  // ── Fuzzy-filter navigation items ──
  const filteredNavigation = useMemo<SearchItem[]>(() => {
    if (!query.trim()) return navigationItems.slice(0, 8);

    const results = navigationItems
      .map((item) => {
        const titleMatch = fuzzyMatch(query, item.title);
        const descMatch = fuzzyMatch(query, item.description);
        const hrefMatch = fuzzyMatch(query, item.href);
        const bestScore = Math.max(titleMatch.score, descMatch.score, hrefMatch.score);

        return { item, matched: titleMatch.matched || descMatch.matched || hrefMatch.matched, score: bestScore };
      })
      .filter((r) => r.matched)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

    return results.slice(0, 8);
  }, [query, navigationItems]);

  // ── Fuzzy-filter action items ──
  const filteredActions = useMemo<SearchItem[]>(() => {
    if (!query.trim()) return actionItems;

    const results = actionItems
      .map((item) => {
        const titleMatch = fuzzyMatch(query, item.title);
        const descMatch = fuzzyMatch(query, item.description);
        const bestScore = Math.max(titleMatch.score, descMatch.score);

        return { item, matched: titleMatch.matched || descMatch.matched, score: bestScore };
      })
      .filter((r) => r.matched)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

    return results;
  }, [query, actionItems]);

  // ── AI suggestion for question-like queries ──
  const aiSuggestion = useMemo<SearchItem | null>(() => {
    if (!query.trim() || !AI_QUERY_PATTERNS.test(query.trim())) return null;

    return {
      id: 'ai:ask',
      title: `Ask AI: "${query.trim()}"`,
      description: 'Get an AI-powered answer',
      href: '/student/ai-tutor',
      icon: Brain,
      category: 'ai',
      badge: 'AI',
    };
  }, [query]);

  // ── Group all visible results by category ──
  const groupedResults = useMemo(() => {
    const groups = new Map<SearchCategory, SearchItem[]>();

    // Add recent searches when query is empty
    if (!query.trim() && recentSearches.length > 0) {
      groups.set('recent', recentSearches);
    }

    // Add AI suggestion
    if (aiSuggestion) {
      groups.set('ai', [aiSuggestion]);
    }

    // Add navigation
    if (filteredNavigation.length > 0) {
      groups.set('navigation', filteredNavigation);
    }

    // Add actions
    if (filteredActions.length > 0) {
      groups.set('actions', filteredActions);
    }

    // Add server results grouped by type
    if (serverSearchItems.length > 0) {
      for (const item of serverSearchItems) {
        const existing = groups.get(item.category) ?? [];
        existing.push(item);
        groups.set(item.category, existing);
      }
    }

    // Sort groups by defined order
    const sorted = Array.from(groups.entries()).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );

    return sorted;
  }, [query, recentSearches, aiSuggestion, filteredNavigation, filteredActions, serverSearchItems]);

  // ── Handle item selection ──
  const handleSelect = useCallback(
    (item: SearchItem) => {
      // Save to recent searches
      addRecentSearch(item);

      // Close the palette
      onOpenChange(false);

      // Navigate
      router.push(item.href);

      // If AI suggestion, dispatch event to AI Copilot
      if (item.category === 'ai' && query.trim()) {
        const event = new CustomEvent('examforge:copilot:send', {
          detail: { message: query.trim() },
        });
        window.dispatchEvent(event);
      }
    },
    [onOpenChange, router, query]
  );

  // ── Check if there are any results ──
  const hasResults = groupedResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-[640px] forge-glass-floating border border-border/30 rounded-2xl backdrop-blur-md"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search exams, students, or ask AI...
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Command
                ref={commandRef}
                className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-14 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 [&_[cmdk-item]]:rounded-lg"
                filter={() => 1} // Disable built-in filtering; we handle it ourselves
              >
                {/* ── Search Input ── */}
                <div className="flex items-center border-b border-border/20 px-4" data-slot="command-input-wrapper">
                  <Search className="size-5 shrink-0 text-cyan-400" />
                  <CommandInput
                    placeholder="Search exams, students, or ask AI..."
                    value={query}
                    onValueChange={setQuery}
                    className="flex h-14 w-full rounded-md bg-transparent py-3 text-base placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 forge-input-glow"
                  />
                  <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-white/[0.06] px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    esc
                  </kbd>
                </div>

                {/* ── Results List ── */}
                <CommandList className="max-h-[420px] overflow-y-auto overscroll-contain">
                  {!hasResults && query.trim().length > 0 && !isSearching && (
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <Search className="size-8 text-foreground/35" />
                        <p className="text-sm text-muted-foreground">
                          No results found for &ldquo;{query.trim()}&rdquo;
                        </p>
                        {AI_QUERY_PATTERNS.test(query.trim()) && (
                          <button
                            onClick={() => {
                              if (aiSuggestion) handleSelect(aiSuggestion);
                            }}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            <Brain className="size-3.5" />
                            Ask AI instead
                          </button>
                        )}
                      </div>
                    </CommandEmpty>
                  )}

                  {isSearching && (
                    <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Search className="size-4" />
                      </motion.div>
                      Searching...
                    </div>
                  )}

                  {!isSearching &&
                    groupedResults.map(([category, items]) => (
                      <CommandGroup
                        key={category}
                        heading={CATEGORY_LABELS[category]}
                        className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      >
                        {items.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => handleSelect(item)}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-accent-foreground hover:bg-white/[0.04]"
                          >
                            {/* Icon */}
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.06]">
                              <item.icon className="size-4 text-muted-foreground" />
                            </div>

                            {/* Content */}
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <Badge
                                    variant="secondary"
                                    className="h-4 shrink-0 px-1 text-[10px]"
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <span className="truncate text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </div>

                            {/* Shortcut / Arrow */}
                            {item.shortcut ? (
                              <CommandShortcut>{item.shortcut}</CommandShortcut>
                            ) : (
                              <ArrowRight className="size-3 shrink-0 text-foreground/35" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}

                  {/* Show hint when no query */}
                  {!query.trim() && !isSearching && groupedResults.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl forge-glass-surface border border-border/30 forge-card-shadow">
                          <Sparkles className="size-6 text-foreground/40" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Start typing to search...
                      </p>
                      <p className="text-xs text-foreground/55">
                        Try &ldquo;how to create an exam&rdquo; or &ldquo;dashboard&rdquo;
                      </p>
                    </div>
                  )}
                </CommandList>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-border/20 px-3 py-2 text-xs text-muted-foreground bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                      select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
                      close
                    </span>
                  </div>
                  {isSearching && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ●
                      </motion.span>
                      Searching...
                    </span>
                  )}
                </div>
              </Command>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalSearch;
