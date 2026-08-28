import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ══════════════════════════════════════════════════════════════════════════ */
/* ExamForge AI OS — Badge Component                                         */
/* Refined pill badges, rounded-full, text-[10px], translucent fills          */
/* ══════════════════════════════════════════════════════════════════════════ */

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/15 text-primary [a&]:hover:bg-primary/25",
        secondary:
          "border-transparent bg-white/[0.04] text-foreground/60 [a&]:hover:bg-white/[0.08]",
        destructive:
          "border-destructive/20 bg-destructive/15 text-destructive [a&]:hover:bg-destructive/25",
        outline:
          "border-white/[0.08] text-foreground/60 [a&]:hover:bg-white/[0.04] [a&]:hover:text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
