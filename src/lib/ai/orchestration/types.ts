// ============================================================================
// ExamForge AI Orchestration — Agent Type Definitions
// ============================================================================
// Comprehensive type system for autonomous AI agent orchestration.
// Each agent can: remember, plan, delegate, schedule, communicate, execute workflows.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Agent Types — Domain-specific agent roles
// ──────────────────────────────────────────────────────────────

export type AgentType =
  | 'teacher'
  | 'principal'
  | 'admissions'
  | 'finance'
  | 'government'
  | 'research'
  | 'compliance'
  | 'marketing'
  | 'scheduling'
  | 'support'

// ──────────────────────────────────────────────────────────────
// Agent State — Lifecycle states for an agent
// ──────────────────────────────────────────────────────────────

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'waiting'
  | 'delegating'
  | 'communicating'
  | 'error'

// ──────────────────────────────────────────────────────────────
// Memory Types — Three types of agent memory
// ──────────────────────────────────────────────────────────────

export type MemoryType = 'episodic' | 'semantic' | 'procedural'

// ──────────────────────────────────────────────────────────────
// Message Types — Inter-agent communication
// ──────────────────────────────────────────────────────────────

export type AgentMessageType = 'request' | 'response' | 'notification' | 'delegation'

// ──────────────────────────────────────────────────────────────
// Plan Status
// ──────────────────────────────────────────────────────────────

export type PlanStatus = 'draft' | 'in_progress' | 'completed' | 'failed' | 'adapted' | 'cancelled'

// ──────────────────────────────────────────────────────────────

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked'

// ──────────────────────────────────────────────────────────────
// Delegation Status
// ──────────────────────────────────────────────────────────────

export type DelegationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'failed' | 'expired'

// ──────────────────────────────────────────────────────────────
// Execution Status
// ──────────────────────────────────────────────────────────────

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'

// ──────────────────────────────────────────────────────────────
// Agent Capabilities — What an agent can do
// ──────────────────────────────────────────────────────────────

export type AgentCapability =
  | 'lesson_planning'
  | 'exam_creation'
  | 'student_assessment'
  | 'intervention'
  | 'enrollment'
  | 'scheduling'
  | 'financial_analysis'
  | 'compliance_check'
  | 'communication'
  | 'research'
  | 'marketing'
  | 'support'
  | 'reporting'
  | 'prediction'

// ──────────────────────────────────────────────────────────────
// Message Priority
// ──────────────────────────────────────────────────────────────

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical'

// ──────────────────────────────────────────────────────────────
// Agent Memory — Episodic, Semantic, and Procedural memory
// ──────────────────────────────────────────────────────────────

export interface AgentMemory {
  id: string
  agentId: string
  type: MemoryType
  content: string
  embedding: number[] | null
  importance: number // 0-1
  accessedAt: string
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Agent Plan Step — Individual step within a plan
// ──────────────────────────────────────────────────────────────

export interface AgentPlanStep {
  id: string
  description: string
  action: string
  dependencies: string[] // IDs of steps that must complete first
  status: PlanStepStatus
  result: Record<string, unknown> | null
}

// ──────────────────────────────────────────────────────────────
// Agent Plan — AI-generated execution plan
// ──────────────────────────────────────────────────────────────

export interface AgentPlan {
  id: string
  agentId: string
  goal: string
  steps: AgentPlanStep[]
  status: PlanStatus
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Agent Message — Inter-agent communication
// ──────────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string
  fromAgentId: string
  toAgentId: string
  type: AgentMessageType
  content: string
  priority: MessagePriority
  readAt: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Agent Guardrails — Safety and cost constraints
// ──────────────────────────────────────────────────────────────

export interface AgentGuardrails {
  maxActionsPerExecution: number
  maxCostPerExecution: number // USD
  requireHumanApprovalAbove: number // USD cost threshold
  restrictedActions: string[]
  dataAccessScope: string[] // e.g., ['own_class', 'own_school', 'own_district']
}

// ──────────────────────────────────────────────────────────────
// Agent Schedule — When the agent runs
// ──────────────────────────────────────────────────────────────

export interface AgentSchedule {
  type: 'continuous' | 'cron' | 'on_event' | 'on_demand'
  cronExpression?: string // For cron-based scheduling
  eventTriggers?: string[] // Event types that trigger this agent
  maxConcurrentExecutions: number
  cooldownMs: number // Minimum time between executions
}

// ──────────────────────────────────────────────────────────────
// Agent Config — Agent configuration and capabilities
// ──────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string
  type: AgentType
  name: string
  organizationId: string
  capabilities: AgentCapability[]
  model: string
  maxTokens: number
  temperature: number
  schedule: AgentSchedule
  enabled: boolean
  guardrails: AgentGuardrails
}

// ──────────────────────────────────────────────────────────────
// Agent Execution — Record of a single agent run
// ──────────────────────────────────────────────────────────────

export interface AgentExecution {
  id: string
  agentId: string
  configId: string
  goal: string
  plan: AgentPlan | null
  memory: AgentMemory[]
  messages: AgentMessage[]
  status: ExecutionStatus
  startedAt: string
  completedAt: string | null
  result: Record<string, unknown> | null
  tokenUsage: { input: number; output: number }
  costUsd: number
}

// ──────────────────────────────────────────────────────────────
// Delegated Task — Task delegated from one agent to another
// ──────────────────────────────────────────────────────────────

export interface DelegatedTask {
  id: string
  fromAgentId: string
  toAgentId: string
  task: string
  status: DelegationStatus
  result: Record<string, unknown> | null
  deadline: string | null
  createdAt: string
  completedAt: string | null
}

// ──────────────────────────────────────────────────────────────
// Agent Runtime State — In-memory state during execution
// ──────────────────────────────────────────────────────────────

export interface AgentRuntimeState {
  agentId: string
  config: AgentConfig
  state: AgentState
  currentExecutionId: string | null
  lastActivityAt: string
  actionsTaken: number
  totalCostUsd: number
  errorCount: number
}

// ──────────────────────────────────────────────────────────────
// Agent Execution Result — Result of running an agent
// ──────────────────────────────────────────────────────────────

export interface AgentExecutionResult {
  executionId: string
  agentId: string
  success: boolean
  goal: string
  summary: string
  actionsTaken: number
  messagesSent: number
  delegationsCreated: number
  tokenUsage: { input: number; output: number }
  costUsd: number
  durationMs: number
  errors: string[]
}

// ──────────────────────────────────────────────────────────────
// Agent Statistics — Performance metrics
// ──────────────────────────────────────────────────────────────

export interface AgentStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  avgDurationMs: number
  avgCostUsd: number
  totalCostUsd: number
  totalTokenUsage: { input: number; output: number }
  lastExecutedAt: string | null
  avgActionsPerExecution: number
  errorRate: number
}

