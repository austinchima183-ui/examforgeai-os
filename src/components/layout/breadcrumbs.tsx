'use client'

import Link from 'next/link'
import { ROUTE_SEGMENT_LABELS } from '@/lib/constants/routes'

// ============================================================================
// ExamForge AI OS — Breadcrumbs Component
// ============================================================================
// Minimal breadcrumbs. Muted text, subtle separators, last item brighter.
// Generates breadcrumb navigation from the current pathname.
// ============================================================================

interface BreadcrumbsProps {
  pathname: string
}

interface BreadcrumbEntry {
  label: string
  href: string
  isLast: boolean
}

function buildBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Home', href: '/dashboard', isLast: true }]
  }

  const breadcrumbs: BreadcrumbEntry[] = []

  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
    isLast: segments.length === 1 && segments[0] === 'dashboard',
  })

  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`

    if (segment === 'dashboard' && i === 0) continue

    const isDynamic = /^\[.*\]$/.test(segment) || /^[a-f0-9-]{8,}$/i.test(segment)

    const label = isDynamic
      ? 'Details'
      : ROUTE_SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast: i === segments.length - 1,
    })
  }

  if (breadcrumbs.length === 1 && breadcrumbs[0].isLast) {
    return breadcrumbs
  }

  if (breadcrumbs.length > 1) {
    breadcrumbs[0].isLast = false
  }

  return breadcrumbs
}

export function Breadcrumbs({ pathname }: BreadcrumbsProps) {
  const items = buildBreadcrumbs(pathname)

  return (
    <nav aria-label="breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1 text-xs">
        {items.map((item, index) => (
          <li key={item.href} className="inline-flex items-center gap-1">
            {index > 0 && (
              <span className="text-white/15 select-none" aria-hidden="true">/</span>
            )}
            {item.isLast ? (
              <span className="text-foreground/70 font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-foreground/60 hover:text-foreground/55 transition-colors duration-200"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
