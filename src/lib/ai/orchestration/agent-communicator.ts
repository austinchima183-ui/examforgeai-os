// ============================================================================
// ExamForge AI Orchestration — Inter-Agent Communication System
// ============================================================================
// Communication layer for autonomous agents:
// - Direct messaging between agents
// - Broadcast to agent types
// - Task delegation with acceptance/rejection
// - Human escalation for critical issues
// - All messages persisted to Supabase
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { storeMemory } from './agent-memory'
import type {
  AgentMessage,
  AgentMessageType,
  MessagePriority,
  DelegatedTask,
  DelegationStatus,
  AgentType,
  AgentContext,
} from './types'

// ──────────────────────────────────────────────────────────────
// Row shapes
// ──────────────────────────────────────────────────────────────

interface AgentMessageRow {
  id: string
  from_agent_id: string
  to_agent_id: string
  type: string
  content: string
  priority: string
  read_at: string | null
  created_at: string
}

interface DelegatedTaskRow {
  id: string
  from_agent_id: string
  to_agent_id: string
  task: string
  status: string
  result: Record<string, unknown> | null
  deadline: string | null
  created_at: string
  completed_at: string | null
}

function rowToMessage(row: AgentMessageRow): AgentMessage {
  return {
    id: row.id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    type: row.type as AgentMessageType,
    content: row.content,
    priority: row.priority as MessagePriority,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

function rowToDelegation(row: DelegatedTaskRow): DelegatedTask {
  return {
    id: row.id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    task: row.task,
    status: row.status as DelegationStatus,
    result: row.result,
    deadline: row.deadline,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

// ──────────────────────────────────────────────────────────────
// sendMessage — Send a message from one agent to another
// ──────────────────────────────────────────────────────────────

export async function sendMessage(
  fromAgentId: string,
  toAgentId: string,
  type: AgentMessageType,
  content: string,
  priority: MessagePriority = 'normal',
  context?: AgentContext
): Promise<AgentMessage> {
  const supabase = await createClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      id,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      type,
      content,
      priority,
      read_at: null,
      created_at: now,
      organization_id: context?.organizationId ?? null,
      school_id: context?.schoolId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      id,
      fromAgentId,
      toAgentId,
      type,
      content,
      priority,
      readAt: null,
      createdAt: now,
    }
  }

  // Store in sender's episodic memory
  await storeMemory(
    fromAgentId,
    'episodic',
    `Sent ${type} message to ${toAgentId}: ${content.substring(0, 150)}`,
    priority === 'critical' ? 0.9 : priority === 'high' ? 0.7 : 0.4,
    context
  )

  return rowToMessage(data as AgentMessageRow)
}

// ──────────────────────────────────────────────────────────────
// getMessages — Get messages for an agent
// ──────────────────────────────────────────────────────────────

export async function getMessages(
  agentId: string,
  type?: AgentMessageType,
  unreadOnly: boolean = false
): Promise<AgentMessage[]> {
  const supabase = await createClient()

  let query = supabase
    .from('agent_messages')
    .select('*')
    .eq('to_agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (type) {
    query = query.eq('type', type)
  }

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error || !data) return []
  return (data as AgentMessageRow[]).map(rowToMessage)
}

// ──────────────────────────────────────────────────────────────
// markMessageRead — Mark a message as read
// ──────────────────────────────────────────────────────────────

export async function markMessageRead(messageId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('agent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
}

// ──────────────────────────────────────────────────────────────
// broadcastMessage — Broadcast to all agents of a given type
// ──────────────────────────────────────────────────────────────

export async function broadcastMessage(
  fromAgentId: string,
  agentTypes: AgentType[],
  content: string,
  context?: AgentContext
): Promise<AgentMessage[]> {
  const supabase = await createClient()

  // Find all agents of the specified types
  const { data: agents } = await supabase
    .from('agent_configs')
    .select('id')
    .in('type', agentTypes)
    .eq('enabled', true)

  if (!agents || agents.length === 0) return []

  const messages: AgentMessage[] = []
  const now = new Date().toISOString()

  for (const agent of agents) {
    if (agent.id === fromAgentId) continue // Don't broadcast to self

    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        id,
        from_agent_id: fromAgentId,
        to_agent_id: agent.id,
        type: 'notification',
        content,
        priority: 'normal',
        read_at: null,
        created_at: now,
        organization_id: context?.organizationId ?? null,
        school_id: context?.schoolId ?? null,
      })
      .select()
      .single()

    if (!error && data) {
      messages.push(rowToMessage(data as AgentMessageRow))
    }
  }

  return messages
}

// ──────────────────────────────────────────────────────────────
// requestDelegation — Delegate a task to another agent
// ──────────────────────────────────────────────────────────────

