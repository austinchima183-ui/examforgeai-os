'use client'

import { useState } from 'react'
import { Link as LinkIcon, Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — Share Buttons Component
// ============================================================================
// Social share buttons for blog posts: Twitter/X, LinkedIn, Copy Link.
// Uses inline SVGs for brand icons not available in lucide-react.
// ============================================================================

interface ShareButtonsProps {
  title: string
  url: string
  className?: string
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.352 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.428-.07-3.207-1.955-3.207-1.956 0-2.26 1.528-2.26 3.104v5.672H9.006v-11.50h3.414v1.564h.047c.476-.9 1.633-1.85 3.362-1.85 3.592 0 4.252 2.363 4.252 5.44v6.35zM5.332 6.425a2.063 2.063 0 1 1 0-4.125 2.063 2.063 0 0 1 0 4.125zM6.838 20.452H3.825V8.902h3.013v11.55zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export function ShareButtons({ title, url, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: do nothing if clipboard is not available
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="text-sm text-muted-foreground mr-1 flex items-center gap-1">
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        Share
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        asChild
      >
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
        >
          <XIcon className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        asChild
      >
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
        >
          <LinkedInIcon className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopyLink}
        aria-label={copied ? 'Link copied' : 'Copy link'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
