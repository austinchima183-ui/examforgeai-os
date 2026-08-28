'use client';

import { useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ─── Common Navigation Patterns ──────────────────────────────────────────────

/** Map of current routes → likely next routes based on user flow patterns */
const NAVIGATION_PATTERNS: Record<string, string[]> = {
  '/': ['/dashboard', '/login', '/register'],
  '/dashboard': ['/exams', '/students', '/question-bank', '/results'],
  '/dashboard/teacher': ['/exams', '/question-bank', '/teacher/grading', '/teacher/ai-question-generator'],
  '/dashboard/student': ['/student/practice', '/student/ai-tutor', '/student/flashcards', '/exams'],
  '/dashboard/school-admin': ['/students', '/teachers', '/school/attendance', '/analytics'],
  '/exams': ['/exams/[id]/take', '/question-bank', '/results'],
  '/question-bank': ['/exams', '/teacher/ai-question-generator'],
  '/results': ['/exams', '/analytics', '/reports'],
  '/students': ['/students/[id]', '/school/attendance', '/school/fees'],
  '/teachers': ['/teachers/[id]', '/teacher/grading'],
  '/settings': ['/settings/security', '/settings/api-keys', '/settings/webhooks'],
  '/analytics': ['/analytics/enterprise', '/reports'],
  '/reports': ['/analytics', '/exams'],
  '/student/practice': ['/student/ai-tutor', '/student/flashcards', '/student/revision-hub'],
  '/student/ai-tutor': ['/student/practice', '/student/flashcards'],
  '/teacher/ai-question-generator': ['/question-bank', '/exams'],
  '/teacher/grading': ['/results', '/exams'],
  '/parent/dashboard': ['/parent/child-progress', '/parent/fees', '/parent/attendance'],
};

// ─── prefetchOnHover ─────────────────────────────────────────────────────────

/**
 * Prefetch route data when a link is hovered.
 * Uses Next.js router prefetch for instant navigation.
 *
 * @param href - The route to prefetch
 */
export function prefetchOnHover(href: string): void {
  if (typeof window === 'undefined') return;

  // Use requestIdleCallback to avoid blocking hover animation
  const schedule = typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 100);

  schedule(() => {
    // Next.js prefetch via link rel="prefetch"
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);

    // Clean up after a reasonable time
    setTimeout(() => {
      document.head.removeChild(link);
    }, 10000);
  });
}

// ─── prefetchLikelyRoutes ────────────────────────────────────────────────────

/**
 * AI-predicted next routes based on current path and common navigation patterns.
 * Prefetches the top 3 most likely routes.
 *
 * @param currentPath - Current route path
 * @param limit - Max routes to prefetch (default: 3)
 */
export function prefetchLikelyRoutes(currentPath: string, limit = 3): void {
  if (typeof window === 'undefined') return;

  const likelyRoutes = NAVIGATION_PATTERNS[currentPath];
  if (!likelyRoutes || likelyRoutes.length === 0) return;

  const routesToPreload = likelyRoutes.slice(0, limit);

  // Stagger prefetches to avoid network congestion
  routesToPreload.forEach((route, index) => {
    setTimeout(() => {
      prefetchOnHover(route);
    }, index * 300);
  });
}

// ─── usePrefetch Hook ────────────────────────────────────────────────────────

/**
 * Hook that automatically prefetches likely routes based on the current path.
 * Call once at the layout/page level.
 */
export function usePrefetch(): {
  prefetch: (_href: string) => void;
  prefetchLikely: (_limit?: number) => void;
} {
  const pathname = usePathname();
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetch = useCallback((href: string) => {
    if (prefetchedRef.current.has(href)) return;
    prefetchedRef.current.add(href);
    prefetchOnHover(href);
  }, []);

  const prefetchLikely = useCallback((limit = 3) => {
    prefetchLikelyRoutes(pathname, limit);
  }, [pathname]);

  return { prefetch, prefetchLikely };
}

// ─── PrefetchLink Props Helper ───────────────────────────────────────────────

/**
 * Returns event handlers for a link that prefetches on hover.
 * Usage: <a href={href} {...prefetchLinkProps(href)}>...</a>
 */
export function prefetchLinkProps(href: string): {
  onMouseEnter: () => void;
  onTouchStart: () => void;
} {
  return {
    onMouseEnter: () => prefetchOnHover(href),
    onTouchStart: () => prefetchOnHover(href),
  };
}
