// ============================================================================
// ExamForge AI — Plugin System Type Definitions
// ============================================================================
// Comprehensive type definitions for the Extension Marketplace where developers
// can build Apps, Themes, Widgets, AI Skills, Integrations, Reports, Analytics,
// Certificates, Question Types, Payment Providers, Identity Providers, and
// Communication Providers.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Plugin Type
// ──────────────────────────────────────────────────────────────

/**
 * The category of plugin extension. Each type corresponds to a different
 * extension point in the ExamForge AI platform.
 */
export type PluginType =
  | 'app'
  | 'theme'
  | 'widget'
  | 'ai_skill'
  | 'integration'
  | 'report'
  | 'analytics'
  | 'certificate'
  | 'question_type'
  | 'payment_provider'
  | 'identity_provider'
  | 'communication_provider'

/**
 * Human-readable labels for each plugin type, used in UI display.
 */
export const PLUGIN_TYPE_LABELS: Record<PluginType, string> = {
  app: 'App',
  theme: 'Theme',
  widget: 'Widget',
  ai_skill: 'AI Skill',
  integration: 'Integration',
  report: 'Report',
  analytics: 'Analytics',
  certificate: 'Certificate',
  question_type: 'Question Type',
  payment_provider: 'Payment Provider',
  identity_provider: 'Identity Provider',
  communication_provider: 'Communication Provider',
}

/**
 * Plugin types that require sandboxed execution (they run arbitrary code).
 */
export const SANDBOXED_PLUGIN_TYPES: PluginType[] = [
  'app',
  'widget',
  'ai_skill',
  'integration',
  'question_type',
  'communication_provider',
]

// ──────────────────────────────────────────────────────────────
// Plugin Permission
// ──────────────────────────────────────────────────────────────

/**
 * Fine-grained permissions that a plugin can request. Each permission controls
 * access to a specific API surface or data domain.
 */
export type PluginPermission =
  | 'read_profiles'
  | 'write_profiles'
  | 'read_exams'
  | 'write_exams'
  | 'read_questions'
  | 'write_questions'
  | 'read_results'
  | 'write_results'
  | 'read_billing'
  | 'write_billing'
  | 'send_notifications'
  | 'use_ai'
  | 'read_analytics'
  | 'manage_webhooks'
  | 'full_access'

/**
 * Permission metadata including display name, description, and risk level.
 */
