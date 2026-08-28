'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { BlogPost } from '@/content/blog'

// ============================================================================
// ExamForge AI — Blog Card Component
// ============================================================================
// Card for displaying blog posts in grids. Supports featured variant
// with larger hero image area and prominent CTA.
// ============================================================================

interface BlogCardProps {
  post: BlogPost
  featured?: boolean
  className?: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BlogCard({ post, featured = false, className }: BlogCardProps) {
  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300 ${className ?? ''}`}
      >
        <Link href={`/blog/${post.slug}`} className="group block" aria-label={`Read: ${post.title}`}>
          <div className={`h-64 sm:h-72 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-primary/40 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Featured Article</p>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 border-0">
                {post.category}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {post.readTime}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {post.author.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{post.author.name}</p>
                  <p className="text-xs text-muted-foreground">{post.author.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="group/btn">
                Read More
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.article>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300 ${className ?? ''}`}
    >
      <Link href={`/blog/${post.slug}`} className="group block" aria-label={`Read: ${post.title}`}>
        <div className={`h-40 bg-gradient-to-br ${post.coverGradient} flex items-center justify-center`}>
          <BookOpen className="h-8 w-8 text-primary/30" aria-hidden="true" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 border-0 text-[11px] px-2">
              {post.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {post.readTime}
            </span>
          </div>
          <h3 className="text-base font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                  {post.author.avatar}
                </AvatarFallback>
              </Avatar>
              <span>{post.author.name}</span>
            </div>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
