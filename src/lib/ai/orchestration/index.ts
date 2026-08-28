// ============================================================================
// ExamForge AI Orchestration — Central Exports
// ============================================================================
// Single entry point for the entire AI orchestration layer.
// Autonomous agents that: remember, plan, delegate, schedule, communicate,
// execute workflows — all with guardrails, cost tracking, and persistence.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  AgentType,
  AgentState,
  MemoryType,
  AgentMessageType,
  PlanStatus,
  PlanStepStatus,
  DelegationStatus,
  ExecutionStatus,
  AgentCapability,
  MessagePriority,
  AgentMemory,
  AgentPlanStep,
  AgentPlan,
  AgentMessage,
  AgentGuardrails,
  AgentSchedule,
  AgentConfig,
  AgentExecution,
  DelegatedTask,
  AgentRuntimeState,
  AgentExecutionResult,
  AgentStats,
  PlanEvaluation,
  CostEstimate,
  GuardrailValidation,
  AgentContext,
} from './types'

export {
  DEFAULT_GUARDRAILS,
  DEFAULT_SCHEDULE,
  AGENT_CAPABILITIES,
} from './types'

// ──────────────────────────────────────────────────────────────
// Agent Memory System
// ──────────────────────────────────────────────────────────────

export {
  storeMemory,
  retrieveMemories,
  updateMemoryAccess,
  consolidateMemories,
  getEpisodicMemory,
  getSemanticMemory,
  getProceduralMemory,
  summarizeMemories,
  pruneExpiredMemories,
  getMemoryCount,
} from './agent-memory'

// ──────────────────────────────────────────────────────────────
// Agent Planning System
// ──────────────────────────────────────────────────────────────

export {
  createPlan,
  updatePlanStep,
  getNextStep,
  reorderPlan,
  evaluatePlanProgress,
  adaptPlan,
  decomposeGoal,
  estimatePlanCost,
  getPlan,
} from './agent-planner'

// ──────────────────────────────────────────────────────────────
// Agent Communication System
// ──────────────────────────────────────────────────────────────

export {
  sendMessage,
  getMessages,
  markMessageRead,
  broadcastMessage,
  requestDelegation,
  respondToDelegation,
  getDelegationStatus,
  escalateToHuman,
  getPendingDelegations,
  completeDelegation,
} from './agent-communicator'

// ──────────────────────────────────────────────────────────────
// Agent Runner — Execution Engine
// ──────────────────────────────────────────────────────────────

export {
  AgentRunner,
} from './agent-runner'

// ──────────────────────────────────────────────────────────────
// Domain Agents
// ──────────────────────────────────────────────────────────────

export { TeacherAgent } from './agents/teacher-agent'
export { PrincipalAgent } from './agents/principal-agent'
export { AdmissionsAgent } from './agents/admissions-agent'
export { FinanceAgent } from './agents/finance-agent'
export { GovernmentAgent } from './agents/government-agent'
export { ResearchAgent } from './agents/research-agent'
export { ComplianceAgent } from './agents/compliance-agent'
export { MarketingAgent } from './agents/marketing-agent'
export { SchedulingAgent } from './agents/scheduling-agent'
export { SupportAgent } from './agents/support-agent'
