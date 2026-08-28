"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

/* ══════════════════════════════════════════════════════════════════════════ */
/* ExamForge AI OS — Tabs Component                                          */
/* No visible container, animated bottom bar indicator, subtle hover          */
/* ══════════════════════════════════════════════════════════════════════════ */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center gap-1 p-1",
        /* No visible container — just text items */
        /* Mobile safety: never overflow the viewport — scroll internally */
        "max-w-full overflow-x-auto scrollbar-thin",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap",
        /* Smooth transitions */
        "transition-all duration-200",
        /* Inactive: muted, subtle hover */
        "text-muted-foreground hover:text-foreground/70",
        /* Active: full foreground + animated bottom bar indicator */
        "data-[state=active]:text-foreground data-[state=active]:bg-transparent",
        "data-[state=active]:shadow-[inset_0_-2px_0_0_var(--color-primary)]",
        /* Focus */
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        /* Disabled */
        "disabled:pointer-events-none disabled:opacity-50",
        /* Icons */
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        "animate-fade-in",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
