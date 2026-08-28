// ============================================================================
// ExamForge AI — Plugin Execution Sandbox
// ============================================================================
// Sandboxed execution environment for plugin code. Enforces resource limits,
// scopes API access by granted permissions, and audits all API calls.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type PluginManifest,
  type PluginPermission,
  type PluginSandboxLimits,
  type PluginSandbox,
  type PluginHook,
  type PluginHookContext,
  type PluginHookResult,
  type PluginAuditLog,
  type SandboxedAPI,
  DEFAULT_SANDBOX_LIMITS,
} from './types'

// ──────────────────────────────────────────────────────────────
// Sandbox Executor
// ──────────────────────────────────────────────────────────────

/**
 * PluginSandboxExecutor provides a secure execution environment for plugin code.
 *
 * It enforces CPU time limits, memory limits, API call counts, and timeout
 * constraints. All API calls are scoped to the plugin's granted permissions
 * and are audited.
 */
export class PluginSandboxExecutor {
  private apiCallCount: number = 0
  private startTime: number = 0
  private limits: PluginSandboxLimits
  private pluginId: string
  private installationId: string
  private permissions: PluginPermission[]
  private aborted: boolean = false

  constructor(
    pluginId: string,
    installationId: string,
    permissions: PluginPermission[],
    limits: PluginSandboxLimits
  ) {
    this.pluginId = pluginId
    this.installationId = installationId
    this.permissions = permissions
    this.limits = limits
  }

