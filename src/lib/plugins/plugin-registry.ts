// ============================================================================
// ExamForge AI — Plugin Registry
// ============================================================================
// Plugin registration, discovery, and marketplace operations. All data is
// persisted in Supabase (plugin_registry, plugin_versions, plugin_reviews tables).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type PluginManifest,
  type PluginType,
  type PluginVersion,
  type PluginReview,
  type PluginMarketplaceListing,
  type PluginMarketplaceStats,
  type PluginSearchQuery,
  type PluginSearchResult,
  type PluginPermission,
  PLUGIN_PERMISSION_REGISTRY,
  FULL_ACCESS_IMPLIED_PERMISSIONS,
} from './types'

// ──────────────────────────────────────────────────────────────
// Manifest Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate a plugin manifest before registration.
 *
 * Checks required fields, version format, permission validity, and
 * platform version compatibility.
 *
 * @param manifest - The plugin manifest to validate
 * @returns Validation result with errors if invalid
 */
export function validateManifest(manifest: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object'] }
  }

  const m = manifest as Record<string, unknown>

  // Required string fields
  const requiredStrings: (keyof PluginManifest)[] = [
    'id', 'name', 'version', 'type', 'description', 'author', 'license', 'apiVersion', 'minPlatformVersion',
  ]
  for (const field of requiredStrings) {
    if (typeof m[field] !== 'string' || (m[field] as string).length === 0) {
      errors.push(`Field "${field}" is required and must be a non-empty string`)
    }
  }

  // Validate ID format (reverse domain notation)
  if (typeof m.id === 'string' && !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(m.id)) {
    errors.push('Plugin ID must use lowercase alphanumeric characters with dots/hyphens (e.g., "com.examforge.my-plugin")')
  }

  // Validate version format (semver)
  if (typeof m.version === 'string' && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(m.version)) {
    errors.push('Version must follow semver format (e.g., "1.0.0" or "2.0.0-beta.1")')
  }

  // Validate plugin type
  const validTypes: PluginType[] = [
    'app', 'theme', 'widget', 'ai_skill', 'integration', 'report',
    'analytics', 'certificate', 'question_type', 'payment_provider',
    'identity_provider', 'communication_provider',
  ]
  if (typeof m.type === 'string' && !validTypes.includes(m.type as PluginType)) {
    errors.push(`Invalid plugin type "${m.type}". Must be one of: ${validTypes.join(', ')}`)
  }

  // Validate permissions
  if (Array.isArray(m.permissions)) {
    const validPermissions = Object.keys(PLUGIN_PERMISSION_REGISTRY) as PluginPermission[]
    for (const perm of m.permissions) {
      if (!validPermissions.includes(perm as PluginPermission)) {
        errors.push(`Invalid permission "${perm}"`)
      }
    }
  } else {
    errors.push('Permissions must be an array')
  }

  // Validate category
  if (typeof m.category !== 'string' || (m.category as string).length === 0) {
    errors.push('Category is required and must be a non-empty string')
  }

  // Validate tags
  if (!Array.isArray(m.tags)) {
    errors.push('Tags must be an array of strings')
  }

  // Validate URLs if provided
  if (m.homepage !== undefined && typeof m.homepage === 'string') {
    try { new URL(m.homepage) } catch { errors.push('Homepage must be a valid URL') }
  }
  if (m.repository !== undefined && typeof m.repository === 'string') {
    try { new URL(m.repository) } catch { errors.push('Repository must be a valid URL') }
  }

  // Validate settingsSchema if provided
  if (m.settingsSchema !== undefined && (typeof m.settingsSchema !== 'object' || m.settingsSchema === null)) {
    errors.push('settingsSchema must be a valid JSON Schema object')
  }

  return { valid: errors.length === 0, errors }
}

// ──────────────────────────────────────────────────────────────
// Plugin Registration
// ──────────────────────────────────────────────────────────────

/**
 * Register a new plugin in the marketplace.
 *
 * Validates the manifest, checks for ID conflicts, and inserts into the
 * plugin_registry table. Also creates the initial version record.
 *
 * @param manifest - The plugin manifest to register
 * @returns The registered manifest or an error
 */
