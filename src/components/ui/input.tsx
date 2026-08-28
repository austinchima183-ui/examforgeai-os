import * as React from "react"

import { cn } from "@/lib/utils"

/* ══════════════════════════════════════════════════════════════════════════ */
/* ExamForge AI OS — Input Component                                         */
/* Premium focus glow, subtle ring, precise border/placeholder opacity        */
/* ══════════════════════════════════════════════════════════════════════════ */

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Base layout */
        "flex h-10 w-full min-w-0 rounded-lg border px-4 py-2 text-base",
        /* Premium background — translucent panel */
        "bg-[#1D1D1D]/50 border-white/[0.06]",
        /* Text colors */
        "text-foreground file:text-foreground",
        "placeholder:text-foreground/30",
        "selection:bg-primary selection:text-primary-foreground",
        /* File input */
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        /* forge-input-glow for premium focus */
        "forge-input-glow",
        /* Focus transitions — ring-primary/30, border-primary/40, subtle glow */
        "transition-all duration-200 ease-out outline-none",
        "focus-visible:border-primary/40 focus-visible:ring-primary/30 focus-visible:ring-[3px]",
        "focus-visible:shadow-[0_0_20px_rgba(59,130,246,0.10)]",
        /* Invalid state */
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        /* Disabled */
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        /* Responsive text */
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