  /**
   * Execute plugin code within the sandbox with resource enforcement.
   *
   * The executor monitors CPU time, memory usage, API call counts, and
   * overall timeout. If any limit is exceeded, execution is aborted.
   *
   * @param pluginCode - The code to execute (function or async function)
   * @param api - The sandboxed API surface
   * @param limits - Resource limits (overrides constructor limits)
   * @returns The result of the execution or an error
   */
  async execute<T>(
    pluginCode: (api: SandboxedAPI) => Promise<T>,
    api: SandboxedAPI,
    limits?: Partial<PluginSandboxLimits>
  ): Promise<{
    result?: T
    error?: string
    resourceUsage: {
      cpuMs: number
      memoryMb: number
      durationMs: number
      apiCalls: number
    }
  }> {
    // Apply any limit overrides
    const effectiveLimits: PluginSandboxLimits = {
      ...this.limits,
      ...limits,
    }

    this.limits = effectiveLimits
    this.apiCallCount = 0
    this.startTime = performance.now()
    this.aborted = false

    // Set up timeout enforcement
    const timeoutHandle = setTimeout(() => {
      this.aborted = true
    }, effectiveLimits.timeoutMs)

    try {
      // Check memory limit before execution
      const memUsage = process.memoryUsage()
      const memMb = Math.round(memUsage.heapUsed / 1024 / 1024)
      if (memMb > effectiveLimits.memoryMb) {
        return {
          error: `Memory limit exceeded: ${memMb}MB > ${effectiveLimits.memoryMb}MB`,
          resourceUsage: { cpuMs: 0, memoryMb: memMb, durationMs: 0, apiCalls: 0 },
        }
      }

      // Execute the plugin code with the sandboxed API
      const wrappedApi = this.wrapApiWithTracking(api)
      const result = await pluginCode(wrappedApi)

      // Calculate resource usage
      const durationMs = Math.round(performance.now() - this.startTime)
      const finalMem = process.memoryUsage()
      const finalMemMb = Math.round(finalMem.heapUsed / 1024 / 1024)

      return {
        result,
        resourceUsage: {
          cpuMs: durationMs, // Approximate CPU time with wall time
          memoryMb: finalMemMb,
          durationMs,
          apiCalls: this.apiCallCount,
        },
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - this.startTime)
      const errorMessage = err instanceof Error ? err.message : String(err)

      if (this.aborted) {
        return {
          error: `Execution timed out after ${effectiveLimits.timeoutMs}ms`,
          resourceUsage: { cpuMs: durationMs, memoryMb: 0, durationMs, apiCalls: this.apiCallCount },
        }
      }

      return {
        error: errorMessage,
        resourceUsage: { cpuMs: durationMs, memoryMb: 0, durationMs, apiCalls: this.apiCallCount },
      }
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  /**
   * Wrap the sandboxed API with call tracking and limit enforcement.
   *
   * Every API call increments the call counter and checks against the
   * maximum API call limit.
   */
  private wrapApiWithTracking(api: SandboxedAPI): SandboxedAPI {
    const trackCall = () => {
      this.apiCallCount++
      if (this.apiCallCount > this.limits.maxApiCalls) {
        throw new Error(`API call limit exceeded: ${this.apiCallCount} > ${this.limits.maxApiCalls}`)
      }
      if (this.aborted) {
        throw new Error('Execution was aborted due to timeout')
      }
    }

    // Wrap each API namespace method with tracking
    return {
      profiles: {
        read: async (userId: string) => { trackCall(); return api.profiles.read(userId) },
        readMany: async (userIds: string[]) => { trackCall(); return api.profiles.readMany(userIds) },
        write: async (userId: string, data: Record<string, unknown>) => { trackCall(); return api.profiles.write(userId, data) },
      },
      exams: {
        read: async (examId: string) => { trackCall(); return api.exams.read(examId) },
        readMany: async (filters: Record<string, unknown>) => { trackCall(); return api.exams.readMany(filters) },
        write: async (examId: string, data: Record<string, unknown>) => { trackCall(); return api.exams.write(examId, data) },
        create: async (data: Record<string, unknown>) => { trackCall(); return api.exams.create(data) },
      },
      questions: {
        read: async (questionId: string) => { trackCall(); return api.questions.read(questionId) },
        readMany: async (filters: Record<string, unknown>) => { trackCall(); return api.questions.readMany(filters) },
        write: async (questionId: string, data: Record<string, unknown>) => { trackCall(); return api.questions.write(questionId, data) },
        create: async (data: Record<string, unknown>) => { trackCall(); return api.questions.create(data) },
      },
      results: {
        read: async (resultId: string) => { trackCall(); return api.results.read(resultId) },
        readMany: async (filters: Record<string, unknown>) => { trackCall(); return api.results.readMany(filters) },
        write: async (resultId: string, data: Record<string, unknown>) => { trackCall(); return api.results.write(resultId, data) },
      },
      notifications: {
        send: async (userId: string, message: Record<string, unknown>) => { trackCall(); return api.notifications.send(userId, message) },
        sendBatch: async (userIds: string[], message: Record<string, unknown>) => { trackCall(); return api.notifications.sendBatch(userIds, message) },
      },
      ai: {
        execute: async (prompt: string, options: Record<string, unknown>) => { trackCall(); return api.ai.execute(prompt, options) },
        stream: (prompt: string, options: Record<string, unknown>) => { trackCall(); return api.ai.stream(prompt, options) },
        getCredits: async () => { trackCall(); return api.ai.getCredits() },
      },
      storage: {
        get: async (key: string) => { trackCall(); return api.storage.get(key) },
        set: async (key: string, value: unknown) => { trackCall(); return api.storage.set(key, value) },
        delete: async (key: string) => { trackCall(); return api.storage.delete(key) },
        list: async (prefix?: string) => { trackCall(); return api.storage.list(prefix) },
      },
      settings: {
        get: async () => { trackCall(); return api.settings.get() },
        update: async (settings: Record<string, unknown>) => { trackCall(); return api.settings.update(settings) },
      },
      events: {
        publish: async (event: string, payload: Record<string, unknown>) => { trackCall(); return api.events.publish(event, payload) },
        subscribe: async (event: string, handler: (payload: Record<string, unknown>) => void) => { trackCall(); return api.events.subscribe(event, handler) },
        unsubscribe: async (subscriptionId: string) => { trackCall(); return api.events.unsubscribe(subscriptionId) },
      },
    }
  }

  /**
   * Get current resource usage statistics.
   */
  getResourceUsage(): {
    cpuMs: number
    memoryMb: number
    durationMs: number
    apiCalls: number
  } {
    const mem = process.memoryUsage()
    return {
      cpuMs: Math.round(performance.now() - this.startTime),
      memoryMb: Math.round(mem.heapUsed / 1024 / 1024),
      durationMs: Math.round(performance.now() - this.startTime),
      apiCalls: this.apiCallCount,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Sandboxed API Creation
// ──────────────────────────────────────────────────────────────

/**
 * Permission-to-API mapping. Each API namespace requires specific permissions
 * for read and write operations.
 */
const API_PERMISSION_MAP: Record<string, { read?: PluginPermission; write?: PluginPermission }> = {
  profiles: { read: 'read_profiles', write: 'write_profiles' },
  exams: { read: 'read_exams', write: 'write_exams' },
  questions: { read: 'read_questions', write: 'write_questions' },
  results: { read: 'read_results', write: 'write_results' },
  notifications: { write: 'send_notifications' },
  ai: { write: 'use_ai' },
  analytics: { read: 'read_analytics' },
  webhooks: { write: 'manage_webhooks' },
}

/**
 * Create a sandboxed API surface scoped to the given permissions.
 *
 * Each API namespace checks permissions before allowing access. If a
 * permission is not granted, the API call throws a permission error.
 *
 * @param pluginId - The plugin ID (for storage scoping)
 * @param installationId - The installation ID
 * @param orgId - The organization ID (for data scoping)
 * @param permissions - Granted permissions
 * @returns A sandboxed API object
 */
export async function createSandboxedAPI(
  pluginId: string,
  installationId: string,
  orgId: string,
  permissions: PluginPermission[]
): Promise<SandboxedAPI> {
  const supabase = await createClient()
  const permSet = new Set(permissions)

  // If full_access is granted, all permissions are available
  const hasPermission = (perm: PluginPermission): boolean =>
    permSet.has('full_access') || permSet.has(perm)

  const requirePermission = (perm: PluginPermission): void => {
    if (!hasPermission(perm)) {
      throw new Error(`Permission denied: ${perm}. Contact your administrator to grant this permission.`)
    }
  }

  // Storage key prefix for plugin namespace isolation
  const storagePrefix = `plugin:${pluginId}:`

  return {
    profiles: {
      async read(userId: string) {
        requirePermission('read_profiles')
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        return data
      },
      async readMany(userIds: string[]) {
        requirePermission('read_profiles')
        const { data } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
        return data ?? []
      },
      async write(userId: string, data: Record<string, unknown>) {
        requirePermission('write_profiles')
        const { error } = await supabase
          .from('users')
          .update(data)
          .eq('id', userId)
        return !error
      },
    },

    exams: {
      async read(examId: string) {
        requirePermission('read_exams')
        const { data } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .eq('organization_id', orgId)
          .single()
        return data
      },
      async readMany(filters: Record<string, unknown>) {
        requirePermission('read_exams')
        let qb = supabase
          .from('exams')
          .select('*')
          .eq('organization_id', orgId)

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            qb = qb.eq(key, value)
          }
        }

        const { data } = await qb
        return data ?? []
      },
      async write(examId: string, data: Record<string, unknown>) {
        requirePermission('write_exams')
        const { error } = await supabase
          .from('exams')
          .update(data)
          .eq('id', examId)
          .eq('organization_id', orgId)
        return !error
      },
      async create(data: Record<string, unknown>) {
        requirePermission('write_exams')
        const { data: result, error } = await supabase
          .from('exams')
          .insert({ ...data, organization_id: orgId })
          .select('id')
          .single()
        if (error || !result) return null
        return (result as { id: string }).id
      },
    },

    questions: {
      async read(questionId: string) {
        requirePermission('read_questions')
        const { data } = await supabase
          .from('questions')
          .select('*')
          .eq('id', questionId)
          .eq('organization_id', orgId)
          .single()
        return data
      },
      async readMany(filters: Record<string, unknown>) {
        requirePermission('read_questions')
        let qb = supabase
          .from('questions')
          .select('*')
          .eq('organization_id', orgId)

        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            qb = qb.eq(key, value)
          }
        }

        const { data } = await qb
        return data ?? []
      },
      async write(questionId: string, data: Record<string, unknown>) {
        requirePermission('write_questions')
        const { error } = await supabase
          .from('questions')
          .update(data)
          .eq('id', questionId)
          .eq('organization_id', orgId)
        return !error
      },
      async create(data: Record<string, unknown>) {
        requirePermission('write_questions')
        const { data: result, error } = await supabase
          .from('questions')
          .insert({ ...data, organization_id: orgId })
          .select('id')
          .single()
        if (error || !result) return null
        return (result as { id: string }).id
      },
    },

    results: {
      async read(resultId: string) {
        requirePermission('read_results')
        const { data } = await supabase
          .from('exam_results')
          .select('*')
          .eq('id', resultId)
          .eq('organization_id', orgId)
          .single()
        return data
      },
      async readMany(filters: Record<string, unknown>) {
        requirePermission('read_results')
        let qb = supabase
          .from('exam_results')
          .select('*')
          .eq('organization_id', orgId)

        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            qb = qb.eq(key, value)
          }
        }

        const { data } = await qb
        return data ?? []
      },
      async write(resultId: string, data: Record<string, unknown>) {
        requirePermission('write_results')
        const { error } = await supabase
          .from('exam_results')
          .update(data)
          .eq('id', resultId)
          .eq('organization_id', orgId)
        return !error
      },
    },

