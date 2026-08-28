// ============================================================================
// ExamForge AI — Workflow Automation Engine — Human Approval Service
// ============================================================================
// Manages human-in-the-loop approval requests for workflow steps.
// Integrates with the workflow engine to pause/resume executions.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { workflowEngine } from './workflow-engine'
import type {
  HumanApprovalRequest,
  ApprovalStatus,
} from './types'

// ──────────────────────────────────────────────────────────────
// Create Approval Request
// ──────────────────────────────────────────────────────────────

export interface CreateApprovalRequestInput {
  workflowExecutionId: string
  stepId: string
  requestedFrom: string
  context?: Record<string, unknown>
  expiresAt?: string
  organizationId: string
  schoolId?: string | null
}

export async function createApprovalRequest(
  input: CreateApprovalRequestInput
): Promise<HumanApprovalRequest> {
  const supabase = await createClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const defaultExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString() // 7 days

  const request: HumanApprovalRequest = {
    id,
    workflowExecutionId: input.workflowExecutionId,
    stepId: input.stepId,
    requestedAt: now,
    requestedFrom: input.requestedFrom,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    comments: null,
    context: input.context ?? {},
    expiresAt: input.expiresAt ?? defaultExpiresAt,
    organizationId: input.organizationId,
    schoolId: input.schoolId ?? null,
  }

  const { error } = await supabase.from('workflow_approval_requests').insert({
    id: request.id,
    workflow_execution_id: request.workflowExecutionId,
    step_id: request.stepId,
    requested_at: request.requestedAt,
    requested_from: request.requestedFrom,
    status: 'pending',
    context: request.context,
    expires_at: request.expiresAt,
    organization_id: request.organizationId,
    school_id: request.schoolId,
  })

  if (error) {
    throw new Error(`Failed to create approval request: ${error.message}`)
  }

  // ── Send notification to the approver ──
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('workflow_id')
    .eq('id', input.workflowExecutionId)
    .single()

  const { data: workflow } = await supabase
    .from('workflow_definitions')
    .select('name')
    .eq('id', execution?.workflow_id ?? '')
    .single()

  await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: input.requestedFrom,
    type: 'system',
    channel: 'in_app',
    title: `Approval Required: ${workflow?.name ?? 'Workflow'}`,
    body: `A workflow step requires your approval to continue. Execution ID: ${input.workflowExecutionId}`,
    action_url: `/workflows/approvals/${id}`,
    priority: 'high',
    data: {
      approvalId: id,
      executionId: input.workflowExecutionId,
      stepId: input.stepId,
      workflowName: workflow?.name ?? 'Unknown',
    },
  })

  return request
}

// ──────────────────────────────────────────────────────────────
// Get Pending Approvals for a User
// ──────────────────────────────────────────────────────────────

export async function getPendingApprovals(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<HumanApprovalRequest[]> {
  const supabase = await createClient()

  let query = supabase
    .from('workflow_approval_requests')
    .select('*')
    .eq('requested_from', userId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)

  const { data, error } = await query

  if (error) {
    console.error('[ApprovalService] Error fetching pending approvals:', error)
    return []
  }

  return (data ?? []).map(deserializeApprovalRequest)
}

// ──────────────────────────────────────────────────────────────
// Get Approval Request by ID
// ──────────────────────────────────────────────────────────────

export async function getApprovalRequest(
  approvalId: string
): Promise<HumanApprovalRequest | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflow_approval_requests')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (error || !data) return null

  return deserializeApprovalRequest(data)
}

// ──────────────────────────────────────────────────────────────
// Approve Execution — Resume workflow after approval
// ──────────────────────────────────────────────────────────────

export async function approveExecution(
  executionId: string,
  stepId: string,
  userId: string,
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // ── Validate the approval request exists and is pending ──
  const { data: request, error: fetchError } = await supabase
    .from('workflow_approval_requests')
    .select('*')
    .eq('workflow_execution_id', executionId)
    .eq('step_id', stepId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'No pending approval request found for this execution step' }
  }

  // ── Check if the user is authorized to approve ──
  if (request.requested_from !== userId) {
    // Also check if user is a school_admin or super_admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'school_admin' && profile?.role !== 'super_admin') {
      return { success: false, error: 'You are not authorized to approve this request' }
    }
  }

  // ── Check if the request has expired ──
  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    await supabase
      .from('workflow_approval_requests')
      .update({ status: 'expired' })
      .eq('id', request.id)
    return { success: false, error: 'This approval request has expired' }
  }

  // ── Update the approval request ──
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('workflow_approval_requests')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: now,
      comments: comments ?? null,
    })
    .eq('id', request.id)

  if (updateError) {
    return { success: false, error: `Failed to update approval: ${updateError.message}` }
  }

  // ── Resume the workflow execution ──
  try {
    await workflowEngine.resumeAfterApproval(executionId, stepId, true, comments)
  } catch (resumeError) {
    console.error('[ApprovalService] Failed to resume execution after approval:', resumeError)
    return { success: false, error: `Approval recorded but failed to resume execution: ${resumeError instanceof Error ? resumeError.message : 'Unknown error'}` }
  }

  // ── Send confirmation notification ──
  await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: 'system',
    channel: 'in_app',
    title: 'Workflow Approved',
    body: `Your approval has been recorded and the workflow execution has resumed.`,
    priority: 'normal',
    data: { executionId, stepId, approved: true },
  })

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Reject Execution — Stop workflow
// ──────────────────────────────────────────────────────────────

