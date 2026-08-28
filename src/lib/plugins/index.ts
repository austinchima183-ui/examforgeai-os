// ============================================================================
// ExamForge AI — Plugin System Central Exports
// ============================================================================
// Single entry point for the entire plugin system. Re-exports all types,
// registry functions, lifecycle management, sandbox execution, and settings.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  PluginType,
  PluginPermission,
  PluginPermissionMeta,
  PluginManifest,
  PluginConfigurationUI,
  PluginLifecycleState,
  PluginInstallation,
  PluginInstallationStatus,
  PluginSandbox,
  PluginSandboxLimits,
  NetworkAccessPolicy,
  PluginVersion,
  CompatibilityStatus,
  PluginReview,
  PluginMarketplaceListing,
  PluginMarketplaceStats,
  PluginSearchQuery,
  PluginSearchResult,
  PluginHook,
  PluginHookContext,
  PluginHookResult,
  PluginInstallConfig,
  PluginAuditLog,
  SandboxedAPI,
  SettingsValidationResult,
  SettingsValidationError,
} from './types'

export {
  PLUGIN_TYPE_LABELS,
  SANDBOXED_PLUGIN_TYPES,
  PLUGIN_PERMISSION_REGISTRY,
  FULL_ACCESS_IMPLIED_PERMISSIONS,
  LIFECYCLE_TRANSITIONS,
  DEFAULT_SANDBOX_LIMITS,
} from './types'

// ──────────────────────────────────────────────────────────────
// Plugin Registry
// ──────────────────────────────────────────────────────────────

export {
  validateManifest,
  registerPlugin,
  getPlugin,
  searchPlugins,
  getPluginsByType,
  getFeaturedPlugins,
  getPluginVersions,
  publishVersion,
  deprecateVersion,
  verifyPlugin,
  validatePermissions,
  checkCompatibility,
} from './plugin-registry'

// ──────────────────────────────────────────────────────────────
// Plugin Lifecycle
// ──────────────────────────────────────────────────────────────

export {
  installPlugin,
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  updatePlugin,
  rollbackPlugin,
  getInstallationStatus,
  getOrganizationInstallations,
  validateAPIPermission,
} from './plugin-lifecycle'

// ──────────────────────────────────────────────────────────────
// Plugin Sandbox
// ──────────────────────────────────────────────────────────────

export {
  PluginSandboxExecutor,
  createSandboxedAPI,
  enforceResourceLimits,
  auditPluginAccess,
  executeLifecycleHook,
  registerLifecycleHook,
  getAuditLogs,
} from './plugin-sandbox'

// ──────────────────────────────────────────────────────────────
// Plugin Settings
// ──────────────────────────────────────────────────────────────

export {
  validateSettings,
  getPluginSettings,
  updatePluginSettings,
  getPluginStorage,
  setPluginStorage,
  deletePluginStorage,
  listPluginStorage,
  getPluginStorageBulk,
  deletePluginStorageBulk,
  generateDefaultSettings,
  mergeWithDefaults,
} from './plugin-settings'
