'use client'

import { useState, useCallback, useMemo } from 'react'
import { BookOpen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BlogCard } from '@/components/blog/blog-card'
import { BlogSearch } from '@/components/blog/blog-search'
import { AuthorCard } from '@/components/blog/author-card'
import { NewsletterForm } from '@/components/marketing/newsletter-form'
import type { BlogPost, BlogAuthor, BlogCategory } from '@/content/blog'

// ============================================================================
// ExamForge AI — Blog Index Client Component
// ============================================================================
// Client-side wrapper handling search, category filtering, and
// interactive features for the blog index page.
// ============================================================================

interface BlogIndexClientProps {
  posts: BlogPost[]
  authors: BlogAuthor[]
  categories: BlogCategory[]
}

export function BlogIndexClient({ posts, authors, categories }: BlogIndexClientProps) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const featuredPost = useMemo(() => posts.find(p => p.featured), [posts])

  const nonFeaturedPosts = useMemo(() => posts.filter(p => !p.featured), [posts])

  const filteredPosts = useMemo(() => {
    let result = nonFeaturedPosts

    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [nonFeaturedPosts, activeCategory, searchQuery])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleCategoryClick = useCallback((categoryName: string) => {
    setActiveCategory(categoryName)
  }, [])

  // Count posts per category (non-featured only, for display)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const post of nonFeaturedPosts) {
      counts[post.category] = (counts[post.category] || 0) + 1
    }
    return counts
  }, [nonFeaturedPosts])

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-20 sm:py-24 lg:py-32" aria-labelledby="blog-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Blog</span>
            </div>
            <h1 id="blog-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Insights from the{' '}
              <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                ExamForge AI team
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Product updates, engineering deep-dives, and thought leadership on the
              future of education technology in Africa.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Category Filters */}
      <div className="border-b border-white/[0.04] sticky top-16 z-10 bg-[#090909]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <BlogSearch onSearch={handleSearch} className="w-full sm:w-72 shrink-0" />
            <div
              className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin"
              role="tablist"
              aria-label="Blog categories"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.name
                const count = cat.name === 'All'
                  ? nonFeaturedPosts.length
                  : (categoryCounts[cat.name] || 0)
                return (
                  <button
                    key={cat.slug}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    {cat.name}
                    <span className={`text-xs ${isActive ? 'text-primary/70' : 'text-foreground/40'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Post */}
      {featuredPost && activeCategory === 'All' && !searchQuery.trim() && (
        <section className="py-12 sm:py-16" aria-label="Featured article">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <BlogCard post={featuredPost} featured />
            </div>
          </div>
        </section>
      )}

      {/* All Posts Grid */}
      <section className="py-12 sm:py-16 bg-[#0C0C0C] border-y border-white/[0.04]" aria-label="All articles">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-foreground/30 mx-auto mb-3" aria-hidden="true" />
              <p className="text-muted-foreground">No articles found matching your criteria.</p>
              <button
                onClick={() => { setActiveCategory('All'); setSearchQuery('') }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Author Spotlight */}
      <section className="py-20 sm:py-24" aria-labelledby="authors-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Our Team</span>
            </div>
            <h2 id="authors-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
              Meet the writers
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              The people behind the insights — engineers, researchers, and product leaders building the future of African education technology.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {authors.map((author) => {
              const articleCount = posts.filter(p => p.author.slug === author.slug).length
              return (
                <AuthorCard key={author.slug} author={author} articleCount={articleCount} />
              )
            })}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 sm:py-24 border-t border-white/[0.04]" aria-labelledby="newsletter-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 id="newsletter-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">Stay in the loop</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Get the latest product updates, engineering insights, and education
              technology news delivered to your inbox. No spam, unsubscribe anytime.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
