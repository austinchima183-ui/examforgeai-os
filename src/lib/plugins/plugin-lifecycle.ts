// ============================================================================
// ExamForge AI — Plugin Lifecycle Management
// ============================================================================
// Manages the full lifecycle of plugin installations: install, enable, disable,
// uninstall, update, and rollback. Enforces the lifecycle state machine and
// validates permissions at every boundary.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type PluginInstallation,
  type PluginInstallationStatus,
  type PluginLifecycleState,
  type PluginManifest,
  type PluginPermission,
  type PluginInstallConfig,
  type PluginHook,
  type PluginHookContext,
  type PluginHookResult,
  type PluginSandboxLimits,
  LIFECYCLE_TRANSITIONS,
  DEFAULT_SANDBOX_LIMITS,
} from './types'
import { getPlugin, validatePermissions, getPluginVersions, checkCompatibility } from './plugin-registry'
import { executeLifecycleHook } from './plugin-sandbox'
import { validateSettings } from './plugin-settings'

// ──────────────────────────────────────────────────────────────
// Platform Version
// ──────────────────────────────────────────────────────────────

/** Current platform API version */
const PLATFORM_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'

// ──────────────────────────────────────────────────────────────
// State Machine Enforcement
// ──────────────────────────────────────────────────────────────

/**
 * Validate that a lifecycle state transition is allowed.
 *
 * @param current - Current lifecycle state
 * @param target - Desired target state
 * @returns Whether the transition is valid
 */
function isValidTransition(current: PluginLifecycleState, target: PluginLifecycleState): boolean {
  const allowed = LIFECYCLE_TRANSITIONS[current]
  return allowed.includes(target)
}

/**
 * Attempt a lifecycle state transition, persisting the new state to the
 * database. Returns the updated state or an error if the transition is invalid.
 */
async function transitionState(
  installationId: string,
  targetState: PluginLifecycleState,
  status: PluginInstallationStatus,
  error?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current state
  const { data: current } = await supabase
    .from('plugin_installations')
    .select('lifecycle_state')
    .eq('id', installationId)
    .single()

  if (!current) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  const currentState = current.lifecycle_state as PluginLifecycleState

  if (!isValidTransition(currentState, targetState)) {
    return {
      success: false,
      error: `Invalid lifecycle transition: ${currentState} → ${targetState}. Allowed transitions from ${currentState}: [${LIFECYCLE_TRANSITIONS[currentState].join(', ')}]`,
    }
  }

  const updateData: Record<string, unknown> = {
    lifecycle_state: targetState,
    status,
    updated_at: new Date().toISOString(),
  }

  if (error) {
    updateData.last_error = error
  }

  const { error: updateError } = await supabase
    .from('plugin_installations')
    .update(updateData)
    .eq('id', installationId)

  if (updateError) {
    return { success: false, error: `Failed to update state: ${updateError.message}` }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Install Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Install a plugin for an organization.
 *
 * Validates the plugin exists, checks compatibility, validates requested
 * permissions against the manifest, and creates an installation record.
 *
 * @param pluginId - The plugin to install
 * @param orgId - The organization installing the plugin
 * @param config - Installation configuration including permissions and settings
 * @param userId - The user performing the installation
 * @returns The installation record or an error
 */
export async function installPlugin(
  pluginId: string,
  orgId: string,
  config: PluginInstallConfig,
  userId: string
): Promise<{
  success: boolean
  installation?: PluginInstallation
  error?: string
}> {
  // 1. Fetch and validate the plugin manifest
  const manifest = await getPlugin(pluginId)
  if (!manifest) {
    return { success: false, error: `Plugin "${pluginId}" not found in registry` }
  }

  // 2. Check platform compatibility
  if (!checkCompatibility(manifest.minPlatformVersion, manifest.maxPlatformVersion, PLATFORM_VERSION)) {
    return {
      success: false,
      error: `Plugin requires platform version ${manifest.minPlatformVersion}${manifest.maxPlatformVersion ? `-${manifest.maxPlatformVersion}` : '+'}, current version is ${PLATFORM_VERSION}`,
    }
  }

  // 3. Validate that requested permissions are a subset of manifest permissions
  const permValidation = validatePermissions(config.grantedPermissions, manifest.permissions)
  if (!permValidation.valid) {
    return {
      success: false,
      error: `Cannot grant permissions not declared in manifest. Extra permissions: [${permValidation.missing.join(', ')}]`,
    }
  }

  // 4. Validate settings against the manifest's settings schema
  if (manifest.settingsSchema && config.settings) {
    const settingsResult = validateSettings(manifest.settingsSchema, config.settings)
    if (!settingsResult.valid) {
      return {
        success: false,
        error: `Settings validation failed: ${settingsResult.errors.map(e => e.message).join('; ')}`,
      }
    }
  }

  // 5. Check if already installed for this organization
  const supabase = await createClient()
  const { data: existingInstall } = await supabase
    .from('plugin_installations')
    .select('id, lifecycle_state')
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)
    .single()

  if (existingInstall && existingInstall.lifecycle_state !== 'uninstalled') {
    return {
      success: false,
      error: `Plugin "${pluginId}" is already installed for this organization (state: ${existingInstall.lifecycle_state})`,
    }
  }

  // 6. Resolve sandbox limits
  const sandboxLimits: PluginSandboxLimits = {
    ...DEFAULT_SANDBOX_LIMITS[manifest.type],
    ...config.sandboxOverrides,
  }

  // 7. Create the installation record
  const installationId = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error: insertError } = await supabase
    .from('plugin_installations')
    .insert({
      id: installationId,
      plugin_id: pluginId,
      organization_id: orgId,
      installed_by: userId,
      installed_at: now,
      version: manifest.version,
      previous_version: null,
      status: 'installed',
      lifecycle_state: 'installed',
      settings: config.settings ?? {},
      granted_permissions: config.grantedPermissions,
      sandbox_limits: sandboxLimits,
      last_error: null,
      updated_at: now,
    })

  if (insertError) {
    return { success: false, error: `Failed to create installation: ${insertError.message}` }
  }

  // 8. Execute onInstall lifecycle hook
  const hookResult = await executeLifecycleHook(installationId, 'onInstall', {
    installationId,
    manifest,
    settings: config.settings ?? {},
    grantedPermissions: config.grantedPermissions,
  })

  if (!hookResult.success) {
    // Roll back: mark as error
    await transitionState(installationId, 'error', 'error', hookResult.error)
    return {
      success: false,
      error: `Installation hook failed: ${hookResult.error}`,
    }
  }

  // 9. Apply any settings migration returned by the hook
  if (hookResult.migratedSettings) {
    await supabase
      .from('plugin_installations')
      .update({ settings: hookResult.migratedSettings })
      .eq('id', installationId)
  }

  // Return the installation record
  const installation: PluginInstallation = {
    id: installationId,
    pluginId,
    organizationId: orgId,
    installedBy: userId,
    installedAt: now,
    version: manifest.version,
    status: 'installed',
    lifecycleState: 'installed',
    settings: hookResult.migratedSettings ?? config.settings ?? {},
    grantedPermissions: config.grantedPermissions,
    updatedAt: now,
  }

  return { success: true, installation }
}

