'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StickyHeaderProps {
  /** Content shown when header is NOT sticky (at top of page) */
  children: React.ReactNode;
  /** Content shown when header IS sticky (scrolled past threshold). If omitted, children is used */
  stickyContent?: React.ReactNode;
  /** Scroll threshold in px before becoming sticky (default: 10) */
  threshold?: number;
  /** Header height when not sticky (default: auto) */
  height?: string;
  /** Sticky header height — typically smaller on mobile (default: 'auto') */
  stickyHeight?: string;
  /** Additional class names for the outer wrapper */
  className?: string;
  /** Additional class names for the sticky state */
  stickyClassName?: string;
  /** Enable backdrop blur when sticky (default: true) */
  backdropBlur?: boolean;
  /** Show a subtle bottom border when sticky (default: true) */
  showStickyBorder?: boolean;
  /** Z-index for the sticky header (default: 40) */
  zIndex?: number;
}

// ─── StickyHeader Component ──────────────────────────────────────────────────

export function StickyHeader({
  children,
  stickyContent,
  threshold = 10,
  height,
  stickyHeight,
  className,
  stickyClassName,
  backdropBlur = true,
  showStickyBorder = true,
  zIndex = 40,
}: StickyHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsSticky(latest > threshold);
  });

  // Compute effective heights
  const effectiveHeight = isSticky
    ? (stickyHeight ?? (isMobile ? '48px' : '56px'))
    : (height ?? 'auto');

  return (
    <motion.div
      ref={headerRef}
      className={cn(
        'w-full transition-all',
        isSticky && 'fixed top-0 left-0 right-0',
        isSticky && backdropBlur && 'bg-background/80 backdrop-blur-md',
        isSticky && showStickyBorder && 'border-b border-border/50',
        isSticky && stickyClassName,
        !isSticky && className,
      )}
      style={{
        zIndex: isSticky ? zIndex : 'auto',
        height: effectiveHeight,
      }}
      animate={{
        height: effectiveHeight === 'auto' ? undefined : effectiveHeight,
      }}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
    >
      <AnimatePresence mode="wait">
        {isSticky ? (
          <motion.div
            key="sticky"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex h-full items-center px-4 sm:px-6"
          >
            {stickyContent ?? children}
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="flex h-full items-center px-4 sm:px-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer when sticky so content doesn't jump up */}
      {isSticky && (
        <div
          style={{ height: height ?? 'auto' }}
          className="invisible"
          aria-hidden
        />
      )}
    </motion.div>
  );
}
