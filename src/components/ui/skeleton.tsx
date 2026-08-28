import { cn } from "@/lib/utils"

/* ══════════════════════════════════════════════════════════════════════════ */
/* ExamForge AI OS — Skeleton Component                                      */
/* Premium shimmer with bg-[#1D1D1D]/50, forge-shimmer keyframe overlay      */
/* ══════════════════════════════════════════════════════════════════════════ */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-[#1D1D1D]/50",
        /* Shimmer overlay */
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.04] after:to-transparent",
        "after:bg-[length:200%_100%]",
        "after:animate-[forge-shimmer_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