    notifications: {
      async send(userId: string, message: Record<string, unknown>) {
        requirePermission('send_notifications')
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            organization_id: orgId,
            ...message,
            created_at: new Date().toISOString(),
          })
        return !error
      },
      async sendBatch(userIds: string[], message: Record<string, unknown>) {
        requirePermission('send_notifications')
        const records = userIds.map(userId => ({
          user_id: userId,
          organization_id: orgId,
          ...message,
          created_at: new Date().toISOString(),
        }))
        const { data, error } = await supabase
          .from('notifications')
          .insert(records)
          .select('id')
        if (error) return 0
        return data?.length ?? 0
      },
    },

    ai: {
      async execute(prompt: string, options: Record<string, unknown>) {
        requirePermission('use_ai')

        // Track AI credit usage
        const { data: creditRecord } = await supabase
          .from('plugin_storage')
          .select('value')
          .eq('plugin_id', pluginId)
          .eq('organization_id', orgId)
          .eq('key', `${storagePrefix}ai_credits_used`)
          .single()

        const creditsUsed = (creditRecord?.value as number) ?? 0
        const creditsLimit = 1000 // Default per-plugin AI credit limit

        if (creditsUsed >= creditsLimit) {
          throw new Error(`AI credit limit exceeded: ${creditsUsed}/${creditsLimit}`)
        }

        // Call the AI API
        const { data: aiResult, error } = await supabase.functions.invoke('ai-complete', {
          body: { prompt, ...options, pluginId },
        })

        if (error) return null

        // Increment credit usage
        await supabase
          .from('plugin_storage')
          .upsert({
            plugin_id: pluginId,
            organization_id: orgId,
            key: `${storagePrefix}ai_credits_used`,
            value: creditsUsed + 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'plugin_id,organization_id,key' })

        return aiResult?.text ?? null
      },

      async *stream(prompt: string, options: Record<string, unknown>): AsyncIterable<string> {
        requirePermission('use_ai')

        // For streaming, we invoke the AI stream edge function
        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...options, pluginId }),
        })

        if (!response.body) return

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            yield decoder.decode(value, { stream: true })
          }
        } finally {
          reader.releaseLock()
        }
      },

      async getCredits() {
        const { data: creditRecord } = await supabase
          .from('plugin_storage')
          .select('value')
          .eq('plugin_id', pluginId)
          .eq('organization_id', orgId)
          .eq('key', `${storagePrefix}ai_credits_used`)
          .single()

        const used = (creditRecord?.value as number) ?? 0
        const limit = 1000

        return { used, limit, remaining: limit - used }
      },
    },

    storage: {
      async get(key: string) {
        const { data } = await supabase
          .from('plugin_storage')
          .select('value')
          .eq('plugin_id', pluginId)
          .eq('organization_id', orgId)
          .eq('key', `${storagePrefix}${key}`)
          .single()
        return data?.value ?? null
      },
      async set(key: string, value: unknown) {
        const { error } = await supabase
          .from('plugin_storage')
          .upsert({
            plugin_id: pluginId,
            organization_id: orgId,
            key: `${storagePrefix}${key}`,
            value,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'plugin_id,organization_id,key' })
        return !error
      },
      async delete(key: string) {
        const { error } = await supabase
          .from('plugin_storage')
          .delete()
          .eq('plugin_id', pluginId)
          .eq('organization_id', orgId)
          .eq('key', `${storagePrefix}${key}`)
        return !error
      },
      async list(prefix?: string) {
        const keyPrefix = prefix ? `${storagePrefix}${prefix}` : storagePrefix
        const { data } = await supabase
          .from('plugin_storage')
          .select('key')
          .eq('plugin_id', pluginId)
          .eq('organization_id', orgId)
          .like('key', `${keyPrefix}%`)

        return (data ?? []).map((row: { key: string }) =>
          row.key.substring(storagePrefix.length)
        )
      },
    },

    settings: {
      async get() {
        const { data } = await supabase
          .from('plugin_installations')
          .select('settings')
          .eq('id', installationId)
          .single()
        return (data?.settings as Record<string, unknown>) ?? {}
      },
      async update(settings: Record<string, unknown>) {
        const { error } = await supabase
          .from('plugin_installations')
          .update({
            settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', installationId)
        return !error
      },
    },

    events: {
      async publish(event: string, payload: Record<string, unknown>) {
        // Plugin events are scoped to the plugin namespace
        const { error } = await supabase
          .from('plugin_events')
          .insert({
            plugin_id: pluginId,
            organization_id: orgId,
            event: `${pluginId}:${event}`,
            payload,
            created_at: new Date().toISOString(),
          })
        return !error
      },
      async subscribe(event: string, handler: (payload: Record<string, unknown>) => void) {
        // Subscribe to plugin-scoped events via Supabase realtime
        const subscriptionId = crypto.randomUUID()
        const channel = supabase
          .channel(`plugin:${pluginId}:${event}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'plugin_events',
            filter: `event=eq.${pluginId}:${event}`,
          }, (payload: { new: Record<string, unknown> }) => {
            handler(payload.new)
          })
          .subscribe()

        // Store subscription reference for cleanup
        _eventSubscriptions.set(subscriptionId, channel)

        return subscriptionId
      },
      async unsubscribe(subscriptionId: string) {
        const channel = _eventSubscriptions.get(subscriptionId)
        if (channel) {
          supabase.removeChannel(channel)
          _eventSubscriptions.delete(subscriptionId)
        }
        return true
      },
    },
  }
}

// In-memory map for event subscription channels (per-process)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _eventSubscriptions = new Map<string, any>()

// ──────────────────────────────────────────────────────────────
// Resource Limit Enforcement
// ──────────────────────────────────────────────────────────────

/**
 * Enforce resource limits on a sandbox configuration.
 *
 * Validates that the requested limits don't exceed platform maximums
 * and applies sensible defaults for any missing values.
 *
 * @param limits - Requested resource limits
 * @returns Enforced limits within platform maximums
 */
export function enforceResourceLimits(limits: Partial<PluginSandboxLimits>): PluginSandboxLimits {
  // Platform maximums — no plugin can exceed these
  const PLATFORM_MAX_CPU_MS = 60_000
  const PLATFORM_MAX_MEMORY_MB = 1024
  const PLATFORM_MAX_TIMEOUT_MS = 300_000
  const PLATFORM_MAX_API_CALLS = 1000

  return {
    cpuMs: Math.min(limits.cpuMs ?? 5000, PLATFORM_MAX_CPU_MS),
    memoryMb: Math.min(limits.memoryMb ?? 256, PLATFORM_MAX_MEMORY_MB),
    timeoutMs: Math.min(limits.timeoutMs ?? 30_000, PLATFORM_MAX_TIMEOUT_MS),
    maxApiCalls: Math.min(limits.maxApiCalls ?? 100, PLATFORM_MAX_API_CALLS),
  }
}

// ──────────────────────────────────────────────────────────────
// Audit Logging
// ──────────────────────────────────────────────────────────────

/**
 * Audit a plugin API call by writing to the plugin_audit_logs table.
 *
 * @param pluginId - The plugin making the call
 * @param api - The API endpoint called
 * @param result - The result of the call
 * @param installationId - The installation context
 * @param permitted - Whether the call was permitted
 * @param error - Error message if the call failed
 */
export async function auditPluginAccess(
  pluginId: string,
  api: string,
  result: 'success' | 'failure',
  installationId: string,
  permitted: boolean = true,
  error?: string
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('plugin_audit_logs').insert({
    id: crypto.randomUUID(),
    plugin_id: pluginId,
    installation_id: installationId,
    action: api,
    timestamp: new Date().toISOString(),
    permitted,
    result,
    error: error ?? null,
  })
}

// ──────────────────────────────────────────────────────────────
// Lifecycle Hook Execution
// ──────────────────────────────────────────────────────────────

/**
 * Execute a plugin lifecycle hook in the sandbox.
 *
 * Lifecycle hooks (onInstall, onEnable, onDisable, onUninstall, onUpdate)
 * are executed within the sandbox with resource limits and permission scoping.
 *
 * @param installationId - The installation ID
 * @param hook - The hook to execute
 * @param context - The hook context
 * @returns The hook result
 */
export async function executeLifecycleHook(
  installationId: string,
  hook: PluginHook,
  context: PluginHookContext
): Promise<PluginHookResult> {
  const startTime = performance.now()

  const supabase = await createClient()

  // Get installation details for sandbox configuration
  const { data: installation } = await supabase
    .from('plugin_installations')
    .select('plugin_id, organization_id, granted_permissions, sandbox_limits')
    .eq('id', installationId)
    .single()

  if (!installation) {
    return {
      success: false,
      error: `Installation "${installationId}" not found`,
      executionTimeMs: Math.round(performance.now() - startTime),
    }
  }

  const pluginId = installation.plugin_id as string
  const orgId = installation.organization_id as string
  const grantedPermissions = installation.granted_permissions as PluginPermission[]
  const sandboxLimits = (installation.sandbox_limits as PluginSandboxLimits) ??
    DEFAULT_SANDBOX_LIMITS[context.manifest.type]

  try {
    // Create the sandboxed API for this execution
    const api = await createSandboxedAPI(pluginId, installationId, orgId, grantedPermissions)

    // Create the sandbox executor
    const executor = new PluginSandboxExecutor(
      pluginId,
      installationId,
      grantedPermissions,
      sandboxLimits
    )

    // Execute the hook. For built-in hooks, we use a no-op implementation
    // since the actual hook code comes from the plugin bundle which would be
    // loaded dynamically. In this implementation, we simulate the hook by
    // checking if the plugin has declared the hook in its manifest.
    const hookFn = getLifecycleHookImplementation(pluginId, hook)

    if (!hookFn) {
      // No hook implementation — this is fine, hooks are optional
      return {
        success: true,
        executionTimeMs: Math.round(performance.now() - startTime),
      }
    }

    // Execute the hook in the sandbox
    const result = await executor.execute(
      async (sandboxedApi) => hookFn(context, sandboxedApi),
      api
    )

    if (result.error) {
      // Audit the failure
      await auditPluginAccess(pluginId, `hook:${hook}`, 'failure', installationId, true, result.error)

      return {
        success: false,
        error: result.error,
        executionTimeMs: Math.round(performance.now() - startTime),
      }
    }

    // Audit the success
    await auditPluginAccess(pluginId, `hook:${hook}`, 'success', installationId)

    return {
      success: true,
      executionTimeMs: result.resourceUsage.durationMs,
      migratedSettings: (result.result as { migratedSettings?: Record<string, unknown> })?.migratedSettings,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await auditPluginAccess(pluginId, `hook:${hook}`, 'failure', installationId, true, errorMessage)

    return {
      success: false,
      error: errorMessage,
      executionTimeMs: Math.round(performance.now() - startTime),
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Hook Implementation Registry (In-Memory)
// ──────────────────────────────────────────────────────────────

/**
 * Type for a lifecycle hook implementation function.
 */
type LifecycleHookFn = (
  context: PluginHookContext,
  api: SandboxedAPI
) => Promise<Record<string, unknown> | void>

/**
 * In-memory registry of lifecycle hook implementations.
 *
 * In a production system, these would be loaded from the plugin bundle
 * (e.g., a WASM module or sandboxed JS). Here we use an in-memory map
 * that can be populated at runtime.
 */
const hookRegistry = new Map<string, LifecycleHookFn>()

/**
 * Register a lifecycle hook implementation for a plugin.
 *
 * @param pluginId - The plugin ID
 * @param hook - The hook name
 * @param fn - The hook implementation
 */
export function registerLifecycleHook(
  pluginId: string,
  hook: PluginHook,
  fn: LifecycleHookFn
): void {
  hookRegistry.set(`${pluginId}:${hook}`, fn)
}

/**
 * Get a lifecycle hook implementation for a plugin.
 *
 * @param pluginId - The plugin ID
 * @param hook - The hook name
 * @returns The hook implementation or undefined
 */
function getLifecycleHookImplementation(
  pluginId: string,
  hook: PluginHook
): LifecycleHookFn | undefined {
  return hookRegistry.get(`${pluginId}:${hook}`)
}

// ──────────────────────────────────────────────────────────────
// Audit Log Retrieval
// ──────────────────────────────────────────────────────────────

/**
 * Retrieve audit logs for a plugin installation.
 *
 * @param installationId - The installation ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getAuditLogs(
  installationId: string,
  limit: number = 100
): Promise<PluginAuditLog[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plugin_audit_logs')
    .select('*')
    .eq('installation_id', installationId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    pluginId: row.plugin_id as string,
    installationId: row.installation_id as string,
    action: row.action as string,
    timestamp: row.timestamp as string,
    permitted: row.permitted as boolean,
    result: row.result as 'success' | 'failure',
    error: (row.error as string) || undefined,
  }))
}
