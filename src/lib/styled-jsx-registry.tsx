'use client'

// ============================================================================
// ExamForge AI — styled-jsx Registry (App Router SSR)
// ============================================================================
// styled-jsx <style> tags (used by the hero section's global keyframes)
// require a client-side StyleRegistry in the App Router to collect styles
// during SSR. Without it, React reports hydration attribute mismatches on
// the generated jsx-* class hashes.
// ============================================================================

import { useState, type ReactNode } from 'react'
import { createStyleRegistry, StyleRegistry } from 'styled-jsx'

export function StyledJsxRegistry({ children }: { children: ReactNode }) {
  const [registry] = useState(() => createStyleRegistry())

  return <StyleRegistry registry={registry}>{children}</StyleRegistry>
}
