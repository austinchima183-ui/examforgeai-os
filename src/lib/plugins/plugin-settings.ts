// ============================================================================
// ExamForge AI — Plugin Settings & Configuration
// ============================================================================
// Plugin configuration management with JSON Schema validation, plugin-scoped
// storage, and settings lifecycle. All data persisted in Supabase.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type PluginPermission,
  type SettingsValidationResult,
  type SettingsValidationError,
} from './types'

// ──────────────────────────────────────────────────────────────
// JSON Schema Validation
// ──────────────────────────────────────────────────────────────

/**
 * Primitive type mapping for JSON Schema types.
 */
const JSON_SCHEMA_TYPES: Record<string, string[]> = {
  string: ['string'],
  number: ['number'],
  integer: ['number'],
  boolean: ['boolean'],
  object: ['object'],
  array: ['array'],
  null: ['object'],
}

/**
 * Validate a settings object against a JSON Schema.
 *
 * Implements a subset of JSON Schema Draft 7 validation sufficient for
 * plugin configuration schemas. Supports:
 * - type checking (string, number, integer, boolean, object, array)
 * - required fields
 * - enum values
 * - minimum/maximum for numbers
 * - minLength/maxLength for strings
 * - minItems/maxItems for arrays
 * - pattern for strings
 * - properties and additionalProperties for objects
 * - nested validation
 *
 * @param schema - The JSON Schema to validate against
 * @param settings - The settings object to validate
 * @returns Validation result with any errors
 */
