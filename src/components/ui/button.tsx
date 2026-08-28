import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ══════════════════════════════════════════════════════════════════════════ */
/* ExamForge AI OS — Button Component                                        */
/* Premium press effect, brightness hover, smooth 200ms transitions           */
/* ══════════════════════════════════════════════════════════════════════════ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:brightness-110 hover:shadow-[0_0_16px_rgba(59,130,246,0.15)]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:brightness-110 focus-visible:ring-destructive/20",
        outline:
          "border border-white/[0.08] bg-transparent hover:bg-white/[0.04] hover:border-white/[0.12]",
        secondary:
          "bg-white/[0.04] text-foreground/80 hover:bg-white/[0.08]",
        ghost:
          "bg-transparent hover:bg-white/[0.04]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 text-base has-[>svg]:px-5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
