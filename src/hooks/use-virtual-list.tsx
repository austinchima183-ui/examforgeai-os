'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VirtualListOptions {
  /** Total number of items */
  itemCount: number;
  /** Height of each item in pixels (must be consistent) */
  itemHeight: number;
  /** Number of extra items to render above/below the viewport (default: 5) */
  overscan?: number;
  /** Height of the scroll container (default: 400) */
  containerHeight?: number;
  /** Scroll event throttle in ms (default: 16 ≈ 1 frame) */
  scrollThrottle?: number;
}

export interface VirtualListReturn {
  /** Scroll container ref to attach to the outer div */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Total height of all items (for the inner spacer div) */
  totalHeight: number;
  /** Index of the first visible item */
  startIndex: number;
  /** Index of the last visible item (exclusive) */
  endIndex: number;
  /** Vertical offset for the first visible item (for transform/positioning) */
  offsetY: number;
  /** Current scroll position */
  scrollTop: number;
  /** Forces a re-calculation of visible range */
  forceUpdate: () => void;
}

// ─── useVirtualList Hook ─────────────────────────────────────────────────────

export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 5,
  containerHeight = 400,
  scrollThrottle = 16,
}: VirtualListOptions): VirtualListReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lastScrollTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const totalHeight = itemCount * itemHeight;

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const rawStart = Math.floor(scrollTop / itemHeight);
    const rawEnd = rawStart + visibleCount + 1;

    const start = Math.max(0, rawStart - overscan);
    const end = Math.min(itemCount, rawEnd + overscan);

    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastScrollTimeRef.current;

    if (elapsed < scrollThrottle) {
      // If we haven't throttled, use rAF for the next update
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (containerRef.current) {
            setScrollTop(containerRef.current.scrollTop);
          }
          rafIdRef.current = null;
          lastScrollTimeRef.current = performance.now();
        });
      }
      return;
    }

    lastScrollTimeRef.current = now;
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [scrollThrottle]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);

  // Force update
  const forceUpdate = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Recalculate when itemCount changes
  useEffect(() => {
    forceUpdate();
  }, [itemCount, forceUpdate]);

  return {
    containerRef,
    totalHeight,
    startIndex,
    endIndex,
    offsetY,
    scrollTop,
    forceUpdate,
  };
}

// ─── VirtualListRow Helper ───────────────────────────────────────────────────

export interface VirtualListRowProps {
  index: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Convenience wrapper for rendering a virtual list row with correct positioning.
 */
export function VirtualListRow({ index, style, children }: VirtualListRowProps) {
  return (
    <div
      data-virtual-index={index}
      style={{
        position: 'absolute',
        left: 0,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