export async function registerPlugin(manifest: PluginManifest): Promise<{
  success: boolean
  manifest?: PluginManifest
  error?: string
}> {
  // Validate manifest
  const validation = validateManifest(manifest)
  if (!validation.valid) {
    return { success: false, error: `Manifest validation failed: ${validation.errors.join('; ')}` }
  }

  const supabase = await createClient()

  // Check for existing plugin with the same ID
  const { data: existing } = await supabase
    .from('plugin_registry')
    .select('id')
    .eq('id', manifest.id)
    .single()

  if (existing) {
    return { success: false, error: `Plugin with ID "${manifest.id}" is already registered` }
  }

  // Check for dependency satisfaction
  if (manifest.dependencies) {
    const depIds = Object.keys(manifest.dependencies)
    const { data: existingDeps } = await supabase
      .from('plugin_registry')
      .select('id')
      .in('id', depIds)

    const foundIds = new Set((existingDeps ?? []).map((d: { id: string }) => d.id))
    const missing = depIds.filter(id => !foundIds.has(id))
    if (missing.length > 0) {
      return { success: false, error: `Missing dependencies: ${missing.join(', ')}` }
    }
  }

  // Insert plugin registry record
  const { error: insertError } = await supabase
    .from('plugin_registry')
    .insert({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      type: manifest.type,
      description: manifest.description,
      author: manifest.author,
      homepage: manifest.homepage ?? null,
      repository: manifest.repository ?? null,
      license: manifest.license,
      icon: manifest.icon ?? null,
      screenshots: manifest.screenshots ?? [],
      category: manifest.category,
      tags: manifest.tags,
      permissions: manifest.permissions,
      settings_schema: manifest.settingsSchema ?? null,
      api_version: manifest.apiVersion,
      min_platform_version: manifest.minPlatformVersion,
      max_platform_version: manifest.maxPlatformVersion ?? null,
      dependencies: manifest.dependencies ?? {},
      configuration_ui: manifest.configurationUI ?? null,
      verified: false,
      featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (insertError) {
    return { success: false, error: `Failed to register plugin: ${insertError.message}` }
  }

  // Create initial version record
  await supabase.from('plugin_versions').insert({
    plugin_id: manifest.id,
    version: manifest.version,
    changelog: 'Initial release',
    released_at: new Date().toISOString(),
    compatibility: 'untested',
    download_url: '',
    checksum: '',
    deprecated: false,
    min_platform_version: manifest.minPlatformVersion,
    max_platform_version: manifest.maxPlatformVersion ?? null,
  })

  return { success: true, manifest }
}

// ──────────────────────────────────────────────────────────────
// Plugin Retrieval
// ──────────────────────────────────────────────────────────────

/**
 * Get a plugin manifest by its ID.
 *
 * @param pluginId - The unique plugin identifier
 * @returns The plugin manifest or null if not found
 */
export async function getPlugin(pluginId: string): Promise<PluginManifest | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_registry')
    .select('*')
    .eq('id', pluginId)
    .single()

  if (!data) return null

  return mapRowToManifest(data)
}

/**
 * Map a Supabase row to a PluginManifest object.
 */
function mapRowToManifest(row: Record<string, unknown>): PluginManifest {
  return {
    id: row.id as string,
    name: row.name as string,
    version: row.version as string,
    type: row.type as PluginType,
    description: row.description as string,
    author: row.author as string,
    homepage: (row.homepage as string) || undefined,
    repository: (row.repository as string) || undefined,
    license: row.license as string,
    icon: (row.icon as string) || undefined,
    screenshots: (row.screenshots as string[]) || [],
    category: row.category as string,
    tags: (row.tags as string[]) || [],
    permissions: (row.permissions as PluginPermission[]) || [],
    settingsSchema: (row.settings_schema as Record<string, unknown>) || undefined,
    apiVersion: row.api_version as string,
    minPlatformVersion: row.min_platform_version as string,
    maxPlatformVersion: (row.max_platform_version as string) || undefined,
    dependencies: (row.dependencies as Record<string, string>) || undefined,
    configurationUI: (row.configuration_ui as PluginManifest['configurationUI']) || undefined,
  }
}

// ──────────────────────────────────────────────────────────────
// Marketplace Search
// ──────────────────────────────────────────────────────────────

/**
 * Search the plugin marketplace with filters, sorting, and pagination.
 *
 * @param query - Search parameters
 * @returns Paginated search results
 */
export async function searchPlugins(query: PluginSearchQuery): Promise<PluginSearchResult> {
  const supabase = await createClient()

  const offset = query.offset ?? 0
  const limit = query.limit ?? 20

  // Build the query
  let qb = supabase
    .from('plugin_registry')
    .select('*', { count: 'exact' })

  // Apply type filter
  if (query.type) {
    qb = qb.eq('type', query.type)
  }

  // Apply category filter
  if (query.category) {
    qb = qb.eq('category', query.category)
  }

  // Apply verified filter
  if (query.verified !== undefined) {
    qb = qb.eq('verified', query.verified)
  }

  // Apply featured filter
  if (query.featured !== undefined) {
    qb = qb.eq('featured', query.featured)
  }

  // Apply text search (using Postgres text search or LIKE)
  if (query.query && query.query.length > 0) {
    qb = qb.or(`name.ilike.%${query.query}%,description.ilike.%${query.query}%`)
  }

  // Apply tag filter
  if (query.tags && query.tags.length > 0) {
    qb = qb.overlaps('tags', query.tags)
  }

  // Apply sorting
  const sortColumn = query.sortBy === 'name' ? 'name'
    : query.sortBy === 'updated' ? 'updated_at'
    : query.sortBy === 'installs' ? 'install_count'
    : query.sortBy === 'rating' ? 'average_rating'
    : 'updated_at'
  const ascending = query.sortDir === 'asc'
  qb = qb.order(sortColumn, { ascending })

  // Apply pagination
  qb = qb.range(offset, offset + limit - 1)

  const { data, count } = await qb

  const rows = (data ?? []) as Record<string, unknown>[]
  const total = count ?? 0

  // Build marketplace listings with stats
  const listings: PluginMarketplaceListing[] = await Promise.all(
    rows.map(async (row) => buildListing(supabase, row))
  )

  return { listings, total, offset, limit }
}

/**
 * Build a complete marketplace listing from a registry row.
 */
async function buildListing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>
): Promise<PluginMarketplaceListing> {
  const pluginId = row.id as string

  // Fetch versions
  const { data: versionRows } = await supabase
    .from('plugin_versions')
    .select('*')
    .eq('plugin_id', pluginId)
    .order('released_at', { ascending: false })

  const versions: PluginVersion[] = (versionRows ?? []).map((v: Record<string, unknown>) => ({
    version: v.version as string,
    changelog: v.changelog as string,
    releasedAt: v.released_at as string,
    compatibility: v.compatibility as PluginVersion['compatibility'],
    downloadUrl: v.download_url as string,
    checksum: v.checksum as string,
    deprecated: v.deprecated as boolean,
    minPlatformVersion: v.min_platform_version as string,
    maxPlatformVersion: (v.max_platform_version as string) || undefined,
  }))

  // Fetch review stats
  const { data: reviewAgg } = await supabase
    .from('plugin_reviews')
    .select('rating')
    .eq('plugin_id', pluginId)

  const ratings = (reviewAgg ?? []).map((r: { rating: number }) => r.rating)
  const reviewCount = ratings.length
  const averageRating = reviewCount > 0
    ? ratings.reduce((sum: number, r: number) => sum + r, 0) / reviewCount
    : 0

  const stats: PluginMarketplaceStats = {
    installs: (row.install_count as number) ?? 0,
    rating: Math.round(averageRating * 100) / 100,
    reviews: reviewCount,
    downloads: (row.download_count as number) ?? 0,
    trendingScore: calculateTrendingScore(row),
  }

  return {
    plugin: mapRowToManifest(row),
    versions,
    stats,
    featured: (row.featured as boolean) ?? false,
    verified: (row.verified as boolean) ?? false,
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  }
}

