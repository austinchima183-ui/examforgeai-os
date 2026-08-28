'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExternalLink, Globe } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { BlogAuthor } from '@/content/blog'

// ============================================================================
// ExamForge AI — Author Card Component
// ============================================================================
// Card displaying author profile with avatar, bio, social links,
// and link to author page. Used in author spotlight sections.
// ============================================================================

interface AuthorCardProps {
  author: BlogAuthor
  articleCount?: number
  className?: string
}

function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'twitter') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.352 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  if (platform === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.428-.07-3.207-1.955-3.207-1.956 0-2.26 1.528-2.26 3.104v5.672H9.006v-11.50h3.414v1.564h.047c.476-.9 1.633-1.85 3.362-1.85 3.592 0 4.252 2.363 4.252 5.44v6.35zM5.332 6.425a2.063 2.063 0 1 1 0-4.125 2.063 2.063 0 0 1 0 4.125zM6.838 20.452H3.825V8.902h3.013v11.55zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  }
  if (platform === 'github') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.522 18.07 3.72 17.73 3.72 17.73c-1.21-.826.092-.812.092-.812 1.34.094 2.044 1.374 2.044 1.374 1.19 2.04 3.122 1.452 3.882 1.11.122-.84.466-1.452.85-1.788-2.996-.34-6.15-1.498-6.15-6.66 0-1.47.525-2.674 1.39-3.616-.14-.34-.605-1.72.13-3.584 0 0 1.13-.362 3.7 1.385a12.86 12.86 0 0 1 3.38-.455c1.15.005 2.305.155 3.38.455 2.57-1.747 3.7-1.385 3.7-1.385.735 1.864.275 3.244.14 3.584.865.942 1.39 2.146 1.39 3.616 0 5.18-3.155 6.316-6.16 6.652.485.418.9 1.242.9 2.508 0 1.81-.015 3.27-.015 3.713 0 .32.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    )
  }
  return <Globe className={className} />
}

export function AuthorCard({ author, articleCount, className }: AuthorCardProps) {
  const socialLinks: Array<{ platform: string; href: string; label: string }> = []
  if (author.twitter) socialLinks.push({ platform: 'twitter', href: `https://${author.twitter}`, label: `Twitter profile of ${author.name}` })
  if (author.linkedin) socialLinks.push({ platform: 'linkedin', href: `https://${author.linkedin}`, label: `LinkedIn profile of ${author.name}` })
  if (author.github) socialLinks.push({ platform: 'github', href: `https://${author.github}`, label: `GitHub profile of ${author.name}` })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300 ${className ?? ''}`}
    >
      <div className="flex items-start gap-4">
        <Link href={`/blog/author/${author.slug}`} aria-label={`View profile of ${author.name}`}>
          <Avatar className="h-12 w-12 shrink-0 hover:ring-2 hover:ring-primary/30 transition-all">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {author.avatar}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/blog/author/${author.slug}`}
              className="font-semibold text-sm hover:text-primary transition-colors"
            >
              {author.name}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              asChild
            >
              <Link href={`/blog/author/${author.slug}`} aria-label={`View all articles by ${author.name}`}>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-primary/80 font-medium mb-2">{author.role}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{author.bio}</p>
          {articleCount !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              {articleCount} {articleCount === 1 ? 'article' : 'articles'}
            </p>
          )}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              {socialLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    <SocialIcon platform={link.platform} className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