export function validateSettings(
  schema: Record<string, unknown>,
  settings: unknown
): SettingsValidationResult {
  const errors: SettingsValidationError[] = []

  validateNode(schema, settings, '', errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Recursively validate a node against a schema.
 */
function validateNode(
  schema: Record<string, unknown>,
  value: unknown,
  path: string,
  errors: SettingsValidationError[]
): void {
  // Type validation
  if (schema.type) {
    const expectedType = schema.type as string
    const validTypes = JSON_SCHEMA_TYPES[expectedType]

    if (validTypes) {
      // Special case for integer
      if (expectedType === 'integer') {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push({
            path,
            message: `Expected integer, got ${typeof value}`,
            keyword: 'type',
            expected: 'integer',
            actual: typeof value,
          })
          return
        }
      } else if (!validTypes.includes(typeof value)) {
        errors.push({
          path,
          message: `Expected type ${expectedType}, got ${typeof value}`,
          keyword: 'type',
          expected: expectedType,
          actual: typeof value,
        })
        return
      }
    }
  }

  // Enum validation
  if (schema.enum) {
    const enumValues = schema.enum as unknown[]
    if (!enumValues.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${enumValues.map(v => JSON.stringify(v)).join(', ')}`,
        keyword: 'enum',
        expected: enumValues,
        actual: value,
      })
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < (schema.minLength as number)) {
      errors.push({
        path,
        message: `String must be at least ${schema.minLength} characters`,
        keyword: 'minLength',
        expected: schema.minLength,
        actual: value.length,
      })
    }

    if (schema.maxLength !== undefined && value.length > (schema.maxLength as number)) {
      errors.push({
        path,
        message: `String must be at most ${schema.maxLength} characters`,
        keyword: 'maxLength',
        expected: schema.maxLength,
        actual: value.length,
      })
    }

    if (schema.pattern !== undefined) {
      const regex = new RegExp(schema.pattern as string)
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `String must match pattern: ${schema.pattern}`,
          keyword: 'pattern',
          expected: schema.pattern,
          actual: value,
        })
      }
    }

    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({
        path,
        message: 'String must be a valid email address',
        keyword: 'format',
        expected: 'email',
        actual: value,
      })
    }

    if (schema.format === 'uri') {
      try {
        new URL(value)
      } catch {
        errors.push({
          path,
          message: 'String must be a valid URI',
          keyword: 'format',
          expected: 'uri',
          actual: value,
        })
      }
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) {
      errors.push({
        path,
        message: `Number must be at least ${schema.minimum}`,
        keyword: 'minimum',
        expected: schema.minimum,
        actual: value,
      })
    }

    if (schema.maximum !== undefined && value > (schema.maximum as number)) {
      errors.push({
        path,
        message: `Number must be at most ${schema.maximum}`,
        keyword: 'maximum',
        expected: schema.maximum,
        actual: value,
      })
    }

    if (schema.exclusiveMinimum !== undefined && value <= (schema.exclusiveMinimum as number)) {
      errors.push({
        path,
        message: `Number must be greater than ${schema.exclusiveMinimum}`,
        keyword: 'exclusiveMinimum',
        expected: schema.exclusiveMinimum,
        actual: value,
      })
    }

    if (schema.exclusiveMaximum !== undefined && value >= (schema.exclusiveMaximum as number)) {
      errors.push({
        path,
        message: `Number must be less than ${schema.exclusiveMaximum}`,
        keyword: 'exclusiveMaximum',
        expected: schema.exclusiveMaximum,
        actual: value,
      })
    }

    if (schema.multipleOf !== undefined && value % (schema.multipleOf as number) !== 0) {
      errors.push({
        path,
        message: `Number must be a multiple of ${schema.multipleOf}`,
        keyword: 'multipleOf',
        expected: schema.multipleOf,
        actual: value,
      })
    }
  }

  // Object validations
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>

    // Required fields
    if (schema.required) {
      const required = schema.required as string[]
      for (const field of required) {
        if (obj[field] === undefined) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: `Required field "${field}" is missing`,
            keyword: 'required',
            expected: field,
          })
        }
      }
    }

    // Property validation
    if (schema.properties) {
      const properties = schema.properties as Record<string, Record<string, unknown>>
      for (const [propName, propSchema] of Object.entries(properties)) {
        if (obj[propName] !== undefined) {
          validateNode(
            propSchema,
            obj[propName],
            path ? `${path}.${propName}` : propName,
            errors
          )
        }
      }
    }

    // Additional properties
    if (schema.additionalProperties === false && schema.properties) {
      const allowedProps = new Set(Object.keys(schema.properties as Record<string, unknown>))
      for (const key of Object.keys(obj)) {
        if (!allowedProps.has(key)) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: `Additional property "${key}" is not allowed`,
            keyword: 'additionalProperties',
            actual: key,
          })
        }
      }
    }
  }

  // Array validations
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < (schema.minItems as number)) {
      errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items`,
        keyword: 'minItems',
        expected: schema.minItems,
        actual: value.length,
      })
    }

    if (schema.maxItems !== undefined && value.length > (schema.maxItems as number)) {
      errors.push({
        path,
        message: `Array must have at most ${schema.maxItems} items`,
        keyword: 'maxItems',
        expected: schema.maxItems,
        actual: value.length,
      })
    }

    // Items validation
    if (schema.items && typeof schema.items === 'object') {
      const itemSchema = schema.items as Record<string, unknown>
      for (let i = 0; i < value.length; i++) {
        validateNode(itemSchema, value[i], `${path}[${i}]`, errors)
      }
    }

    // Unique items
    if (schema.uniqueItems === true) {
      const seen = new Set<string>()
      for (const item of value) {
        const key = JSON.stringify(item)
        if (seen.has(key)) {
          errors.push({
            path,
            message: 'Array items must be unique',
            keyword: 'uniqueItems',
            actual: item,
          })
          break
        }
        seen.add(key)
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Plugin Settings Management
// ──────────────────────────────────────────────────────────────

/**
 * Get the current settings for a plugin installation.
 *
 * @param installationId - The installation ID
 * @returns The current settings object
 */
export async function getPluginSettings(installationId: string): Promise<Record<string, unknown>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_installations')
    .select('settings')
    .eq('id', installationId)
    .single()

  if (!data) return {}

  return (data.settings as Record<string, unknown>) ?? {}
}

/**
 * Update settings for a plugin installation.
 *
 * Validates the new settings against the plugin's settingsSchema before
 * persisting. If validation fails, the update is rejected.
 *
 * @param installationId - The installation ID
 * @param settings - The new settings object (merged with existing)
 * @returns Success status with validation errors if any
 */
export async function updatePluginSettings(
  installationId: string,
  settings: Record<string, unknown>
): Promise<{
  success: boolean
  errors?: SettingsValidationError[]
  error?: string
}> {
  const supabase = await createClient()

  // Get the installation with plugin ID for schema lookup
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('plugin_id, settings')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return { success: false, error: `Installation "${installationId}" not found` }
  }

  // Get the plugin manifest for the settings schema
  const { data: plugin } = await supabase
    .from('plugin_registry')
    .select('settings_schema')
    .eq('id', installation.plugin_id)
    .single()

  // Validate against settings schema if one exists
  if (plugin?.settings_schema) {
    // Merge with existing settings for full validation context
    const existingSettings = (installation.settings as Record<string, unknown>) ?? {}
    const mergedSettings = { ...existingSettings, ...settings }

    const validation = validateSettings(
      plugin.settings_schema as Record<string, unknown>,
      mergedSettings
    )

    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
  }

  // Persist the updated settings
  const existingSettings = (installation.settings as Record<string, unknown>) ?? {}
  const mergedSettings = { ...existingSettings, ...settings }

  const { error: updateError } = await supabase
    .from('plugin_installations')
    .update({
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', installationId)

  if (updateError) {
    return { success: false, error: `Failed to update settings: ${updateError.message}` }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Plugin-Scoped Storage
// ──────────────────────────────────────────────────────────────

/**
 * Get a value from plugin-scoped storage.
 *
 * Plugin storage is namespaced by plugin ID and organization ID,
 * ensuring complete isolation between plugins.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param key - The storage key
 * @returns The stored value or null
 */
export async function getPluginStorage(
  pluginId: string,
  orgId: string,
  key: string
): Promise<unknown> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_storage')
    .select('value')
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)
    .eq('key', key)
    .single()

  if (!data) return null

  return data.value
}

/**
 * Set a value in plugin-scoped storage.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param key - The storage key
 * @param value - The value to store (must be JSON-serializable)
 * @returns Success status
 */
export async function setPluginStorage(
  pluginId: string,
  orgId: string,
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Validate that the value is JSON-serializable
  try {
    JSON.stringify(value)
  } catch (err) {
    return {
      success: false,
      error: `Value is not JSON-serializable: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // Enforce key length limit
  if (key.length > 512) {
    return {
      success: false,
      error: 'Storage key must be 512 characters or less',
    }
  }

  // Enforce value size limit (1MB)
  const serialized = JSON.stringify(value)
  if (serialized.length > 1_048_576) {
    return {
      success: false,
      error: 'Storage value must be 1MB or less',
    }
  }

  const { error } = await supabase
    .from('plugin_storage')
    .upsert({
      plugin_id: pluginId,
      organization_id: orgId,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plugin_id,organization_id,key' })

  if (error) {
    return { success: false, error: `Failed to set storage: ${error.message}` }
  }

  return { success: true }
}

/**
 * Delete a value from plugin-scoped storage.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param key - The storage key to delete
 * @returns Success status
 */
export async function deletePluginStorage(
  pluginId: string,
  orgId: string,
  key: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('plugin_storage')
    .delete()
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)
    .eq('key', key)

  if (error) {
    return { success: false, error: `Failed to delete storage: ${error.message}` }
  }

  return { success: true }
}

/**
 * List all storage keys for a plugin in an organization.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param prefix - Optional key prefix filter
 * @returns Array of matching storage keys with their values
 */
export async function listPluginStorage(
  pluginId: string,
  orgId: string,
  prefix?: string
): Promise<Array<{ key: string; value: unknown }>> {
  const supabase = await createClient()

  let qb = supabase
    .from('plugin_storage')
    .select('key, value')
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)

  if (prefix) {
    qb = qb.like('key', `${prefix}%`)
  }

  const { data } = await qb

  if (!data) return []

  return data.map((row: { key: string; value: unknown }) => ({
    key: row.key,
    value: row.value,
  }))
}

// ──────────────────────────────────────────────────────────────
// Bulk Storage Operations
// ──────────────────────────────────────────────────────────────

/**
 * Get multiple values from plugin-scoped storage in a single call.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param keys - Array of storage keys to retrieve
 * @returns Map of key → value (missing keys are omitted)
 */
export async function getPluginStorageBulk(
  pluginId: string,
  orgId: string,
  keys: string[]
): Promise<Record<string, unknown>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_storage')
    .select('key, value')
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)
    .in('key', keys)

  if (!data) return {}

  const result: Record<string, unknown> = {}
  for (const row of data as Array<{ key: string; value: unknown }>) {
    result[row.key] = row.value
  }

  return result
}

/**
 * Delete multiple keys from plugin-scoped storage.
 *
 * @param pluginId - The plugin ID
 * @param orgId - The organization ID
 * @param keys - Array of storage keys to delete
 * @returns Number of keys deleted
 */
export async function deletePluginStorageBulk(
  pluginId: string,
  orgId: string,
  keys: string[]
): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plugin_storage')
    .delete()
    .eq('plugin_id', pluginId)
    .eq('organization_id', orgId)
    .in('key', keys)
    .select('key')

  if (error || !data) return 0

  return data.length
}

// ──────────────────────────────────────────────────────────────
// Settings Schema Utilities
// ──────────────────────────────────────────────────────────────

/**
 * Generate default settings from a JSON Schema.
 *
 * Walks the schema and produces a settings object with default values
 * for each property. Useful for initializing new plugin installations.
 *
 * @param schema - The JSON Schema
 * @returns Default settings object
 */
export function generateDefaultSettings(schema: Record<string, unknown>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}

  if (schema.properties && typeof schema.properties === 'object') {
    const properties = schema.properties as Record<string, Record<string, unknown>>

    for (const [propName, propSchema] of Object.entries(properties)) {
      // Use explicit default if provided
      if (propSchema.default !== undefined) {
        defaults[propName] = propSchema.default
        continue
      }

      // Generate defaults based on type
      switch (propSchema.type) {
        case 'string':
          defaults[propName] = ''
          break
        case 'number':
        case 'integer':
          defaults[propName] = propSchema.minimum ?? 0
          break
        case 'boolean':
          defaults[propName] = false
          break
        case 'array':
          defaults[propName] = []
          break
        case 'object':
          if (propSchema.properties) {
            defaults[propName] = generateDefaultSettings(propSchema)
          } else {
            defaults[propName] = {}
          }
          break
      }
    }
  }

  return defaults
}

/**
 * Merge user-provided settings with schema defaults.
 *
 * Only includes fields defined in the schema. Extra fields are dropped
 * unless additionalProperties is true.
 *
 * @param schema - The JSON Schema
 * @param userSettings - User-provided settings
 * @returns Merged settings
 */
export function mergeWithDefaults(
  schema: Record<string, unknown>,
  userSettings: Record<string, unknown>
): Record<string, unknown> {
  const defaults = generateDefaultSettings(schema)

  if (schema.additionalProperties === true) {
    return { ...defaults, ...userSettings }
  }

  // Only include properties defined in the schema
  const properties = (schema.properties as Record<string, unknown>) ?? {}
  const allowedKeys = new Set(Object.keys(properties))

  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(userSettings)) {
    if (allowedKeys.has(key)) {
      filtered[key] = value
    }
  }

  return { ...defaults, ...filtered }
}