export async function requestDelegation(
  fromAgentId: string,
  toAgentId: string,
  task: string,
  deadline?: string,
  context?: AgentContext
): Promise<DelegatedTask> {
  const supabase = await createClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  // Create the delegation record
  const { data, error } = await supabase
    .from('agent_delegations')
    .insert({
      id,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      task,
      status: 'pending',
      result: null,
      deadline: deadline ?? null,
      created_at: now,
      completed_at: null,
      organization_id: context?.organizationId ?? null,
      school_id: context?.schoolId ?? null,
    })
    .select()
    .single()

  // Also send a delegation message
  await sendMessage(
    fromAgentId,
    toAgentId,
    'delegation',
    `Task delegation: ${task}${deadline ? ` (Deadline: ${deadline})` : ''}`,
    'high',
    context
  )

  // Store in sender's memory
  await storeMemory(
    fromAgentId,
    'episodic',
    `Delegated task to ${toAgentId}: ${task.substring(0, 100)}`,
    0.7,
    context
  )

  if (error || !data) {
    return {
      id,
      fromAgentId,
      toAgentId,
      task,
      status: 'pending',
      result: null,
      deadline: deadline ?? null,
      createdAt: now,
      completedAt: null,
    }
  }

  return rowToDelegation(data as DelegatedTaskRow)
}

// ──────────────────────────────────────────────────────────────
// respondToDelegation — Accept or reject a delegation
// ──────────────────────────────────────────────────────────────

export async function respondToDelegation(
  delegationId: string,
  response: 'accepted' | 'rejected',
  context?: AgentContext
): Promise<DelegatedTask | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('agent_delegations')
    .update({
      status: response,
      completed_at: response === 'rejected' ? now : null,
    })
    .eq('id', delegationId)
    .select()
    .single()

  if (!data) return null

  const delegation = rowToDelegation(data as DelegatedTaskRow)

  // Notify the delegating agent
  await sendMessage(
    delegation.toAgentId,
    delegation.fromAgentId,
    'response',
    `Delegation ${response}: ${delegation.task.substring(0, 100)}`,
    response === 'accepted' ? 'normal' : 'high',
    context
  )

  return delegation
}

// ──────────────────────────────────────────────────────────────
// getDelegationStatus — Check delegation status
// ──────────────────────────────────────────────────────────────

export async function getDelegationStatus(delegationId: string): Promise<DelegatedTask | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_delegations')
    .select('*')
    .eq('id', delegationId)
    .single()

  if (!data) return null
  return rowToDelegation(data as DelegatedTaskRow)
}

// ──────────────────────────────────────────────────────────────
// escalateToHuman — Escalate an issue to a human operator
// ──────────────────────────────────────────────────────────────

export async function escalateToHuman(
  agentId: string,
  issue: string,
  urgency: 'low' | 'medium' | 'high' | 'critical',
  context?: AgentContext
): Promise<AgentMessage> {
  const supabase = await createClient()

  // Find human administrators to escalate to
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('school_id', context?.schoolId ?? '')
    .in('role', ['school_admin', 'super_admin'])
    .eq('is_active', true)
    .limit(3)

  const targetId = admins?.[0]?.id ?? 'human-escalation'

  // Create an escalation notification
  const notificationContent = `[ESCALATION - ${urgency.toUpperCase()}] Agent ${agentId} requires human attention:\n\n${issue}`

  // Insert a notification record for the human
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        type: 'system',
        channel: 'in_app',
        title: `Agent Escalation: ${urgency.toUpperCase()}`,
        body: notificationContent.substring(0, 500),
        priority: urgency,
        action_url: '/admin/agents',
        data: { agentId, urgency, issue: issue.substring(0, 500) },
      })
    }
  }

  // Store in agent memory
  await storeMemory(
    agentId,
    'episodic',
    `Escalated to human (${urgency}): ${issue.substring(0, 150)}`,
    urgency === 'critical' ? 1.0 : urgency === 'high' ? 0.9 : 0.7,
    context
  )

  // Create an agent message record for the escalation
  return sendMessage(
    agentId,
    targetId,
    'request',
    notificationContent,
    urgency === 'critical' ? 'critical' : urgency === 'high' ? 'high' : 'normal',
    context
  )
}

// ──────────────────────────────────────────────────────────────
// getPendingDelegations — Get pending delegations for an agent
// ──────────────────────────────────────────────────────────────

export async function getPendingDelegations(agentId: string): Promise<DelegatedTask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_delegations')
    .select('*')
    .eq('to_agent_id', agentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as DelegatedTaskRow[]).map(rowToDelegation)
}

// ──────────────────────────────────────────────────────────────
// completeDelegation — Mark a delegation as completed with result
// ──────────────────────────────────────────────────────────────

export async function completeDelegation(
  delegationId: string,
  result: Record<string, unknown>,
  context?: AgentContext
): Promise<DelegatedTask | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('agent_delegations')
    .update({
      status: 'completed',
      result,
      completed_at: now,
    })
    .eq('id', delegationId)
    .select()
    .single()

  if (!data) return null

  const delegation = rowToDelegation(data as DelegatedTaskRow)

  // Notify the original agent
  await sendMessage(
    delegation.toAgentId,
    delegation.fromAgentId,
    'response',
    `Delegation completed: ${delegation.task.substring(0, 100)}. Result: ${JSON.stringify(result).substring(0, 200)}`,
    'normal',
    context
  )

  return delegation
}