export async function rejectExecution(
  executionId: string,
  stepId: string,
  userId: string,
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // ── Validate the approval request exists and is pending ──
  const { data: request, error: fetchError } = await supabase
    .from('workflow_approval_requests')
    .select('*')
    .eq('workflow_execution_id', executionId)
    .eq('step_id', stepId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'No pending approval request found for this execution step' }
  }

  // ── Check authorization ──
  if (request.requested_from !== userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'school_admin' && profile?.role !== 'super_admin') {
      return { success: false, error: 'You are not authorized to reject this request' }
    }
  }

  // ── Update the approval request ──
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('workflow_approval_requests')
    .update({
      status: 'rejected',
      approved_by: userId,
      approved_at: now,
      comments: comments ?? null,
    })
    .eq('id', request.id)

  if (updateError) {
    return { success: false, error: `Failed to update rejection: ${updateError.message}` }
  }

  // ── Resume the workflow with rejection (will mark as failed) ──
  try {
    await workflowEngine.resumeAfterApproval(executionId, stepId, false, comments)
  } catch (resumeError) {
    console.error('[ApprovalService] Failed to process rejection:', resumeError)
    return { success: false, error: `Rejection recorded but failed to stop execution: ${resumeError instanceof Error ? resumeError.message : 'Unknown error'}` }
  }

  // ── Send rejection notification ──
  await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: 'system',
    channel: 'in_app',
    title: 'Workflow Rejected',
    body: `The workflow has been rejected and execution has stopped.${comments ? ` Reason: ${comments}` : ''}`,
    priority: 'normal',
    data: { executionId, stepId, approved: false },
  })

  // ── Notify the workflow creator ──
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('workflow_id')
    .eq('id', executionId)
    .single()

  if (execution) {
    const { data: workflow } = await supabase
      .from('workflow_definitions')
      .select('created_by, name')
      .eq('id', execution.workflow_id)
      .single()

    if (workflow?.created_by && workflow.created_by !== userId) {
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: workflow.created_by,
        type: 'system',
        channel: 'in_app',
        title: `Workflow Rejected: ${workflow.name}`,
        body: `The workflow "${workflow.name}" was rejected by an approver.${comments ? ` Comments: ${comments}` : ''}`,
        priority: 'high',
        data: { executionId, stepId, workflowId: execution.workflow_id },
      })
    }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Get Approval History for a Workflow
// ──────────────────────────────────────────────────────────────

export async function getApprovalHistory(
  workflowId: string,
  options?: { limit?: number; offset?: number }
): Promise<HumanApprovalRequest[]> {
  const supabase = await createClient()

  // Get all execution IDs for this workflow
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('id')
    .eq('workflow_id', workflowId)

  if (!executions || executions.length === 0) {
    return []
  }

  const executionIds = executions.map((e) => e.id)

  let query = supabase
    .from('workflow_approval_requests')
    .select('*')
    .in('workflow_execution_id', executionIds)
    .order('requested_at', { ascending: false })

  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)

  const { data, error } = await query

  if (error) {
    console.error('[ApprovalService] Error fetching approval history:', error)
    return []
  }

  return (data ?? []).map(deserializeApprovalRequest)
}

// ──────────────────────────────────────────────────────────────
// Get All Approval Requests for an Organization
// ──────────────────────────────────────────────────────────────

export async function getOrganizationApprovals(
  organizationId: string,
  options?: { status?: ApprovalStatus; schoolId?: string; limit?: number; offset?: number }
): Promise<{ data: HumanApprovalRequest[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('workflow_approval_requests')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('requested_at', { ascending: false })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.schoolId) query = query.eq('school_id', options.schoolId)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) {
    const limit = options.limit ?? 50
    query = query.range(options.offset, options.offset + limit - 1)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0 }
  }

  return {
    data: (data ?? []).map(deserializeApprovalRequest),
    total: count ?? 0,
  }
}

// ──────────────────────────────────────────────────────────────
// Expire Stale Approval Requests
// ──────────────────────────────────────────────────────────────

export async function expireStaleApprovals(): Promise<number> {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('workflow_approval_requests')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    console.error('[ApprovalService] Error expiring stale approvals:', error)
    return 0
  }

  // Also cancel any executions that were waiting on these approvals
  for (const approval of data ?? []) {
    const { data: request } = await supabase
      .from('workflow_approval_requests')
      .select('workflow_execution_id, step_id')
      .eq('id', approval.id)
      .single()

    if (request) {
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          error: 'Approval request expired',
          completed_at: now,
        })
        .eq('id', request.workflow_execution_id)
        .eq('status', 'waiting_approval')
    }
  }

  return data?.length ?? 0
}

// ──────────────────────────────────────────────────────────────
// Serialization Helper
// ──────────────────────────────────────────────────────────────

function deserializeApprovalRequest(row: Record<string, unknown>): HumanApprovalRequest {
  return {
    id: row.id as string,
    workflowExecutionId: row.workflow_execution_id as string,
    stepId: row.step_id as string,
    requestedAt: row.requested_at as string,
    requestedFrom: row.requested_from as string,
    status: row.status as ApprovalStatus,
    approvedBy: (row.approved_by as string) ?? null,
    approvedAt: (row.approved_at as string) ?? null,
    comments: (row.comments as string) ?? null,
    context: (row.context as Record<string, unknown>) ?? {},
    expiresAt: (row.expires_at as string) ?? null,
    organizationId: row.organization_id as string,
    schoolId: (row.school_id as string) ?? null,
  }
}
