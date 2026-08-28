// ============================================================================
// ExamForge AI — Hooks Barrel Export
// ============================================================================
// Re-exports all custom hooks for convenient importing.
// Canonical implementations live in @/hooks/. This barrel re-exports
// both the canonical hooks and backward-compatible wrappers.
// ============================================================================

// Debounce — canonical is @/hooks/use-debounced-callback
export { useDebouncedCallback } from '@/hooks/use-debounced-callback'
export type { DebounceOptions, DebouncedCallbackResult } from '@/hooks/use-debounced-callback'
// Backward-compatible simpler debounce utilities
export { useDebounce, useDebouncedCallback as useDebouncedCallbackSimple } from './use-debounce'

// Media query
export {
  useMediaQuery,
  useBreakpoint,
  useBreakpointBetween,
  useCurrentBreakpoint,
  BREAKPOINTS,
} from './use-media-query'
export type { Breakpoint } from './use-media-query'

// Offline — canonical is @/hooks/use-offline
export { useOffline, OfflineBanner, OFFLINE_EVENTS } from '@/hooks/use-offline'
export type { OfflineState, OfflineReturn, OfflineBannerProps } from '@/hooks/use-offline'