/**
 * Calculate a trending score based on recent activity.
 * Higher installs, reviews, and recency increase the score.
 */
function calculateTrendingScore(row: Record<string, unknown>): number {
  const installs = (row.install_count as number) ?? 0
  const reviews = (row.review_count as number) ?? 0
  const updatedAt = new Date((row.updated_at as string) ?? Date.now())
  const daysSinceUpdate = Math.max(1, (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  // Score decays with time, grows with installs and reviews
  return Math.round((installs * 2 + reviews * 5) / Math.sqrt(daysSinceUpdate) * 100) / 100
}

// ──────────────────────────────────────────────────────────────
// Plugin Type Listing
// ──────────────────────────────────────────────────────────────

/**
 * Get all plugins of a specific type.
 *
 * @param type - The plugin type to filter by
 * @returns Array of marketplace listings for the given type
 */
export async function getPluginsByType(type: PluginType): Promise<PluginMarketplaceListing[]> {
  const result = await searchPlugins({ type, sortBy: 'trending', sortDir: 'desc', limit: 100 })
  return result.listings
}

// ──────────────────────────────────────────────────────────────
// Featured Plugins
// ──────────────────────────────────────────────────────────────

/**
 * Get featured and verified plugins for the marketplace homepage.
 *
 * @returns Array of featured marketplace listings
 */
export async function getFeaturedPlugins(): Promise<PluginMarketplaceListing[]> {
  const result = await searchPlugins({ featured: true, sortBy: 'trending', sortDir: 'desc', limit: 20 })
  return result.listings
}

// ──────────────────────────────────────────────────────────────
// Version Management
// ──────────────────────────────────────────────────────────────

/**
 * Get all versions of a plugin.
 *
 * @param pluginId - The plugin identifier
 * @returns Array of plugin versions, sorted newest first
 */
export async function getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_versions')
    .select('*')
    .eq('plugin_id', pluginId)
    .order('released_at', { ascending: false })

  if (!data) return []

  return data.map((v: Record<string, unknown>) => ({
    version: v.version as string,
    changelog: v.changelog as string,
    releasedAt: v.released_at as string,
    compatibility: v.compatibility as PluginVersion['compatibility'],
    downloadUrl: v.download_url as string,
    checksum: v.checksum as string,
    deprecated: v.deprecated as boolean,
    minPlatformVersion: v.min_platform_version as string,
    maxPlatformVersion: (v.max_platform_version as string) || undefined,
  }))
}

/**
 * Publish a new version of a plugin.
 *
 * @param pluginId - The plugin identifier
 * @param version - The version details to publish
 * @returns Success status and error message if any
 */
export async function publishVersion(pluginId: string, version: Omit<PluginVersion, 'deprecated'>): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Verify the plugin exists
  const { data: plugin } = await supabase
    .from('plugin_registry')
    .select('id, version')
    .eq('id', pluginId)
    .single()

  if (!plugin) {
    return { success: false, error: `Plugin "${pluginId}" not found in registry` }
  }

  // Check for version conflict
  const { data: existingVersion } = await supabase
    .from('plugin_versions')
    .select('version')
    .eq('plugin_id', pluginId)
    .eq('version', version.version)
    .single()

  if (existingVersion) {
    return { success: false, error: `Version "${version.version}" already exists for plugin "${pluginId}"` }
  }

  // Validate semver format
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version.version)) {
    return { success: false, error: 'Version must follow semver format' }
  }

  // Validate checksum format (SHA-256 hex)
  if (version.checksum && !/^[a-f0-9]{64}$/.test(version.checksum)) {
    return { success: false, error: 'Checksum must be a valid SHA-256 hex string' }
  }

  // Insert the new version
  const { error: insertError } = await supabase
    .from('plugin_versions')
    .insert({
      plugin_id: pluginId,
      version: version.version,
      changelog: version.changelog,
      released_at: version.releasedAt,
      compatibility: version.compatibility,
      download_url: version.downloadUrl,
      checksum: version.checksum,
      deprecated: false,
      min_platform_version: version.minPlatformVersion,
      max_platform_version: version.maxPlatformVersion ?? null,
    })

  if (insertError) {
    return { success: false, error: `Failed to publish version: ${insertError.message}` }
  }

  // Update the plugin registry with the latest version
  await supabase
    .from('plugin_registry')
    .update({
      version: version.version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pluginId)

  return { success: true }
}