export interface PluginPermissionMeta {
  permission: PluginPermission
  label: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Complete permission registry with metadata for display in consent screens.
 */
export const PLUGIN_PERMISSION_REGISTRY: Record<PluginPermission, PluginPermissionMeta> = {
  read_profiles: {
    permission: 'read_profiles',
    label: 'Read Profiles',
    description: 'Read user profiles and personal information',
    riskLevel: 'low',
  },
  write_profiles: {
    permission: 'write_profiles',
    label: 'Write Profiles',
    description: 'Modify user profiles and personal information',
    riskLevel: 'medium',
  },
  read_exams: {
    permission: 'read_exams',
    label: 'Read Exams',
    description: 'Read exam definitions and configurations',
    riskLevel: 'low',
  },
  write_exams: {
    permission: 'write_exams',
    label: 'Write Exams',
    description: 'Create, modify, and delete exams',
    riskLevel: 'high',
  },
  read_questions: {
    permission: 'read_questions',
    label: 'Read Questions',
    description: 'Read question bank items and their content',
    riskLevel: 'low',
  },
  write_questions: {
    permission: 'write_questions',
    label: 'Write Questions',
    description: 'Create, modify, and delete questions',
    riskLevel: 'high',
  },
  read_results: {
    permission: 'read_results',
    label: 'Read Results',
    description: 'Read exam results and student scores',
    riskLevel: 'medium',
  },
  write_results: {
    permission: 'write_results',
    label: 'Write Results',
    description: 'Modify exam results and grading data',
    riskLevel: 'high',
  },
  read_billing: {
    permission: 'read_billing',
    label: 'Read Billing',
    description: 'Read billing and payment information',
    riskLevel: 'medium',
  },
  write_billing: {
    permission: 'write_billing',
    label: 'Write Billing',
    description: 'Modify billing records and process payments',
    riskLevel: 'critical',
  },
  send_notifications: {
    permission: 'send_notifications',
    label: 'Send Notifications',
    description: 'Send notifications to users',
    riskLevel: 'medium',
  },
  use_ai: {
    permission: 'use_ai',
    label: 'Use AI',
    description: 'Access AI capabilities and consume AI credits',
    riskLevel: 'medium',
  },
  read_analytics: {
    permission: 'read_analytics',
    label: 'Read Analytics',
    description: 'Read analytics and reporting data',
    riskLevel: 'low',
  },
  manage_webhooks: {
    permission: 'manage_webhooks',
    label: 'Manage Webhooks',
    description: 'Create, modify, and delete webhook endpoints',
    riskLevel: 'high',
  },
  full_access: {
    permission: 'full_access',
    label: 'Full Access',
    description: 'Unrestricted access to all platform APIs and data',
    riskLevel: 'critical',
  },
}

/**
 * Permissions implied by full_access. When full_access is granted, all other
 * permissions are automatically satisfied.
 */
export const FULL_ACCESS_IMPLIED_PERMISSIONS: PluginPermission[] = [
  'read_profiles',
  'write_profiles',
  'read_exams',
  'write_exams',
  'read_questions',
  'write_questions',
  'read_results',
  'write_results',
  'read_billing',
  'write_billing',
  'send_notifications',
  'use_ai',
  'read_analytics',
  'manage_webhooks',
  'full_access',
]

// ──────────────────────────────────────────────────────────────
// Plugin Manifest
// ──────────────────────────────────────────────────────────────

/**
 * The plugin manifest is the core metadata document that describes a plugin.
 * It is submitted during registration and stored in the plugin_registry table.
 */
export interface PluginManifest {
  /** Unique identifier for the plugin (e.g., "com.examforge.ai-question-generator") */
  id: string
  /** Human-readable name */
  name: string
  /** Semantic version (semver) */
  version: string
  /** Plugin type category */
  type: PluginType
  /** Short description for marketplace listing */
  description: string
  /** Author or organization name */
  author: string
  /** Plugin homepage URL */
  homepage?: string
  /** Source repository URL */
  repository?: string
  /** SPDX license identifier */
  license: string
  /** Icon URL or base64 data URI */
  icon?: string
  /** Screenshot URLs for marketplace display */
  screenshots?: string[]
  /** Marketplace category for filtering */
  category: string
  /** Tags for search and discovery */
  tags: string[]
  /** Permissions required by this plugin */
  permissions: PluginPermission[]
  /** JSON Schema for plugin settings validation */
  settingsSchema?: Record<string, unknown>
  /** Platform API version this plugin targets */
  apiVersion: string
  /** Minimum platform version required */
  minPlatformVersion: string
  /** Maximum platform version supported */
  maxPlatformVersion?: string
  /** Dependencies on other plugins: pluginId → version range */
  dependencies?: Record<string, string>
  /** Configuration UI component path or descriptor */
  configurationUI?: PluginConfigurationUI
}

/**
 * Descriptor for the plugin's configuration UI, enabling dynamic rendering
 * of settings panels in the admin interface.
 */
export interface PluginConfigurationUI {
  /** Path to the settings component within the plugin bundle */
  componentPath: string
  /** Display name for the settings tab */
  label: string
  /** Icon name from Lucide icons */
  icon?: string
  /** Sort order for tab positioning */
  order?: number
}

// ──────────────────────────────────────────────────────────────
// Plugin Lifecycle State
// ──────────────────────────────────────────────────────────────

/**
 * The full lifecycle state machine for a plugin installation.
 * Transitions are enforced by the lifecycle manager.
 *
 * Valid transitions:
 *   uninstalled → installing
 *   installing → installed | error
 *   installed → enabling | uninstalling
 *   enabling → enabled | error
 *   enabled → disabling
 *   disabling → disabled | error
 *   disabled → enabling | uninstalling
 *   uninstalling → uninstalled | error
 *   error → installing (retry) | uninstalling
 */
export type PluginLifecycleState =
  | 'uninstalled'
  | 'installing'
  | 'installed'
  | 'enabling'
  | 'enabled'
  | 'disabling'
  | 'disabled'
  | 'uninstalling'
  | 'error'

/**
 * Valid state transitions map for the plugin lifecycle state machine.
 */
export const LIFECYCLE_TRANSITIONS: Record<PluginLifecycleState, PluginLifecycleState[]> = {
  uninstalled: ['installing'],
  installing: ['installed', 'error'],
  installed: ['enabling', 'uninstalling'],
  enabling: ['enabled', 'error'],
  enabled: ['disabling'],
  disabling: ['disabled', 'error'],
  disabled: ['enabling', 'uninstalling'],
  uninstalling: ['uninstalled', 'error'],
  error: ['installing', 'uninstalling'],
}

// ──────────────────────────────────────────────────────────────
// Plugin Installation
// ──────────────────────────────────────────────────────────────

/**
 * Installation status within an organization.
 */
export type PluginInstallationStatus = 'installed' | 'enabled' | 'disabled' | 'error' | 'suspended'

/**
 * Represents a plugin installed in an organization. Persisted in the
 * plugin_installations Supabase table.
 */
export interface PluginInstallation {
  /** Unique installation record ID */
  id: string
  /** Reference to the plugin manifest ID */
  pluginId: string
  /** Organization that owns this installation */
  organizationId: string
  /** User who performed the installation */
  installedBy: string
  /** Timestamp of installation */
  installedAt: string
  /** Currently installed version */
  version: string
  /** Previous version (for rollback) */
  previousVersion?: string
  /** Current installation status */
  status: PluginInstallationStatus
  /** Current lifecycle state */
  lifecycleState: PluginLifecycleState
  /** Plugin settings (validated against settingsSchema) */
  settings: Record<string, unknown>
  /** Permissions granted by the organization admin */
  grantedPermissions: PluginPermission[]
  /** Last error message if status is 'error' */
  lastError?: string
  /** Timestamp of last status change */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Plugin Sandbox
// ──────────────────────────────────────────────────────────────

/**
 * Resource limits for sandboxed plugin execution.
 */
export interface PluginSandboxLimits {
  /** Maximum CPU time in milliseconds per execution */
  cpuMs: number
  /** Maximum memory in megabytes per execution */
  memoryMb: number
  /** Maximum wall-clock time in milliseconds per execution */
  timeoutMs: number
  /** Maximum number of API calls per execution */
  maxApiCalls: number
}

/**
 * Default sandbox limits by plugin type.
 */
export const DEFAULT_SANDBOX_LIMITS: Record<PluginType, PluginSandboxLimits> = {
  app: { cpuMs: 5000, memoryMb: 256, timeoutMs: 30000, maxApiCalls: 100 },
  theme: { cpuMs: 1000, memoryMb: 64, timeoutMs: 5000, maxApiCalls: 10 },
  widget: { cpuMs: 3000, memoryMb: 128, timeoutMs: 15000, maxApiCalls: 50 },
  ai_skill: { cpuMs: 30000, memoryMb: 512, timeoutMs: 120000, maxApiCalls: 200 },
  integration: { cpuMs: 10000, memoryMb: 256, timeoutMs: 60000, maxApiCalls: 150 },
  report: { cpuMs: 15000, memoryMb: 256, timeoutMs: 60000, maxApiCalls: 100 },
  analytics: { cpuMs: 20000, memoryMb: 512, timeoutMs: 120000, maxApiCalls: 200 },
  certificate: { cpuMs: 5000, memoryMb: 128, timeoutMs: 30000, maxApiCalls: 50 },
  question_type: { cpuMs: 5000, memoryMb: 128, timeoutMs: 15000, maxApiCalls: 80 },
  payment_provider: { cpuMs: 10000, memoryMb: 256, timeoutMs: 30000, maxApiCalls: 50 },
  identity_provider: { cpuMs: 5000, memoryMb: 128, timeoutMs: 15000, maxApiCalls: 30 },
  communication_provider: { cpuMs: 8000, memoryMb: 256, timeoutMs: 30000, maxApiCalls: 100 },
}

/**
 * Network access policy for sandboxed plugins.
 */
export type NetworkAccessPolicy = 'none' | 'allowlisted' | 'full'

/**
 * Complete sandbox configuration for a plugin execution context.
 */
export interface PluginSandbox {
  /** Resource limits */
  resourceLimits: PluginSandboxLimits
  /** List of APIs the plugin is allowed to call */
  allowedApis: string[]
  /** Network access policy */
  networkAccess: NetworkAccessPolicy
}

// ──────────────────────────────────────────────────────────────
// Plugin Version
// ──────────────────────────────────────────────────────────────

/**
 * Version compatibility status against the current platform.
 */
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'untested'

/**
 * Represents a specific version of a plugin in the registry.
 */
export interface PluginVersion {
  /** Semantic version string */
  version: string
  /** Changelog or release notes for this version */
  changelog: string
  /** Timestamp of release */
  releasedAt: string
  /** Compatibility status with the current platform */
  compatibility: CompatibilityStatus
  /** URL to download the plugin bundle */
  downloadUrl: string
  /** SHA-256 checksum of the plugin bundle */
  checksum: string
  /** Whether this version is deprecated */
  deprecated: boolean
  /** Minimum platform version required by this version */
  minPlatformVersion: string
  /** Maximum platform version supported by this version */
  maxPlatformVersion?: string
}

// ──────────────────────────────────────────────────────────────
// Plugin Review
// ──────────────────────────────────────────────────────────────

/**
 * A user review/rating for a plugin in the marketplace.
 */
export interface PluginReview {
  /** Unique review ID */
  id: string
  /** Plugin being reviewed */
  pluginId: string
  /** User who wrote the review */
  userId: string
  /** User display name */
  userName: string
  /** Rating from 1 to 5 */
  rating: number
  /** Text review content */
  review: string
  /** Timestamp of review creation */
  createdAt: string
  /** Whether the review has been moderated */
  moderated: boolean
}

// ──────────────────────────────────────────────────────────────
// Plugin Marketplace Listing
// ──────────────────────────────────────────────────────────────

/**
 * Aggregate statistics for a plugin in the marketplace.
 */
export interface PluginMarketplaceStats {
  /** Total installations across all organizations */
  installs: number
  /** Average rating (1-5) */
  rating: number
  /** Total number of reviews */
  reviews: number
  /** Total downloads (includes re-downloads) */
  downloads: number
  /** Trending score for ranking */
  trendingScore: number
}

/**
 * A complete marketplace listing combining manifest, versions, stats,
 * and marketplace flags.
 */
export interface PluginMarketplaceListing {
  /** The plugin manifest */
  plugin: PluginManifest
  /** All available versions (sorted newest first) */
  versions: PluginVersion[]
  /** Aggregate statistics */
  stats: PluginMarketplaceStats
  /** Whether this plugin is featured on the marketplace */
  featured: boolean
  /** Whether this plugin is verified by the platform team */
  verified: boolean
  /** Last updated timestamp */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Plugin Search & Filters
// ──────────────────────────────────────────────────────────────

/**
 * Search query parameters for the plugin marketplace.
 */
export interface PluginSearchQuery {
  /** Text search across name, description, tags */
  query?: string
  /** Filter by plugin type */
  type?: PluginType
  /** Filter by category */
  category?: string
  /** Filter by tags (any match) */
  tags?: string[]
  /** Filter by verified status */
  verified?: boolean
  /** Filter by featured status */
  featured?: boolean
  /** Sort field */
  sortBy?: 'name' | 'installs' | 'rating' | 'updated' | 'trending'
  /** Sort direction */
  sortDir?: 'asc' | 'desc'
  /** Pagination offset */
  offset?: number
  /** Pagination limit */
  limit?: number
}

/**
 * Paginated result set for plugin searches.
 */
export interface PluginSearchResult {
  /** Matching listings */
  listings: PluginMarketplaceListing[]
  /** Total number of matches */
  total: number
  /** Current offset */
  offset: number
  /** Page size */
  limit: number
}

// ──────────────────────────────────────────────────────────────
// Plugin Lifecycle Hooks
// ──────────────────────────────────────────────────────────────

/**
 * Lifecycle hooks that a plugin can implement.
 */
export type PluginHook =
  | 'onInstall'
  | 'onEnable'
  | 'onDisable'
  | 'onUninstall'
  | 'onUpdate'
  | 'onSettingsChange'

/**
 * Context passed to a plugin lifecycle hook.
 */
export interface PluginHookContext {
  /** Installation record ID */
  installationId: string
  /** Plugin manifest */
  manifest: PluginManifest
  /** Current settings */
  settings: Record<string, unknown>
  /** Granted permissions */
  grantedPermissions: PluginPermission[]
  /** Previous version (for onUpdate) */
  previousVersion?: string
  /** Target version (for onUpdate) */
  targetVersion?: string
}

/**
 * Result returned from a lifecycle hook execution.
 */
export interface PluginHookResult {
  /** Whether the hook succeeded */
  success: boolean
  /** Optional error message */
  error?: string
  /** Optional updated settings (e.g., from migration) */
  migratedSettings?: Record<string, unknown>
  /** Execution time in milliseconds */
  executionTimeMs: number
}

// ──────────────────────────────────────────────────────────────
// Plugin Installation Config
// ──────────────────────────────────────────────────────────────

/**
 * Configuration provided when installing a plugin.
 */
export interface PluginInstallConfig {
  /** Initial settings values */
  settings?: Record<string, unknown>
  /** Permissions to grant (must be subset of manifest.permissions) */
  grantedPermissions: PluginPermission[]
  /** Override sandbox limits (requires admin) */
  sandboxOverrides?: Partial<PluginSandboxLimits>
}

// ──────────────────────────────────────────────────────────────
// Audit Log
// ──────────────────────────────────────────────────────────────

/**
 * An audit log entry for a plugin API call or action.
 */
export interface PluginAuditLog {
  /** Unique log entry ID */
  id: string
  /** Plugin that performed the action */
  pluginId: string
  /** Installation context */
  installationId: string
  /** API or action that was called */
  action: string
  /** Timestamp of the action */
  timestamp: string
  /** Whether the action was permitted */
  permitted: boolean
  /** Result of the action (success/failure) */
  result: 'success' | 'failure'
  /** Error message if the action failed */
  error?: string
  /** Resource usage metrics */
  resourceUsage?: {
    cpuMs: number
    memoryMb: number
    durationMs: number
    apiCalls: number
  }
}

// ──────────────────────────────────────────────────────────────
// Sandboxed API Surface
// ──────────────────────────────────────────────────────────────

/**
 * The sandboxed API surface exposed to plugins. Each namespace is scoped
 * by the plugin's granted permissions.
 */
export interface SandboxedAPI {
  /** Profile read/write operations (scoped by read_profiles, write_profiles) */
  profiles: {
    read(userId: string): Promise<Record<string, unknown> | null>
    readMany(userIds: string[]): Promise<Record<string, unknown>[]>
    write(userId: string, data: Record<string, unknown>): Promise<boolean>
  }
  /** Exam read/write operations (scoped by read_exams, write_exams) */
  exams: {
    read(examId: string): Promise<Record<string, unknown> | null>
    readMany(filters: Record<string, unknown>): Promise<Record<string, unknown>[]>
    write(examId: string, data: Record<string, unknown>): Promise<boolean>
    create(data: Record<string, unknown>): Promise<string | null>
  }
  /** Question read/write operations (scoped by read_questions, write_questions) */
  questions: {
    read(questionId: string): Promise<Record<string, unknown> | null>
    readMany(filters: Record<string, unknown>): Promise<Record<string, unknown>[]>
    write(questionId: string, data: Record<string, unknown>): Promise<boolean>
    create(data: Record<string, unknown>): Promise<string | null>
  }
  /** Result read/write operations (scoped by read_results, write_results) */
  results: {
    read(resultId: string): Promise<Record<string, unknown> | null>
    readMany(filters: Record<string, unknown>): Promise<Record<string, unknown>[]>
    write(resultId: string, data: Record<string, unknown>): Promise<boolean>
  }
  /** Notification operations (scoped by send_notifications) */
  notifications: {
    send(userId: string, message: Record<string, unknown>): Promise<boolean>
    sendBatch(userIds: string[], message: Record<string, unknown>): Promise<number>
  }
  /** AI operations (scoped by use_ai, with credit tracking) */
  ai: {
    execute(prompt: string, options: Record<string, unknown>): Promise<string | null>
    stream(prompt: string, options: Record<string, unknown>): AsyncIterable<string>
    getCredits(): Promise<{ used: number; limit: number; remaining: number }>
  }
  /** Plugin-scoped storage operations */
  storage: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<boolean>
    delete(key: string): Promise<boolean>
    list(prefix?: string): Promise<string[]>
  }
  /** Plugin-scoped settings operations */
  settings: {
    get(): Promise<Record<string, unknown>>
    update(settings: Record<string, unknown>): Promise<boolean>
  }
  /** Event publish/subscribe operations (scoped to plugin namespace) */
  events: {
    publish(event: string, payload: Record<string, unknown>): Promise<boolean>
    subscribe(event: string, handler: (payload: Record<string, unknown>) => void): Promise<string>
    unsubscribe(subscriptionId: string): Promise<boolean>
  }
}

// ──────────────────────────────────────────────────────────────
// JSON Schema Validation
// ──────────────────────────────────────────────────────────────

/**
 * Result of validating settings against a JSON Schema.
 */
export interface SettingsValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation errors (if any) */
  errors: SettingsValidationError[]
}

/**
 * A single validation error from JSON Schema validation.
 */
export interface SettingsValidationError {
  /** JSON pointer to the invalid field */
  path: string
  /** Error message */
  message: string
  /** The validation keyword that failed */
  keyword: string
  /** The expected value for the keyword */
  expected?: unknown
  /** The actual value provided */
  actual?: unknown
}
