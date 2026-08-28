// ============================================================================
// ExamForge AI — Workflow Automation Engine — Service Layer (CRUD + Management)
// ============================================================================
// Production-ready CRUD operations and lifecycle management for workflows.
// All data persisted in Supabase with tenant-scoping (organization/school).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowConnection,
  WorkflowExecution,
  WorkflowStepExecution,
  WorkflowStats,
  WorkflowStatus,
  WorkflowVariable,
  WorkflowErrorHandling,
  WorkflowExecutionFilters,
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning,
  WorkflowTemplate,
  PaginatedResult,
} from './types'
import { DEFAULT_ERROR_HANDLING } from './types'
import { WORKFLOW_TEMPLATES } from './workflow-templates'

// ──────────────────────────────────────────────────────────────
// Create Workflow
// ──────────────────────────────────────────────────────────────

export interface CreateWorkflowInput {
  name: string
  description: string
  organizationId: string
  schoolId?: string | null
  trigger: WorkflowStep
  actions: WorkflowStep[]
  connections: WorkflowConnection[]
  variables?: WorkflowVariable[]
  errorHandling?: WorkflowErrorHandling
  tags?: string[]
  category?: string
  createdBy: string
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDefinition> {
  const supabase = await createClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const workflow: WorkflowDefinition = {
    id,
    name: input.name,
    description: input.description,
    organizationId: input.organizationId,
    schoolId: input.schoolId ?? null,
    trigger: input.trigger,
    actions: input.actions,
    connections: input.connections,
    variables: input.variables ?? [],
    errorHandling: input.errorHandling ?? DEFAULT_ERROR_HANDLING,
    status: 'draft',
    version: 1,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: input.tags ?? [],
    category: input.category,
  }

  const { error } = await supabase.from('workflow_definitions').insert({
    id,
    name: workflow.name,
    description: workflow.description,
    organization_id: workflow.organizationId,
    school_id: workflow.schoolId,
    trigger: workflow.trigger,
    actions: workflow.actions,
    connections: workflow.connections,
    variables: workflow.variables,
    error_handling: workflow.errorHandling,
    status: 'draft',
    version: 1,
    created_by: workflow.createdBy,
    created_at: now,
    updated_at: now,
    tags: workflow.tags,
    category: workflow.category ?? null,
  })

  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`)
  }

  return workflow
}

// ──────────────────────────────────────────────────────────────
// Get Workflow
// ──────────────────────────────────────────────────────────────

export async function getWorkflow(id: string): Promise<WorkflowDefinition | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  return deserializeWorkflow(data)
}

// ──────────────────────────────────────────────────────────────
// Update Workflow
// ──────────────────────────────────────────────────────────────

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  trigger?: WorkflowStep
  actions?: WorkflowStep[]
  connections?: WorkflowConnection[]
  variables?: WorkflowVariable[]
  errorHandling?: WorkflowErrorHandling
  tags?: string[]
  category?: string
  status?: WorkflowStatus
}

export async function updateWorkflow(
  id: string,
  input: UpdateWorkflowInput
): Promise<WorkflowDefinition> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = { updated_at: now }

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.trigger !== undefined) updates.trigger = input.trigger
  if (input.actions !== undefined) updates.actions = input.actions
  if (input.connections !== undefined) updates.connections = input.connections
  if (input.variables !== undefined) updates.variables = input.variables
  if (input.errorHandling !== undefined) updates.error_handling = input.errorHandling
  if (input.tags !== undefined) updates.tags = input.tags
  if (input.category !== undefined) updates.category = input.category
  if (input.status !== undefined) updates.status = input.status

  // Increment version on content changes
  if (input.trigger !== undefined || input.actions !== undefined || input.connections !== undefined) {
    const { data: current } = await supabase
      .from('workflow_definitions')
      .select('version')
      .eq('id', id)
      .single()
    updates.version = ((current?.version as number) ?? 1) + 1
  }

  const { data, error } = await supabase
    .from('workflow_definitions')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to update workflow: ${error?.message ?? 'Not found'}`)
  }

  return deserializeWorkflow(data)
}

