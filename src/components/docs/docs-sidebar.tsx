'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronRight,
  Menu,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

// ============================================================================
// ExamForge AI — Documentation Sidebar
// ============================================================================
// Client component for documentation sidebar navigation with collapsible
// sections, search filtering, keyboard navigation, and mobile sheet drawer.
// ============================================================================

interface DocArticle {
  slug: string
  title: string
}

interface DocSection {
  slug: string
  title: string
  articles: DocArticle[]
}

interface DocCategory {
  slug: string
  title: string
  icon: string | LucideIcon
  sections: DocSection[]
}

interface DocsSidebarProps {
  categories: DocCategory[]
  activeSlug: string
  basePath: string
}

function ArticleLink({
  article,
  href,
  isActive,
}: {
  article: DocArticle
  href: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-md px-3 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {article.title}
    </Link>
  )
}

function SidebarContent({
  categories,
  activeSlug,
  basePath,
  onNavigate,
}: DocsSidebarProps & { onNavigate?: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const navRef = useRef<HTMLElement>(null)

  // Flatten all articles for keyboard navigation
  const allArticles = categories.flatMap((cat) =>
    cat.sections.flatMap((sec) =>
      sec.articles.map((art) => ({
        ...art,
        href: `${basePath}/${cat.slug}/${sec.slug}/${art.slug}`,
        sectionKey: `${cat.slug}-${sec.slug}`,
      }))
    )
  )

  // Filter articles based on search query
  const filteredCategories = searchQuery
    ? categories
        .map((cat) => ({
          ...cat,
          sections: cat.sections
            .map((sec) => ({
              ...sec,
              articles: sec.articles.filter((art) =>
                art.title.toLowerCase().includes(searchQuery.toLowerCase())
              ),
            }))
            .filter((sec) => sec.articles.length > 0),
        }))
        .filter((cat) => cat.sections.length > 0)
    : categories

  // Compute which sections should be open based on active article and search
  const defaultOpenSections = useMemo(() => {
    const result: Record<string, boolean> = {}
    categories.forEach((cat) => {
      cat.sections.forEach((sec) => {
        const hasActive = sec.articles.some(
          (art) => `${basePath}/${cat.slug}/${sec.slug}/${art.slug}`.endsWith(activeSlug)
        )
        if (hasActive || !searchQuery) {
          result[`${cat.slug}-${sec.slug}`] = true
        }
      })
    })
    return result
  }, [categories, basePath, activeSlug, searchQuery])

  // Merge user-toggled state with computed defaults
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({})
  const openSections = useMemo(() => {
    const merged = { ...defaultOpenSections }
    Object.entries(manualOverrides).forEach(([key, value]) => {
      merged[key] = value
    })
    return merged
  }, [defaultOpenSections, manualOverrides])

  const toggleSection = useCallback((key: string) => {
    setManualOverrides((prev) => ({ ...prev, [key]: !(openSections[key] ?? false) }))
  }, [openSections])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, allArticles.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        const article = allArticles[focusedIndex]
        if (article) {
          window.location.href = article.href
          onNavigate?.()
        }
      }
    },
    [allArticles, focusedIndex, onNavigate]
  )

  return (
    <nav
      ref={navRef}
      aria-label="Documentation navigation"
      onKeyDown={handleKeyDown}
      className="flex h-full flex-col"
    >
      {/* Search input */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            aria-label="Search documentation"
          />
        </div>
      </div>

      {/* Navigation tree */}
      <ScrollArea className="flex-1 px-3">
        <ul role="tree" className="space-y-1 pb-4">
          {filteredCategories.map((category) => {
            const Icon = category.icon
            return (
              <li key={category.slug} role="treeitem" aria-selected={false}>
                <div className="mb-1 flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                  {category.title}
                </div>
                <ul role="group" className="space-y-0.5 pl-2">
                  {category.sections.map((section) => {
                    const sectionKey = `${category.slug}-${section.slug}`
                    const isOpen = openSections[sectionKey] ?? false

                    return (
                      <li key={section.slug} role="treeitem" aria-selected={false}>
                        <Collapsible
                          open={isOpen}
                          onOpenChange={() => toggleSection(sectionKey)}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                              aria-expanded={isOpen}
                            >
                              <motion.span
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center"
                              >
                                <ChevronRight className="size-3.5" aria-hidden="true" />
                              </motion.span>
                              {section.title}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent forceMount>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.ul
                                  role="group"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                                  className="overflow-hidden pl-4 space-y-0.5"
                                >
                                  {section.articles.map((article) => {
                                    const href = `${basePath}/${category.slug}/${section.slug}/${article.slug}`
                                    const isActive = activeSlug === article.slug
                                    const globalIdx = allArticles.findIndex(
                                      (a) => a.href === href
                                    )

                                    return (
                                      <li key={article.slug} role="treeitem" aria-selected={isActive}>
                                        <div
                                          className={cn(
                                            'rounded-md',
                                            focusedIndex === globalIdx &&
                                              'ring-2 ring-primary ring-offset-1'
                                          )}
                                        >
                                          <ArticleLink
                                            article={article}
                                            href={href}
                                            isActive={isActive}
                                          />
                                        </div>
                                      </li>
                                    )
                                  })}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </CollapsibleContent>
                        </Collapsible>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </nav>
  )
}

export function DocsSidebar({
  categories,
  activeSlug,
  basePath,
}: DocsSidebarProps) {
  return (
    <>
      {/* Desktop sidebar — sticky, hidden on mobile */}
      <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] w-64 shrink-0 border-r">
        <div className="p-3 h-full">
          <SidebarContent
            categories={categories}
            activeSlug={activeSlug}
            basePath={basePath}
          />
        </div>
      </aside>

      {/* Mobile sidebar — sheet/drawer */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open documentation navigation"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-3 pt-3">
              <SheetTitle>Documentation</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-4rem)]">
              <SidebarContent
                categories={categories}
                activeSlug={activeSlug}
                basePath={basePath}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
