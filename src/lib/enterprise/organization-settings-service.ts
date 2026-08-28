// ============================================================================
// ExamForge AI — Enterprise Organization Settings Service
// ============================================================================
// Manages organization settings with inheritance support.
// Child organizations inherit settings from parent if not overridden.
// Handles feature flags, AI configuration, and academic year config.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { success, failure, type Result } from '@/lib/api/result'
import type {
  OrganizationSettings,
  OrganizationAIConfig,
  AcademicYearFormat,
  AIFeature,
} from './types'
import { DEFAULT_ORGANIZATION_SETTINGS } from './types'

// ──────────────────────────────────────────────────────────────
// getOrganizationSettings
// ──────────────────────────────────────────────────────────────

/**
 * Gets the effective settings for an organization with inheritance.
 * Walks up the organization tree (using materialized path) and
 * merges settings, with the closest (child) override taking precedence.
 */
export async function getOrganizationSettings(
  orgId: string
): Promise<Result<OrganizationSettings>> {
  try {
    const supabase = await createClient()

    // Get the organization with its path and settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, settings, path')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const orgSettings = org.settings as Partial<OrganizationSettings> | null

    // If the org has complete settings, merge with defaults and return
    if (orgSettings && isCompleteSettings(orgSettings)) {
      return success(mergeSettings(DEFAULT_ORGANIZATION_SETTINGS, orgSettings))
    }

    // Otherwise, walk up the path to inherit from ancestors
    const pathIds = org.path.split('/').filter(Boolean)
    // Remove the current org (we already have its partial settings)
    const ancestorIds = pathIds.filter((id: string) => id !== orgId)

    // Fetch settings from all ancestors (closest parent first)
    const inheritedSettings: Partial<OrganizationSettings> = {}

    if (ancestorIds.length > 0) {
      const { data: ancestors, error: ancestorError } = await supabase
        .from('organizations')
        .select('id, settings, level')
        .in('id', ancestorIds)
        .order('level', { ascending: false }) // Closest parent first

      if (ancestorError) {
        return failure(new Error(`Failed to fetch ancestor settings: ${ancestorError.message}`))
      }

      // Merge from root to closest parent (each closer ancestor overrides further)
      const sortedAncestors = (ancestors ?? []).sort(
        (a: { level: number }, b: { level: number }) => a.level - b.level
      )

      for (const ancestor of sortedAncestors) {
        const ancestorSettings = ancestor.settings as Partial<OrganizationSettings> | null
        if (ancestorSettings) {
          Object.assign(inheritedSettings, ancestorSettings)
        }
      }
    }

    // Merge: defaults → inherited → org-specific
    const merged = mergeSettings(
      DEFAULT_ORGANIZATION_SETTINGS,
      mergeSettings(inheritedSettings as OrganizationSettings, orgSettings ?? ({} as OrganizationSettings))
    )

    return success(merged)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization settings')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// updateOrganizationSettings
// ──────────────────────────────────────────────────────────────

/**
 * Updates the settings for an organization.
 * Only provided fields are updated; others remain unchanged
 * (allowing them to continue inheriting from parent).
 */
export async function updateOrganizationSettings(
  orgId: string,
  settings: Partial<OrganizationSettings>
): Promise<Result<OrganizationSettings>> {
  try {
    const supabase = await createClient()

    // Get current settings to merge with updates
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const currentSettings = (org.settings as Partial<OrganizationSettings> | null) ?? {}
    const mergedSettings = { ...currentSettings, ...settings }

    // Deep merge nested objects
    if (settings.academicYearFormat) {
      mergedSettings.academicYearFormat = {
        ...(currentSettings.academicYearFormat ?? {}),
        ...settings.academicYearFormat,
      }
    }

    if (settings.gradingScale) {
      mergedSettings.gradingScale = {
        ...(currentSettings.gradingScale ?? {}),
        ...settings.gradingScale,
      }
    }

    if (settings.attendancePolicy) {
      mergedSettings.attendancePolicy = {
        ...(currentSettings.attendancePolicy ?? {}),
        ...settings.attendancePolicy,
      }
    }

    if (settings.aiConfig) {
      mergedSettings.aiConfig = {
        ...(currentSettings.aiConfig ?? {}),
        ...settings.aiConfig,
      } as OrganizationAIConfig
    }

    if (settings.featureFlags) {
      mergedSettings.featureFlags = {
        ...(currentSettings.featureFlags ?? {}),
        ...settings.featureFlags,
      }
    }

    // Update the organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: mergedSettings })
      .eq('id', orgId)

    if (updateError) {
      return failure(new Error(`Failed to update settings: ${updateError.message}`))
    }

    // Return the effective settings (with inheritance applied)
    return getOrganizationSettings(orgId)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error updating organization settings')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getFeatureFlags
// ──────────────────────────────────────────────────────────────

/**
 * Gets the effective feature flags for an organization with inheritance.
 * Feature flags are merged from root → parent → child, with
 * child flags taking precedence.
 */
export async function getFeatureFlags(
  orgId: string
): Promise<Result<Record<string, boolean>>> {
  try {
    const settingsResult = await getOrganizationSettings(orgId)
    if (!settingsResult.ok) {
      return failure(settingsResult.error)
    }

    return success(settingsResult.value.featureFlags)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching feature flags')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// updateFeatureFlag
// ──────────────────────────────────────────────────────────────

/**
 * Updates a single feature flag for an organization.
 */
export async function updateFeatureFlag(
  orgId: string,
  flag: string,
  enabled: boolean
): Promise<Result<Record<string, boolean>>> {
  try {
    const supabase = await createClient()

    // Get current settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const currentSettings = (org.settings as Partial<OrganizationSettings> | null) ?? {}
    const currentFlags = currentSettings.featureFlags ?? {}

    // Update the specific flag
    const updatedFlags = { ...currentFlags, [flag]: enabled }
    const updatedSettings = { ...currentSettings, featureFlags: updatedFlags }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', orgId)

    if (updateError) {
      return failure(new Error(`Failed to update feature flag: ${updateError.message}`))
    }

    // Return all effective feature flags
    return getFeatureFlags(orgId)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error updating feature flag')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getAIConfig
// ──────────────────────────────────────────────────────────────

/**
 * Gets the AI configuration for an organization with inheritance.
 * Allows org-level overrides of AI model, provider, and limits.
 */
export async function getAIConfig(
  orgId: string
): Promise<Result<OrganizationAIConfig>> {
  try {
    const settingsResult = await getOrganizationSettings(orgId)
    if (!settingsResult.ok) {
      return failure(settingsResult.error)
    }

    return success(settingsResult.value.aiConfig)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching AI configuration')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getAcademicYearConfig
// ──────────────────────────────────────────────────────────────

/**
 * Gets the academic year format and configuration for an organization.
 * Falls back to parent/default if not explicitly set.
 */
export async function getAcademicYearConfig(
  orgId: string
): Promise<Result<AcademicYearFormat>> {
  try {
    const settingsResult = await getOrganizationSettings(orgId)
    if (!settingsResult.ok) {
      return failure(settingsResult.error)
    }

    return success(settingsResult.value.academicYearFormat)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching academic year config')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Merges base settings with override settings.
 * Override values take precedence over base values.
 */
function mergeSettings(
  base: OrganizationSettings | Partial<OrganizationSettings>,
  override: OrganizationSettings | Partial<OrganizationSettings>
): OrganizationSettings {
  return {
    timezone: override.timezone ?? base.timezone ?? DEFAULT_ORGANIZATION_SETTINGS.timezone,
    locale: override.locale ?? base.locale ?? DEFAULT_ORGANIZATION_SETTINGS.locale,
    currency: override.currency ?? base.currency ?? DEFAULT_ORGANIZATION_SETTINGS.currency,
    academicYearFormat: {
      ...(base.academicYearFormat ?? DEFAULT_ORGANIZATION_SETTINGS.academicYearFormat),
      ...(override.academicYearFormat ?? {}),
    },
    gradingScale: {
      ...(base.gradingScale ?? DEFAULT_ORGANIZATION_SETTINGS.gradingScale),
      ...(override.gradingScale ?? {}),
      boundaries: override.gradingScale?.boundaries
        ?? base.gradingScale?.boundaries
        ?? DEFAULT_ORGANIZATION_SETTINGS.gradingScale.boundaries,
    },
    attendancePolicy: {
      ...(base.attendancePolicy ?? DEFAULT_ORGANIZATION_SETTINGS.attendancePolicy),
      ...(override.attendancePolicy ?? {}),
    },
    aiConfig: {
      ...(base.aiConfig ?? DEFAULT_ORGANIZATION_SETTINGS.aiConfig),
      ...(override.aiConfig ?? {}),
    } as OrganizationAIConfig,
    featureFlags: {
      ...(base.featureFlags ?? {}),
      ...(override.featureFlags ?? {}),
    },
    customFields: override.customFields
      ?? base.customFields
      ?? DEFAULT_ORGANIZATION_SETTINGS.customFields,
  }
}

/**
 * Checks if a settings object is "complete" (has all required top-level keys).
 * Used to determine whether inheritance is needed.
 */
function isCompleteSettings(settings: Partial<OrganizationSettings>): boolean {
  return (
    settings.timezone !== undefined &&
    settings.locale !== undefined &&
    settings.currency !== undefined &&
    settings.academicYearFormat !== undefined &&
    settings.gradingScale !== undefined &&
    settings.attendancePolicy !== undefined &&
    settings.aiConfig !== undefined &&
    settings.featureFlags !== undefined &&
    settings.customFields !== undefined
  )
}