// ──────────────────────────────────────────────────────────────
// Delete Workflow (Soft Delete)
// ──────────────────────────────────────────────────────────────

export async function deleteWorkflow(id: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('workflow_definitions')
    .update({ deleted_at: now, status: 'archived', updated_at: now })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`Failed to delete workflow: ${error.message}`)
  }
}

// ──────────────────────────────────────────────────────────────
// Duplicate Workflow
// ──────────────────────────────────────────────────────────────

export async function duplicateWorkflow(id: string): Promise<WorkflowDefinition> {
  const original = await getWorkflow(id)
  if (!original) {
    throw new Error(`Workflow not found: ${id}`)
  }

  // Deep clone with new IDs
  const newId = crypto.randomUUID()
  const idMapping = new Map<string, string>()

  // Map old step IDs to new step IDs
  idMapping.set(original.trigger.id, crypto.randomUUID())
  for (const action of original.actions) {
    idMapping.set(action.id, crypto.randomUUID())
  }

  const newTrigger: WorkflowStep = {
    ...original.trigger,
    id: idMapping.get(original.trigger.id)!,
  }

  const newActions: WorkflowStep[] = original.actions.map((action) => ({
    ...action,
    id: idMapping.get(action.id)!,
  }))

  const newConnections: WorkflowConnection[] = original.connections.map((conn) => ({
    ...conn,
    id: crypto.randomUUID(),
    sourceStepId: idMapping.get(conn.sourceStepId) ?? conn.sourceStepId,
    targetStepId: idMapping.get(conn.targetStepId) ?? conn.targetStepId,
  }))

  return createWorkflow({
    name: `${original.name} (Copy)`,
    description: original.description,
    organizationId: original.organizationId,
    schoolId: original.schoolId,
    trigger: newTrigger,
    actions: newActions,
    connections: newConnections,
    variables: original.variables,
    errorHandling: original.errorHandling,
    tags: original.tags,
    category: original.category,
    createdBy: original.createdBy,
  })
}

// ──────────────────────────────────────────────────────────────
// Publish Workflow (Validate + Activate)
// ──────────────────────────────────────────────────────────────

export async function publishWorkflow(id: string): Promise<{ workflow: WorkflowDefinition; validation: WorkflowValidationResult }> {
  const workflow = await getWorkflow(id)
  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }

  const validation = validateWorkflow(workflow)
  if (!validation.valid) {
    return { workflow, validation }
  }

  const updated = await updateWorkflow(id, { status: 'active' })
  return { workflow: updated, validation }
}

// ──────────────────────────────────────────────────────────────
// Pause Workflow
// ──────────────────────────────────────────────────────────────

export async function pauseWorkflow(id: string): Promise<WorkflowDefinition> {
  const workflow = await getWorkflow(id)
  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }
  if (workflow.status !== 'active') {
    throw new Error(`Cannot pause workflow in status: ${workflow.status}`)
  }
  return updateWorkflow(id, { status: 'paused' })
}

// ──────────────────────────────────────────────────────────────
// Resume Workflow
// ──────────────────────────────────────────────────────────────

export async function resumeWorkflow(id: string): Promise<WorkflowDefinition> {
  const workflow = await getWorkflow(id)
  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }
  if (workflow.status !== 'paused') {
    throw new Error(`Cannot resume workflow in status: ${workflow.status}`)
  }
  return updateWorkflow(id, { status: 'active' })
}

// ──────────────────────────────────────────────────────────────
// Get Workflow Executions
// ──────────────────────────────────────────────────────────────

export async function getWorkflowExecutions(
  workflowId: string,
  filters?: WorkflowExecutionFilters
): Promise<PaginatedResult<WorkflowExecution>> {
  const supabase = await createClient()

  let query = supabase
    .from('workflow_executions')
    .select('*', { count: 'exact' })
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.startDate) query = query.gte('started_at', filters.startDate)
  if (filters?.endDate) query = query.lte('started_at', filters.endDate)
  if (filters?.limit) query = query.limit(filters.limit)
  if (filters?.offset) {
    const limit = filters.limit ?? 50
    query = query.range(filters.offset, filters.offset + limit - 1)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0, hasMore: false }
  }

  const executions: WorkflowExecution[] = (data ?? []).map(deserializeExecution)
  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0
  const total = count ?? 0

  return {
    data: executions,
    total,
    hasMore: offset + limit < total,
  }
}

