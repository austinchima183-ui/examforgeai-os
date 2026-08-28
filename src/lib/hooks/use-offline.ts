// ============================================================================
// ExamForge AI — Offline Detection Hook (Re-export)
// ============================================================================
// Canonical implementation lives in @/hooks/use-offline.
// This file re-exports for backward compatibility with existing imports
// from @/lib/hooks/use-offline.
// ============================================================================

export { useOffline, OfflineBanner, OFFLINE_EVENTS } from '@/hooks/use-offline'
export type { OfflineState, OfflineReturn, OfflineBannerProps } from '@/hooks/use-offline'
