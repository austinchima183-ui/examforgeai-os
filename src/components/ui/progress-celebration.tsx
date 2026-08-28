"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfetti } from "./confetti";

// ---------------------------------------------------------------------------
// Milestone definitions
// ---------------------------------------------------------------------------
interface Milestone {
  threshold: number;
  message: string;
  emoji: string;
}

const EXAM_MILESTONES: Milestone[] = [
  { threshold: 25, message: "Quarter way there!", emoji: "🎯" },
  { threshold: 50, message: "Halfway!", emoji: "⚡" },
  { threshold: 75, message: "Almost done!", emoji: "🔥" },
  { threshold: 100, message: "Exam completed!", emoji: "🏆" },
];

const STREAK_MILESTONES: Milestone[] = [
  { threshold: 3, message: "3 day streak!", emoji: "🔥" },
  { threshold: 7, message: "1 week streak!", emoji: "💪" },
  { threshold: 14, message: "2 week streak!", emoji: "⭐" },
  { threshold: 30, message: "1 month streak!", emoji: "👑" },
  { threshold: 60, message: "2 month streak!", emoji: "💎" },
  { threshold: 100, message: "100 day streak!", emoji: "🚀" },
];

// ---------------------------------------------------------------------------
// Reduced-motion detection (sync, no setState in effect)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// MilestoneEvent
// ---------------------------------------------------------------------------
interface MilestoneEvent {
  milestone: Milestone;
  progress: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// MilestoneDetector hook
// ---------------------------------------------------------------------------
interface UseMilestoneOptions {
  type: "exam" | "streak";
  /** Trigger confetti at milestones? */
  celebrate?: boolean;
}

export function useMilestoneDetector(
  progress: number,
  options: UseMilestoneOptions
) {
  const { type, celebrate = true } = options;
  const milestones = type === "exam" ? EXAM_MILESTONES : STREAK_MILESTONES;
  const [event, setEvent] = useState<MilestoneEvent | null>(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const prevProgressRef = useRef(0);
  const firedRef = useRef<Set<number>>(new Set());

  const { trigger: triggerConfetti } = useConfetti({
    onComplete: () => setCelebrationActive(false),
  });

  // Check milestones on progress change using a ref to avoid setState in effect
  const isFirstRender = useRef(true);
  const progressRef = useRef(progress);
  if (progressRef.current !== progress) {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevProgressRef.current = progress;
    } else {
      // Run milestone check synchronously during render
      const prev = prevProgressRef.current;
      prevProgressRef.current = progress;
      for (const m of milestones) {
        if (firedRef.current.has(m.threshold)) continue;
        if (prev < m.threshold && progress >= m.threshold) {
          firedRef.current.add(m.threshold);
          // Defer state updates to after render using queueMicrotask
          const evt: MilestoneEvent = {
            milestone: m,
            progress,
            timestamp: Date.now(),
          };
          queueMicrotask(() => {
            setEvent(evt);
            if (celebrate) {
              setCelebrationActive(true);
              triggerConfetti();
            }
          });
          break;
        }
      }
    }
    progressRef.current = progress;
  }

  // Reset fired milestones when progress drops (e.g. new exam)
  useEffect(() => {
    if (progress < (prevProgressRef.current ?? 0)) {
      firedRef.current.clear();
    }
  }, [progress]);

  const dismiss = () => setEvent(null);

  return { event, dismiss, celebrationActive };
}

// ---------------------------------------------------------------------------
// MilestoneToast – animated notification for milestone reached
// ---------------------------------------------------------------------------
interface MilestoneToastProps {
  event: MilestoneEvent;
  onDismiss: () => void;
}

function MilestoneToast({ event, onDismiss }: MilestoneToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed top-6 left-1/2 z-50 -translate-x-1/2"
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-5 py-3 shadow-lg backdrop-blur-md">
        <span className="text-2xl" role="img" aria-label="celebration">
          {event.milestone.emoji}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {event.milestone.message}
          </span>
          <span className="text-xs text-muted-foreground">
            {event.progress}% complete
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ProgressCelebration – full component
// ---------------------------------------------------------------------------
export interface ProgressCelebrationProps {
  /** Current progress 0-100 */
  progress: number;
  /** Type: exam progress or study streak */
  type?: "exam" | "streak";
  /** Whether to show confetti */
  celebrate?: boolean;
  /** Render children (e.g. a progress bar) */
  children?: React.ReactNode;
}

export function ProgressCelebration({
  progress,
  type = "exam",
  celebrate = true,
  children,
}: ProgressCelebrationProps) {
  const { event, dismiss } = useMilestoneDetector(progress, { type, celebrate });

  return (
    <>
      {children}
      <AnimatePresence>
        {event && <MilestoneToast event={event} onDismiss={dismiss} />}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// StreakCelebration – specifically for streaks
// ---------------------------------------------------------------------------
export interface StreakCelebrationProps {
  /** Current streak count (days) */
  streak: number;
  /** Whether to show confetti */
  celebrate?: boolean;
}

export function StreakCelebration({ streak, celebrate = true }: StreakCelebrationProps) {
  return <ProgressCelebration progress={streak} type="streak" celebrate={celebrate} />;
}

// ---------------------------------------------------------------------------
// Exports for direct milestone access
// ---------------------------------------------------------------------------
export { EXAM_MILESTONES, STREAK_MILESTONES };
export type { Milestone, MilestoneEvent };