// ──────────────────────────────────────────────────────────────
// Get Workflow Execution Detail
// ──────────────────────────────────────────────────────────────

export async function getWorkflowExecution(executionId: string): Promise<WorkflowExecution | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', executionId)
    .single()

  if (error || !data) return null

  return deserializeExecution(data)
}

// ──────────────────────────────────────────────────────────────
// Get Workflow Stats
// ──────────────────────────────────────────────────────────────

export async function getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
  const supabase = await createClient()

  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('status, duration_ms, steps, started_at')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(1000)

  const all = executions ?? []
  const totalExecutions = all.length
  const successfulExecutions = all.filter((e) => e.status === 'completed').length
  const failedExecutions = all.filter((e) => e.status === 'failed').length
  const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0

  const durations = all
    .filter((e) => e.duration_ms != null)
    .map((e) => e.duration_ms as number)
  const avgDurationMs = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0
  const maxDurationMs = durations.length > 0 ? Math.max(...durations) : 0
  const minDurationMs = durations.length > 0 ? Math.min(...durations) : 0

  const lastExecuted = all.length > 0 ? all[0].started_at as string : null
  const lastStatus = all.length > 0 ? (all[0].status as WorkflowStepExecution['status']) : null

  // Step-level stats
  const stepStats: WorkflowStats['stepStats'] = {}
  for (const exec of all) {
    const steps = (exec.steps as WorkflowStepExecution[]) ?? []
    for (const step of steps) {
      if (!stepStats[step.stepId]) {
        stepStats[step.stepId] = { executions: 0, failures: 0, avgDurationMs: 0 }
      }
      stepStats[step.stepId].executions++
      if (step.status === 'failed') stepStats[step.stepId].failures++
      stepStats[step.stepId].avgDurationMs =
        (stepStats[step.stepId].avgDurationMs * (stepStats[step.stepId].executions - 1) + step.durationMs) /
        stepStats[step.stepId].executions
    }
  }

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    avgDurationMs,
    maxDurationMs,
    minDurationMs,
    lastExecutedAt: lastExecuted,
    lastStatus: lastStatus as WorkflowStats['lastStatus'],
    stepStats,
  }
}

// ──────────────────────────────────────────────────────────────
// Get Organization Workflows
// ──────────────────────────────────────────────────────────────

export async function getOrganizationWorkflows(
  orgId: string,
  options?: { schoolId?: string; status?: WorkflowStatus; limit?: number; offset?: number }
): Promise<PaginatedResult<WorkflowDefinition>> {
  const supabase = await createClient()

  let query = supabase
    .from('workflow_definitions')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (options?.schoolId) query = query.eq('school_id', options.schoolId)
  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) {
    const limit = options.limit ?? 50
    query = query.range(options.offset, options.offset + limit - 1)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0, hasMore: false }
  }

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const total = count ?? 0

  return {
    data: (data ?? []).map(deserializeWorkflow),
    total,
    hasMore: offset + limit < total,
  }
}

// ──────────────────────────────────────────────────────────────
// Import Workflow from Template
// ──────────────────────────────────────────────────────────────

