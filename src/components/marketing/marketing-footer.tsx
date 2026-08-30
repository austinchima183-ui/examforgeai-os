'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductionNewsletterForm } from '@/components/marketing/production-newsletter-form'

// ============================================================================
// ExamForge AI — Marketing Footer (AI OS World-Class)
// ============================================================================
// Vercel/Linear/Stripe-quality footer — quiet, minimal, professional.
// - #090909 background (seamless with page)
// - Very subtle top border separator
// - Compact layout with clean columns
// - Links: muted-foreground → foreground on hover
// - Social icons: subtle
// - Bottom bar: copyright, version, status indicator
// - Newsletter input: forge-input-glow
// - NOT a typical SaaS footer with bright colors
// ============================================================================

const footerLinks = {
  products: {
    title: 'Products',
    links: [
      { label: 'Student Information System', href: '/features' },
      { label: 'AI CBT Platform', href: '/features' },
      { label: 'School ERP', href: '/features' },
      { label: 'Analytics & Insights', href: '/features' },
      { label: 'Marketplace', href: '/features' },
      { label: 'AI Assistant', href: '/features' },
      { label: 'Billing & Payments', href: '/features' },
      { label: 'Integrations', href: '/integrations' },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'Primary Schools', href: '/solutions' },
      { label: 'Secondary Schools', href: '/solutions' },
      { label: 'Universities', href: '/solutions' },
      { label: 'School Groups', href: '/solutions' },
      { label: 'Government Agencies', href: '/solutions' },
      { label: 'Examination Bodies', href: '/solutions' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Customers', href: '/customers' },
      { label: 'Press Kit', href: '/press-kit' },
      { label: 'Contact', href: '/contact' },
      { label: 'Partners', href: '/partners' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api-docs' },
      { label: 'Help Center', href: '/help-center' },
      { label: 'Blog', href: '/blog' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Developers', href: '/developers' },
      { label: 'Community', href: '/community' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Status Page', href: '/status' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' },
      { label: 'Security', href: '/security' },
    ],
  },
}

// Custom SVG social icons — minimal, quiet
function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

const socialLinks = [
  { icon: TwitterXIcon, href: 'https://twitter.com/examforgeai', label: 'Follow ExamForge AI on X (Twitter)' },
  { icon: LinkedInIcon, href: 'https://linkedin.com/company/examforgeai', label: 'Follow ExamForge AI on LinkedIn' },
  { icon: GitHubIcon, href: 'https://github.com/examforgeai', label: 'View ExamForge AI on GitHub' },
  { icon: YouTubeIcon, href: 'https://youtube.com/@examforgeai', label: 'Subscribe to ExamForge AI on YouTube' },
]

// Language options for the selector
const languageOptions = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português (BR)' },
]

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'text-[13px] text-foreground/60',
          'transition-colors duration-150',
          'hover:text-foreground/70',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40 rounded-sm'
        )}
        aria-label={label}
      >
        {label}
      </Link>
    </li>
  )
}

export function MarketingFooter() {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en-US')

  // Show back-to-top button after scrolling
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const selectedLangLabel = languageOptions.find((l) => l.code === selectedLang)?.label ?? 'English (US)'

  return (
    <footer className="bg-[#090909] border-t border-white/[0.04]" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Newsletter Section — minimal */}
        <div className="py-10 border-b border-white/[0.04]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <h3 className="text-[13px] font-medium text-foreground/70">Stay up to date</h3>
              <p className="text-[12px] text-foreground/60 mt-1 max-w-sm">
                Product updates and insights. No spam, unsubscribe anytime.
              </p>
            </div>
            <ProductionNewsletterForm source="footer" />
          </div>
        </div>

        {/* Link Grid — compact */}
        <div className="py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60 mb-3">{section.title}</h4>
              <ul className="space-y-2" role="list">
                {section.links.map((link) => (
                  <FooterLink key={link.label} href={link.href} label={link.label} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar — quiet and professional */}
        <div className="py-5 border-t border-white/[0.04]">
          <div className="flex flex-col gap-5">
            {/* Top row: Logo + copyright + social */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6]/8 border border-[#3B82F6]/12">
                  <BookOpen className="h-3 w-3 text-[#3B82F6]/60" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-semibold text-foreground/50">
                  ExamForge<span className="forge-gradient-text"> AI</span>
                </span>
              </div>

              <p className="text-[11px] text-foreground/55">
                &copy; {new Date().getFullYear()} ExamForge AI. All rights reserved.
              </p>

              {/* Social icons — very subtle */}
              <div className="flex items-center gap-1">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md',
                        'text-foreground/20 transition-colors duration-150',
                        'hover:text-foreground/50',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40'
                      )}
                      aria-label={social.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Bottom row: Version + Status + Language selector + Back to top */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Version */}
                <span className="text-[10px] font-mono text-foreground/55">v2.4.0</span>

                {/* Status indicator */}
                <a
                  href="/status"
                  className="flex items-center gap-1.5 text-[10px] text-foreground/55 hover:text-foreground/70 transition-colors duration-150"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500/60" />
                  </span>
                  All systems operational
                </a>
              </div>

              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setLangOpen(!langOpen)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-foreground/55',
                      'border border-white/[0.04] bg-white/[0.01]',
                      'hover:text-foreground/40 hover:border-white/[0.08] transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40'
                    )}
                    aria-label={`Select language, currently ${selectedLangLabel}`}
                    aria-expanded={langOpen}
                    aria-haspopup="listbox"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                    {selectedLangLabel}
                    <ChevronDown className={cn('h-2.5 w-2.5 transition-transform duration-150', langOpen && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {langOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full left-0 mb-2 w-44 rounded-lg forge-glass-elevated border border-white/[0.08] shadow-xl overflow-hidden"
                        role="listbox"
                        aria-label="Language options"
                      >
                        <div className="py-0.5">
                          {languageOptions.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setSelectedLang(lang.code)
                                setLangOpen(false)
                              }}
                              className={cn(
                                'w-full text-left px-3 py-1.5 text-[12px] transition-colors duration-100',
                                'hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/[0.04]',
                                lang.code === selectedLang
                                  ? 'text-foreground/80 bg-white/[0.03] font-medium'
                                  : 'text-foreground/40'
                              )}
                              role="option"
                              aria-selected={lang.code === selectedLang}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Back to Top */}
                <button
                  onClick={scrollToTop}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-foreground/55',
                    'border border-white/[0.04] bg-white/[0.01]',
                    'hover:text-foreground/40 hover:border-white/[0.08] transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40'
                  )}
                  aria-label="Back to top of page"
                >
                  <ArrowUp className="h-2.5 w-2.5" aria-hidden="true" />
                  Top
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={scrollToTop}
            className={cn(
              'fixed bottom-5 right-5 z-40 flex h-8 w-8 items-center justify-center',
              'rounded-md bg-foreground/5 border border-white/[0.06]',
              'text-foreground/40 hover:text-foreground/60 hover:bg-foreground/8',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]/40'
            )}
            aria-label="Scroll back to top of page"
          >
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  )
}
