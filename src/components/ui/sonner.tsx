"use client"

// ============================================================================
// ExamForge AI OS — Sonner Toast (Dark Premium Glass)
// ============================================================================
// Dark, premium, subtle glass effect. Matches the AI OS design system.
// ============================================================================

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "rgba(17, 17, 17, 0.85)",
          "--normal-text": "rgba(255, 255, 255, 0.85)",
          "--normal-border": "rgba(255, 255, 255, 0.06)",
          "--success-bg": "rgba(17, 17, 17, 0.85)",
          "--success-text": "rgba(52, 211, 153, 0.85)",
          "--success-border": "rgba(52, 211, 153, 0.15)",
          "--error-bg": "rgba(17, 17, 17, 0.85)",
          "--error-text": "rgba(248, 113, 113, 0.85)",
          "--error-border": "rgba(248, 113, 113, 0.15)",
          "--warning-bg": "rgba(17, 17, 17, 0.85)",
          "--warning-text": "rgba(251, 191, 36, 0.85)",
          "--warning-border": "rgba(251, 191, 36, 0.15)",
          "--info-bg": "rgba(17, 17, 17, 0.85)",
          "--info-text": "rgba(96, 165, 250, 0.85)",
          "--info-border": "rgba(96, 165, 250, 0.15)",
          backdropFilter: "blur(16px) saturate(1.3)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] group-[.toaster]:border-white/[0.06]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
