'use client';

import { useState, useEffect, useMemo } from 'react';

// ─── Breakpoint Constants ────────────────────────────────────────────────────
export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the current breakpoint name based on window width */
function getBreakpointName(width: number): BreakpointName {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// ─── useBreakpoint ───────────────────────────────────────────────────────────

export function useBreakpoint(): BreakpointName {
  const [breakpoint, setBreakpoint] = useState<BreakpointName>(() => {
    if (typeof window === 'undefined') return 'md';
    return getBreakpointName(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      setBreakpoint(getBreakpointName(window.innerWidth));
    }

    // Throttle resize events to 150ms
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    function throttledResize() {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleResize();
        timeoutId = null;
      }, 150);
    }

    window.addEventListener('resize', throttledResize);
    handleResize(); // Set initial value

    return () => {
      window.removeEventListener('resize', throttledResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return breakpoint;
}

// ─── useIsMobile ─────────────────────────────────────────────────────────────

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < BREAKPOINTS.md;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`);
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

// ─── useIsTablet ─────────────────────────────────────────────────────────────

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(
      `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
    );
    function handleChange(e: MediaQueryListEvent) {
      setIsTablet(e.matches);
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return isTablet;
}

// ─── useIsDesktop ────────────────────────────────────────────────────────────

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= BREAKPOINTS.lg;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`);
    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

// ─── useResponsiveValue ──────────────────────────────────────────────────────

export type ResponsiveValues<T> = Partial<Record<BreakpointName, T>> & {
  base?: T;
};

export function useResponsiveValue<T>(values: ResponsiveValues<T>): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    // Find the matching value by walking down from current breakpoint
    const order: BreakpointName[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = order.indexOf(breakpoint);

    for (let i = currentIndex; i < order.length; i++) {
      const bp = order[i];
      if (values[bp] !== undefined) {
        return values[bp] as T;
      }
    }

    // Fall back to base
    if (values.base !== undefined) {
      return values.base;
    }

    // Last resort: return the first defined value
    for (const bp of order) {
      if (values[bp] !== undefined) {
        return values[bp] as T;
      }
    }

    throw new Error('useResponsiveValue: No value provided for any breakpoint');
  }, [breakpoint, values]);
}