export async function importWorkflowTemplate(
  templateId: string,
  input: {
    organizationId: string
    schoolId?: string | null
    createdBy: string
    overrides?: Partial<CreateWorkflowInput>
  }
): Promise<WorkflowDefinition> {
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Generate new IDs for all steps and connections
  const idMapping = new Map<string, string>()
  idMapping.set(template.trigger.id, crypto.randomUUID())
  for (const action of template.actions) {
    idMapping.set(action.id, crypto.randomUUID())
  }

  const trigger: WorkflowStep = {
    ...template.trigger,
    id: idMapping.get(template.trigger.id)!,
    config: { ...template.trigger.config, ...(input.overrides?.trigger?.config ?? {}) },
  }

  const actions: WorkflowStep[] = template.actions.map((action) => ({
    ...action,
    id: idMapping.get(action.id)!,
    config: { ...action.config, ...(input.overrides?.actions?.find((a) => a.actionType === action.actionType)?.config ?? {}) },
  }))

  const connections: WorkflowConnection[] = template.connections.map((conn) => ({
    ...conn,
    id: crypto.randomUUID(),
    sourceStepId: idMapping.get(conn.sourceStepId) ?? conn.sourceStepId,
    targetStepId: idMapping.get(conn.targetStepId) ?? conn.targetStepId,
  }))

  return createWorkflow({
    name: input.overrides?.name ?? template.name,
    description: input.overrides?.description ?? template.description,
    organizationId: input.organizationId,
    schoolId: input.schoolId,
    trigger,
    actions,
    connections,
    variables: [...template.variables, ...(input.overrides?.variables ?? [])],
    errorHandling: input.overrides?.errorHandling ?? DEFAULT_ERROR_HANDLING,
    tags: [...(template.tags ?? []), ...(input.overrides?.tags ?? [])],
    category: template.category,
    createdBy: input.createdBy,
  })
}

// ──────────────────────────────────────────────────────────────
// Export Workflow as JSON
// ──────────────────────────────────────────────────────────────

export async function exportWorkflow(id: string): Promise<string> {
  const workflow = await getWorkflow(id)
  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }

  // Export without tenant-specific IDs and metadata
  const exportData = {
    name: workflow.name,
    description: workflow.description,
    trigger: workflow.trigger,
    actions: workflow.actions,
    connections: workflow.connections,
    variables: workflow.variables,
    errorHandling: workflow.errorHandling,
    tags: workflow.tags,
    category: workflow.category,
    version: workflow.version,
    exportedAt: new Date().toISOString(),
    exportedFrom: 'ExamForge AI Workflow Engine',
  }

  return JSON.stringify(exportData, null, 2)
}

// ──────────────────────────────────────────────────────────────
// Validate Workflow Definition
// ──────────────────────────────────────────────────────────────