// ──────────────────────────────────────────────────────────────
// Plan Evaluation — Progress and blockers
// ──────────────────────────────────────────────────────────────

export interface PlanEvaluation {
  planId: string
  progressPercent: number
  completedSteps: number
  totalSteps: number
  blockers: Array<{ stepId: string; reason: string }>
  nextExecutableSteps: string[]
  estimatedRemainingCost: { tokens: number; usd: number }
}

// ──────────────────────────────────────────────────────────────
// Cost Estimate — Token and dollar cost
// ──────────────────────────────────────────────────────────────

export interface CostEstimate {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
  confidence: number // 0-1
}

// ──────────────────────────────────────────────────────────────
// Guardrail Validation Result
// ──────────────────────────────────────────────────────────────

export interface GuardrailValidation {
  valid: boolean
  violations: string[]
  actionsRemaining: number
  costRemaining: number
  requiresHumanApproval: boolean
}

// ──────────────────────────────────────────────────────────────
// Agent Context — Context passed to agent methods
// ──────────────────────────────────────────────────────────────

export interface AgentContext {
  userId: string
  schoolId?: string | null
  organizationId?: string | null
  agentId: string
  executionId?: string
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Default Guardrails
// ──────────────────────────────────────────────────────────────

export const DEFAULT_GUARDRAILS: AgentGuardrails = {
  maxActionsPerExecution: 50,
  maxCostPerExecution: 2.00,
  requireHumanApprovalAbove: 1.00,
  restrictedActions: [],
  dataAccessScope: ['own_school'],
}

// ──────────────────────────────────────────────────────────────
// Default Schedule
// ──────────────────────────────────────────────────────────────

export const DEFAULT_SCHEDULE: AgentSchedule = {
  type: 'on_demand',
  maxConcurrentExecutions: 1,
  cooldownMs: 60000,
}

// ──────────────────────────────────────────────────────────────
// Capability-to-AgentType mapping
// ──────────────────────────────────────────────────────────────

export const AGENT_CAPABILITIES: Record<AgentType, AgentCapability[]> = {
  teacher: ['lesson_planning', 'exam_creation', 'student_assessment', 'intervention', 'communication', 'reporting'],
  principal: ['student_assessment', 'intervention', 'reporting', 'communication', 'scheduling', 'financial_analysis'],
  admissions: ['enrollment', 'communication', 'reporting', 'prediction'],
  finance: ['financial_analysis', 'reporting', 'prediction', 'compliance_check'],
  government: ['compliance_check', 'reporting', 'research', 'prediction', 'communication'],
  research: ['research', 'reporting', 'prediction'],
  compliance: ['compliance_check', 'reporting', 'communication'],
  marketing: ['marketing', 'communication', 'research', 'reporting'],
  scheduling: ['scheduling', 'communication', 'reporting'],
  support: ['support', 'communication', 'reporting'],
}