// ──────────────────────────────────────────────────────────────
// Enable Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Enable an installed plugin.
 *
 * Transitions the lifecycle state from installed/disabled to enabled,
 * executing the onEnable hook in the sandbox.
 *
 * @param installationId - The installation to enable
 * @returns Success status
 */
export async function enablePlugin(installationId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  // Transition to enabling state
  const transitionResult = await transitionState(installationId, 'enabling', 'enabled')
  if (!transitionResult.success) {
    return transitionResult
  }

  // Get the plugin manifest
  const manifest = await getPlugin(installation.plugin_id as string)
  if (!manifest) {
    await transitionState(installationId, 'error', 'error', 'Plugin manifest not found')
    return { success: false, error: 'Plugin manifest not found' }
  }

  // Execute onEnable hook
  const hookResult = await executeLifecycleHook(installationId, 'onEnable', {
    installationId,
    manifest,
    settings: installation.settings as Record<string, unknown>,
    grantedPermissions: installation.granted_permissions as PluginPermission[],
  })

  if (!hookResult.success) {
    await transitionState(installationId, 'error', 'error', `onEnable hook failed: ${hookResult.error}`)
    return { success: false, error: `onEnable hook failed: ${hookResult.error}` }
  }

  // Transition to enabled state
  await transitionState(installationId, 'enabled', 'enabled')

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Disable Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Disable an enabled plugin.
 *
 * Transitions the lifecycle state from enabled to disabled, executing
 * the onDisable hook in the sandbox for cleanup.
 *
 * @param installationId - The installation to disable
 * @returns Success status
 */
export async function disablePlugin(installationId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  // Transition to disabling state
  const transitionResult = await transitionState(installationId, 'disabling', 'disabled')
  if (!transitionResult.success) {
    return transitionResult
  }

  // Get the plugin manifest
  const manifest = await getPlugin(installation.plugin_id as string)
  if (!manifest) {
    // Even without a manifest, we can still disable
    await transitionState(installationId, 'disabled', 'disabled')
    return { success: true }
  }

  // Execute onDisable hook (best-effort, don't block disable on hook failure)
  const hookResult = await executeLifecycleHook(installationId, 'onDisable', {
    installationId,
    manifest,
    settings: installation.settings as Record<string, unknown>,
    grantedPermissions: installation.granted_permissions as PluginPermission[],
  })

  if (!hookResult.success) {
    // Log the error but still complete the disable transition
    await supabase
      .from('plugin_installations')
      .update({ last_error: `onDisable hook warning: ${hookResult.error}` })
      .eq('id', installationId)
  }

  // Transition to disabled state
  await transitionState(installationId, 'disabled', 'disabled')

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Uninstall Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Uninstall a plugin, removing the installation and all associated data.
 *
 * Executes the onUninstall hook for cleanup, then removes the installation
 * record and plugin-scoped storage.
 *
 * @param installationId - The installation to remove
 * @returns Success status
 */
export async function uninstallPlugin(installationId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  const currentState = installation.lifecycle_state as PluginLifecycleState

  // If currently enabled, disable first
  if (currentState === 'enabled') {
    const disableResult = await disablePlugin(installationId)
    if (!disableResult.success) {
      return { success: false, error: `Failed to disable before uninstall: ${disableResult.error}` }
    }
  }

  // Transition to uninstalling state
  const transitionResult = await transitionState(installationId, 'uninstalling', 'disabled')
  if (!transitionResult.success) {
    // If we can't transition (e.g., from 'installed'), try direct
    if (currentState !== 'installed' && currentState !== 'disabled') {
      return transitionResult
    }
  }

  // Get the plugin manifest
  const manifest = await getPlugin(installation.plugin_id as string)

  // Execute onUninstall hook (best-effort)
  if (manifest) {
    await executeLifecycleHook(installationId, 'onUninstall', {
      installationId,
      manifest,
      settings: installation.settings as Record<string, unknown>,
      grantedPermissions: installation.granted_permissions as PluginPermission[],
    })
  }

  // Clean up plugin-scoped storage
  await supabase
    .from('plugin_storage')
    .delete()
    .eq('plugin_id', installation.plugin_id as string)
    .eq('organization_id', installation.organization_id as string)

  // Delete the installation record
  await supabase
    .from('plugin_installations')
    .delete()
    .eq('id', installationId)

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Update Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Update a plugin installation to a new version.
 *
 * Validates the target version exists, checks compatibility, and
 * executes the onUpdate hook with migration support.
 *
 * @param installationId - The installation to update
 * @param targetVersion - The version to update to
 * @returns Success status
 */
export async function updatePlugin(installationId: string, targetVersion: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  const pluginId = installation.plugin_id as string
  const currentVersion = installation.version as string

  if (currentVersion === targetVersion) {
    return { success: false, error: `Already on version ${targetVersion}` }
  }

  // Get available versions
  const versions = await getPluginVersions(pluginId)
  const targetVersionInfo = versions.find(v => v.version === targetVersion)

  if (!targetVersionInfo) {
    return { success: false, error: `Version "${targetVersion}" not found for plugin "${pluginId}"` }
  }

  if (targetVersionInfo.deprecated) {
    return { success: false, error: `Version "${targetVersion}" is deprecated and cannot be installed` }
  }

  if (targetVersionInfo.compatibility === 'incompatible') {
    return { success: false, error: `Version "${targetVersion}" is incompatible with this platform` }
  }

  // Check compatibility
  if (!checkCompatibility(targetVersionInfo.minPlatformVersion, targetVersionInfo.maxPlatformVersion, PLATFORM_VERSION)) {
    return {
      success: false,
      error: `Version "${targetVersion}" requires platform ${targetVersionInfo.minPlatformVersion}${targetVersionInfo.maxPlatformVersion ? `-${targetVersionInfo.maxPlatformVersion}` : '+'}`,
    }
  }

  // Save previous version for rollback
  const previousVersion = currentVersion

  // Get the updated manifest
  const manifest = await getPlugin(pluginId)
  if (!manifest) {
    return { success: false, error: 'Plugin manifest not found' }
  }

  // Validate current permissions still satisfy the new version's requirements
  const grantedPermissions = installation.granted_permissions as PluginPermission[]
  const permValidation = validatePermissions(manifest.permissions, grantedPermissions)
  if (!permValidation.valid) {
    return {
      success: false,
      error: `New version requires additional permissions: [${permValidation.missing.join(', ')}]. Please grant these permissions before updating.`,
    }
  }

  // Execute onUpdate hook
  const hookResult = await executeLifecycleHook(installationId, 'onUpdate', {
    installationId,
    manifest,
    settings: installation.settings as Record<string, unknown>,
    grantedPermissions,
    previousVersion,
    targetVersion,
  })

  if (!hookResult.success) {
    return { success: false, error: `Update hook failed: ${hookResult.error}` }
  }

  // Update the installation record
  const updateData: Record<string, unknown> = {
    version: targetVersion,
    previous_version: previousVersion,
    updated_at: new Date().toISOString(),
  }

  if (hookResult.migratedSettings) {
    updateData.settings = hookResult.migratedSettings
  }

  await supabase
    .from('plugin_installations')
    .update(updateData)
    .eq('id', installationId)

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Rollback Plugin
// ──────────────────────────────────────────────────────────────

/**
 * Rollback a plugin installation to the previous version.
 *
 * Only possible if a previous version was recorded during the last update.
 *
 * @param installationId - The installation to rollback
 * @returns Success status
 */
export async function rollbackPlugin(installationId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  const previousVersion = installation.previous_version as string | null
  if (!previousVersion) {
    return { success: false, error: 'No previous version available for rollback' }
  }

  // Perform the rollback by updating to the previous version
  const result = await updatePlugin(installationId, previousVersion)
  if (!result.success) {
    return { success: false, error: `Rollback failed: ${result.error}` }
  }

  // Clear the previous_version field since we've rolled back
  await supabase
    .from('plugin_installations')
    .update({ previous_version: null })
    .eq('id', installationId)

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Installation Status
// ──────────────────────────────────────────────────────────────

/**
 * Get the current status of a plugin installation.
 *
 * @param installationId - The installation ID
 * @returns The installation record or null
 */
export async function getInstallationStatus(installationId: string): Promise<PluginInstallation | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('id', installationId)
    .single()

  if (!data) return null

  return mapRowToInstallation(data)
}

/**
 * Get all installations for an organization.
 *
 * @param orgId - The organization ID
 * @returns Array of plugin installations
 */
export async function getOrganizationInstallations(orgId: string): Promise<PluginInstallation[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_installations')
    .select('*')
    .eq('organization_id', orgId)
    .order('installed_at', { ascending: false })

  if (!data) return []

  return data.map((row: Record<string, unknown>) => mapRowToInstallation(row))
}

/**
 * Map a Supabase row to a PluginInstallation object.
 */
function mapRowToInstallation(row: Record<string, unknown>): PluginInstallation {
  return {
    id: row.id as string,
    pluginId: row.plugin_id as string,
    organizationId: row.organization_id as string,
    installedBy: row.installed_by as string,
    installedAt: row.installed_at as string,
    version: row.version as string,
    previousVersion: (row.previous_version as string) || undefined,
    status: row.status as PluginInstallationStatus,
    lifecycleState: row.lifecycle_state as PluginLifecycleState,
    settings: (row.settings as Record<string, unknown>) ?? {},
    grantedPermissions: (row.granted_permissions as PluginPermission[]) ?? [],
    lastError: (row.last_error as string) || undefined,
    updatedAt: row.updated_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// Permission Validation Helper
// ──────────────────────────────────────────────────────────────

/**
 * Validate that an API call is permitted for a given installation.
 *
 * Checks the installation's granted permissions against the required
 * permission for the API call. Returns the result and logs the access
 * attempt for auditing.
 *
 * @param installationId - The installation making the request
 * @param requiredPermission - The permission required for this API call
 * @returns Whether the call is permitted
 */
export async function validateAPIPermission(
  installationId: string,
  requiredPermission: PluginPermission
): Promise<{ permitted: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('granted_permissions, status, lifecycle_state')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { permitted: false, error: 'Installation not found' }
  }

  // Plugin must be in enabled state
  if (installation.lifecycle_state !== 'enabled') {
    return { permitted: false, error: `Plugin is not enabled (state: ${installation.lifecycle_state})` }
  }

  const granted = installation.granted_permissions as PluginPermission[]
  const result = validatePermissions([requiredPermission], granted)

  if (!result.valid) {
    return {
      permitted: false,
      error: `Permission denied. Required: ${requiredPermission}. Missing: [${result.missing.join(', ')}]`,
    }
  }

  // Audit log the access
  await supabase.from('plugin_audit_logs').insert({
    id: crypto.randomUUID(),
    installation_id: installationId,
    action: `api_call:${requiredPermission}`,
    timestamp: new Date().toISOString(),
    permitted: true,
    result: 'success',
  })

  return { permitted: true }
}