export function validateWorkflow(workflow: WorkflowDefinition): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = []
  const warnings: WorkflowValidationWarning[] = []

  // ── Basic validation ──
  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push({ code: 'name_required', message: 'Workflow name is required' })
  }

  if (!workflow.organizationId) {
    errors.push({ code: 'org_required', message: 'Organization ID is required' })
  }

  // ── Trigger validation ──
  if (!workflow.trigger) {
    errors.push({ code: 'trigger_required', message: 'Workflow must have a trigger step' })
  } else {
    if (workflow.trigger.type !== 'trigger') {
      errors.push({ stepId: workflow.trigger.id, code: 'trigger_type', message: 'Trigger step must have type "trigger"' })
    }
    if (!workflow.trigger.actionType) {
      errors.push({ stepId: workflow.trigger.id, code: 'trigger_action_type', message: 'Trigger must have an action type' })
    }
  }

  // ── Actions validation ──
  const stepIds = new Set<string>()
  stepIds.add(workflow.trigger.id)

  for (const action of workflow.actions) {
    // Check for duplicate IDs
    if (stepIds.has(action.id)) {
      errors.push({ stepId: action.id, code: 'duplicate_step_id', message: `Duplicate step ID: ${action.id}` })
    }
    stepIds.add(action.id)

    // Check action type
    if (action.type !== 'action') {
      errors.push({ stepId: action.id, code: 'action_type', message: `Action step "${action.name}" must have type "action"` })
    }

    // Check required config for specific action types
    if (action.actionType === 'http_request' && !action.config.url) {
      warnings.push({ stepId: action.id, code: 'missing_config', message: `HTTP request step "${action.name}" should have a URL configured` })
    }

    if (action.actionType === 'delay' && !action.config.delayMs) {
      warnings.push({ stepId: action.id, code: 'missing_config', message: `Delay step "${action.name}" should have delayMs configured` })
    }

    if (action.actionType === 'send_email' && !action.config.recipients && !action.config.subject) {
      warnings.push({ stepId: action.id, code: 'missing_config', message: `Email step "${action.name}" should have recipients and subject configured` })
    }

    // Warn about missing connections for actions (except the first)
    const hasIncomingConnection = workflow.connections.some((c) => c.targetStepId === action.id)
    if (!hasIncomingConnection && action.id !== workflow.actions[0]?.id) {
      warnings.push({ stepId: action.id, code: 'no_incoming_connection', message: `Action "${action.name}" has no incoming connections — it may not execute` })
    }
  }

  // ── Connections validation ──
  for (const conn of workflow.connections) {
    if (!stepIds.has(conn.sourceStepId)) {
      errors.push({ connectionId: conn.id, code: 'invalid_source', message: `Connection references non-existent source step: ${conn.sourceStepId}` })
    }
    if (!stepIds.has(conn.targetStepId)) {
      errors.push({ connectionId: conn.id, code: 'invalid_target', message: `Connection references non-existent target step: ${conn.targetStepId}` })
    }

    // Self-connection check
    if (conn.sourceStepId === conn.targetStepId) {
      errors.push({ connectionId: conn.id, code: 'self_connection', message: 'A step cannot connect to itself' })
    }
  }

  // ── Cycle detection (using DFS) ──
  const adjacency = new Map<string, Set<string>>()
  for (const stepId of stepIds) {
    adjacency.set(stepId, new Set())
  }
  for (const conn of workflow.connections) {
    adjacency.get(conn.sourceStepId)?.add(conn.targetStepId)
  }

  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    for (const neighbor of (adjacency.get(nodeId) ?? new Set())) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true
      } else if (recursionStack.has(neighbor)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const stepId of stepIds) {
    if (!visited.has(stepId)) {
      if (hasCycle(stepId)) {
        errors.push({ code: 'cycle_detected', message: 'Workflow contains a cycle — steps cannot depend on each other in a loop' })
        break
      }
    }
  }

  // ── Unreachable steps warning ──
  const reachableFromTrigger = new Set<string>()
  reachableFromTrigger.add(workflow.trigger.id)
  const queue = [workflow.trigger.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of (adjacency.get(current) ?? new Set())) {
      if (!reachableFromTrigger.has(neighbor)) {
        reachableFromTrigger.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  for (const action of workflow.actions) {
    if (!reachableFromTrigger.has(action.id)) {
      warnings.push({ stepId: action.id, code: 'unreachable', message: `Action "${action.name}" is unreachable from the trigger` })
    }
  }

  // ── Error handling validation ──
  if (workflow.errorHandling.globalTimeoutMs < 1000) {
    errors.push({ code: 'timeout_too_low', message: 'Global timeout must be at least 1000ms' })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ──────────────────────────────────────────────────────────────
// Get Available Templates
// ──────────────────────────────────────────────────────────────

export function getAvailableTemplates(): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES
}

export function getTemplateById(templateId: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
}

// ──────────────────────────────────────────────────────────────
// Serialization Helpers
// ──────────────────────────────────────────────────────────────

function deserializeWorkflow(row: Record<string, unknown>): WorkflowDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    organizationId: row.organization_id as string,
    schoolId: (row.school_id as string) ?? null,
    trigger: row.trigger as WorkflowStep,
    actions: (row.actions as WorkflowStep[]) ?? [],
    connections: (row.connections as WorkflowConnection[]) ?? [],
    variables: (row.variables as WorkflowVariable[]) ?? [],
    errorHandling: (row.error_handling as WorkflowErrorHandling) ?? DEFAULT_ERROR_HANDLING,
    status: row.status as WorkflowStatus,
    version: (row.version as number) ?? 1,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
    tags: (row.tags as string[]) ?? [],
    category: (row.category as string) ?? undefined,
  }
}

function deserializeExecution(row: Record<string, unknown>): WorkflowExecution {
  return {
    id: row.id as string,
    workflowId: row.workflow_id as string,
    triggerEvent: row.trigger_event as WorkflowExecution['triggerEvent'],
    steps: (row.steps as WorkflowStepExecution[]) ?? [],
    status: row.status as WorkflowExecution['status'],
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    error: (row.error as string) ?? null,
    organizationId: row.organization_id as string,
    schoolId: (row.school_id as string) ?? null,
    durationMs: (row.duration_ms as number) ?? null,
  }
}