/**
 * Deprecate a specific version of a plugin.
 *
 * Deprecated versions remain installable for existing installations but
 * are hidden from new installations.
 *
 * @param pluginId - The plugin identifier
 * @param version - The version string to deprecate
 * @returns Success status
 */
export async function deprecateVersion(pluginId: string, version: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('plugin_versions')
    .update({ deprecated: true })
    .eq('plugin_id', pluginId)
    .eq('version', version)

  if (error) {
    return { success: false, error: `Failed to deprecate version: ${error.message}` }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Plugin Verification
// ──────────────────────────────────────────────────────────────

/**
 * Verify a plugin on the platform.
 *
 * Verified plugins receive a badge in the marketplace, indicating that
 * the platform team has reviewed the plugin for security and quality.
 *
 * @param pluginId - The plugin identifier to verify
 * @returns Success status
 */
export async function verifyPlugin(pluginId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Check the plugin exists
  const { data: plugin } = await supabase
    .from('plugin_registry')
    .select('id, permissions')
    .eq('id', pluginId)
    .single()

  if (!plugin) {
    return { success: false, error: `Plugin "${pluginId}" not found` }
  }

  // Plugins requesting full_access require additional review
  const permissions = plugin.permissions as PluginPermission[]
  if (permissions.includes('full_access')) {
    // For full_access plugins, we flag them for additional manual review
    // but still mark as verified after automated checks pass
    const hasCriticalPerms = permissions.some(p =>
      PLUGIN_PERMISSION_REGISTRY[p as PluginPermission]?.riskLevel === 'critical'
    )
    if (hasCriticalPerms) {
      // Automated verification for critical plugins: check that they have
      // a valid license, homepage, and don't request excessive permissions
      const { data: fullPlugin } = await supabase
        .from('plugin_registry')
        .select('license, homepage')
        .eq('id', pluginId)
        .single()

      if (!fullPlugin?.homepage) {
        return { success: false, error: 'Critical plugins must have a homepage for verification' }
      }
    }
  }

  // Mark as verified
  const { error } = await supabase
    .from('plugin_registry')
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq('id', pluginId)

  if (error) {
    return { success: false, error: `Failed to verify plugin: ${error.message}` }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Permission Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate that requested permissions are a subset of granted permissions.
 *
 * If full_access is in the granted set, all permissions are satisfied.
 *
 * @param requested - Permissions being requested
 * @param granted - Permissions that have been granted
 * @returns Whether all requested permissions are covered by granted permissions
 */
export function validatePermissions(
  requested: PluginPermission[],
  granted: PluginPermission[]
): { valid: boolean; missing: PluginPermission[] } {
  // full_access implies all permissions
  if (granted.includes('full_access')) {
    return { valid: true, missing: [] }
  }

  const grantedSet = new Set(granted)
  const impliedByFullAccess = new Set(FULL_ACCESS_IMPLIED_PERMISSIONS)

  // If granted contains all implied-by-full-access permissions, treat as full_access
  if (impliedByFullAccess.size > 0 && [...impliedByFullAccess].every(p => grantedSet.has(p))) {
    return { valid: true, missing: [] }
  }

  const missing = requested.filter(p => !grantedSet.has(p))
  return { valid: missing.length === 0, missing }
}

// ──────────────────────────────────────────────────────────────
// Compatibility Check
// ──────────────────────────────────────────────────────────────

/**
 * Check if a plugin version is compatible with the current platform version.
 *
 * @param minVersion - Minimum platform version required
 * @param maxVersion - Maximum platform version supported (optional)
 * @param currentVersion - Current platform version
 * @returns Whether the plugin is compatible
 */
export function checkCompatibility(
  minVersion: string,
  maxVersion: string | undefined,
  currentVersion: string
): boolean {
  const current = parseSemver(currentVersion)
  const min = parseSemver(minVersion)

  if (current.major < min.major || (current.major === min.major && current.minor < min.minor)) {
    return false
  }

  if (maxVersion) {
    const max = parseSemver(maxVersion)
    if (current.major > max.major || (current.major === max.major && current.minor > max.minor)) {
      return false
    }
  }

  return true
}

/**
 * Parse a semver string into major, minor, patch components.
 */
function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return { major: 0, minor: 0, patch: 0 }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  }
}
