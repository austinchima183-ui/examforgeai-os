// ============================================================================
// ExamForge AI Orchestration — Agent Planning System
// ============================================================================
// AI-powered planning system for autonomous agents:
// - Generate plans from goals using AI
// - Execute plans step-by-step with dependency resolution
// - Adapt plans based on new information
// - Estimate costs and track progress
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import {
  storeMemory,
} from './agent-memory'
import type {
  AgentPlan,
  AgentPlanStep,
  PlanStatus,
  PlanStepStatus,
  PlanEvaluation,
  CostEstimate,
  AgentContext,
} from './types'

// ──────────────────────────────────────────────────────────────
// Supabase row shape for agent_plans
// ──────────────────────────────────────────────────────────────

interface AgentPlanRow {
  id: string
  agent_id: string
  goal: string
  steps: Record<string, unknown>[]
  status: string
  created_at: string
}

// ──────────────────────────────────────────────────────────────
// Plan Generation Schema
// ──────────────────────────────────────────────────────────────

interface GeneratedPlan {
  steps: Array<{
    description: string
    action: string
    dependencies: number[] // indices of steps this depends on (0-based)
  }>
}

// ──────────────────────────────────────────────────────────────
// createPlan — AI-powered plan generation
// ──────────────────────────────────────────────────────────────

export async function createPlan(
  agentId: string,
  goal: string,
  context: Record<string, unknown>,
  agentContext?: AgentContext
): Promise<AgentPlan> {
  const planId = crypto.randomUUID()
  const now = new Date().toISOString()

  const contextStr = Object.entries(context)
    .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
    .join('\n')

  const prompt = `You are an AI planning agent. Create a step-by-step execution plan for the following goal:

Goal: ${goal}

Context:
${contextStr}

Generate a plan with these requirements:
1. Each step must have a clear description and action identifier
2. Steps should be ordered logically (dependencies before dependents)
3. Use realistic action names (e.g., "query_database", "call_ai", "send_notification", "update_record", "delegate_task")
4. Mark dependencies using 0-based step indices
5. Keep the plan concise (3-10 steps)
6. Each step should be independently executable

Respond as JSON: { "steps": [{ "description": "...", "action": "...", "dependencies": [0] }] }`

  const response = await executeStructuredAI<GeneratedPlan>(
    {
      prompt,
      systemPrompt: 'You are an expert planning system. Generate clear, actionable, dependency-aware execution plans. Respond with valid JSON only.',
      userId: agentContext?.userId ?? 'system',
      schoolId: agentContext?.schoolId ?? null,
      temperature: 0.4,
      maxTokens: 2048,
    },
    (raw) => {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        steps: Array.isArray(d.steps)
          ? d.steps.map((s: Record<string, unknown>) => ({
              description: String(s.description ?? ''),
              action: String(s.action ?? 'unknown'),
              dependencies: Array.isArray(s.dependencies) ? s.dependencies.map(Number) : [],
            }))
          : [],
      }
    }
  )

  // Build AgentPlanStep objects
  const steps: AgentPlanStep[] = response.parsed.steps.map((step, index) => ({
    id: `${planId}-step-${index}`,
    description: step.description,
    action: step.action,
    dependencies: step.dependencies.map(depIndex => `${planId}-step-${depIndex}`),
    status: 'pending' as PlanStepStatus,
    result: null,
  }))

  const plan: AgentPlan = {
    id: planId,
    agentId,
    goal,
    steps,
    status: 'in_progress',
    createdAt: now,
  }

  // Persist to database
  const supabase = await createClient()
  await supabase.from('agent_plans').insert({
    id: planId,
    agent_id: agentId,
    goal,
    steps: steps as unknown as Record<string, unknown>[],
    status: 'in_progress',
    created_at: now,
    organization_id: agentContext?.organizationId ?? null,
    school_id: agentContext?.schoolId ?? null,
  })

  // Store in agent memory
  await storeMemory(
    agentId,
    'episodic',
    `Created plan "${goal}" with ${steps.length} steps: ${steps.map(s => s.description).join(', ')}`,
    0.6,
    agentContext
  )

  return plan
}

// ──────────────────────────────────────────────────────────────
// updatePlanStep — Update a step's status and result
// ──────────────────────────────────────────────────────────────

export async function updatePlanStep(
  planId: string,
  stepId: string,
  status: PlanStepStatus,
  result: Record<string, unknown> | null
): Promise<AgentPlan | null> {
  const supabase = await createClient()

  // Fetch current plan
  const { data: planRow } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!planRow) return null

  const plan = rowToPlan(planRow as AgentPlanRow)

  // Update the specific step
  const updatedSteps = plan.steps.map(step => {
    if (step.id === stepId) {
      return { ...step, status, result }
    }
    return step
  })

  // Determine overall plan status
  let planStatus: PlanStatus = plan.status
  if (updatedSteps.every(s => s.status === 'completed')) {
    planStatus = 'completed'
  } else if (updatedSteps.some(s => s.status === 'failed')) {
    planStatus = 'failed'
  }

  // Persist
  await supabase
    .from('agent_plans')
    .update({
      steps: updatedSteps as unknown as Record<string, unknown>[],
      status: planStatus,
    })
    .eq('id', planId)

  return { ...plan, steps: updatedSteps, status: planStatus }
}

// ──────────────────────────────────────────────────────────────
// getNextStep — Get next executable step (dependencies satisfied)
// ──────────────────────────────────────────────────────────────

export async function getNextStep(planId: string): Promise<AgentPlanStep | null> {
  const plan = await getPlan(planId)
  if (!plan) return null

  const completedStepIds = new Set(
    plan.steps.filter(s => s.status === 'completed').map(s => s.id)
  )

  // Find first pending step whose dependencies are all completed
  const nextStep = plan.steps.find(step => {
    if (step.status !== 'pending') return false
    return step.dependencies.every(depId => completedStepIds.has(depId))
  })

  return nextStep ?? null
}

// ──────────────────────────────────────────────────────────────
// reorderPlan — Reorder steps by providing a new order
// ──────────────────────────────────────────────────────────────

export async function reorderPlan(
  planId: string,
  stepOrder: string[] // Array of step IDs in desired order
): Promise<AgentPlan | null> {
  const supabase = await createClient()

  const { data: planRow } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!planRow) return null

  const plan = rowToPlan(planRow as AgentPlanRow)
  const stepMap = new Map(plan.steps.map(s => [s.id, s]))

  const reorderedSteps = stepOrder
    .map(id => stepMap.get(id))
    .filter((s): s is AgentPlanStep => s !== undefined)

  // Add any steps not included in the reorder at the end
  for (const step of plan.steps) {
    if (!stepOrder.includes(step.id)) {
      reorderedSteps.push(step)
    }
  }

  await supabase
    .from('agent_plans')
    .update({
      steps: reorderedSteps as unknown as Record<string, unknown>[],
    })
    .eq('id', planId)

  return { ...plan, steps: reorderedSteps }
}

// ──────────────────────────────────────────────────────────────
// evaluatePlanProgress — Progress percentage + blockers
// ──────────────────────────────────────────────────────────────

export async function evaluatePlanProgress(planId: string): Promise<PlanEvaluation> {
  const plan = await getPlan(planId)

  const emptyEvaluation: PlanEvaluation = {
    planId,
    progressPercent: 0,
    completedSteps: 0,
    totalSteps: 0,
    blockers: [],
    nextExecutableSteps: [],
    estimatedRemainingCost: { tokens: 0, usd: 0 },
  }

  if (!plan) return emptyEvaluation

  const completedSteps = plan.steps.filter(s => s.status === 'completed').length
  const totalSteps = plan.steps.length
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const completedStepIds = new Set(plan.steps.filter(s => s.status === 'completed').map(s => s.id))

  // Find blockers: pending steps with unmet dependencies
  const blockers: Array<{ stepId: string; reason: string }> = []
  const nextExecutableSteps: string[] = []

  for (const step of plan.steps) {
    if (step.status !== 'pending') continue

    const unmetDeps = step.dependencies.filter(depId => !completedStepIds.has(depId))
    if (unmetDeps.length > 0) {
      // Check if dependencies are failed (blocker) vs just pending (waiting)
      const failedDeps = unmetDeps.filter(depId => {
        const depStep = plan.steps.find(s => s.id === depId)
        return depStep?.status === 'failed'
      })
      if (failedDeps.length > 0) {
        blockers.push({
          stepId: step.id,
          reason: `Dependencies failed: ${failedDeps.join(', ')}`,
        })
      }
    } else {
      nextExecutableSteps.push(step.id)
    }
  }

  // Estimate remaining cost
  const remainingSteps = totalSteps - completedSteps
  const estimatedRemainingCost = estimatePlanCost({
    ...plan,
    steps: plan.steps.filter(s => s.status !== 'completed'),
  })

  return {
    planId,
    progressPercent,
    completedSteps,
    totalSteps,
    blockers,
    nextExecutableSteps,
    estimatedRemainingCost: {
      tokens: estimatedRemainingCost.estimatedInputTokens + estimatedRemainingCost.estimatedOutputTokens,
      usd: estimatedRemainingCost.estimatedCostUsd,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// adaptPlan — AI-powered plan adaptation based on new information
// ──────────────────────────────────────────────────────────────

export async function adaptPlan(
  planId: string,
  newInformation: string,
  agentContext?: AgentContext
): Promise<AgentPlan | null> {
  const supabase = await createClient()

  const { data: planRow } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!planRow) return null

  const currentPlan = rowToPlan(planRow as AgentPlanRow)

  const stepsSummary = currentPlan.steps.map((s, i) =>
    `Step ${i + 1} [${s.status}]: ${s.description} (action: ${s.action})`
  ).join('\n')

  const prompt = `Adapt the following execution plan based on new information:

Goal: ${currentPlan.goal}

Current Plan:
${stepsSummary}

New Information: ${newInformation}

Determine how the plan should be adapted:
1. Should any pending steps be modified? If so, provide updated descriptions and actions.
2. Should new steps be added? If so, specify where they should be inserted.
3. Should any steps be removed or skipped?
4. Update dependencies if the order changes.

Respond as JSON: { "steps": [{ "description": "...", "action": "...", "dependencies": [0] }] }
Include ALL steps (completed ones unchanged, pending ones possibly modified, and any new ones).`

  const response = await executeStructuredAI<GeneratedPlan>(
    {
      prompt,
      systemPrompt: 'You are an adaptive planning system. Modify plans based on new information while preserving completed work. Respond with valid JSON only.',
      userId: agentContext?.userId ?? 'system',
      schoolId: agentContext?.schoolId ?? null,
      temperature: 0.4,
      maxTokens: 2048,
    },
    (raw) => {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        steps: Array.isArray(d.steps)
          ? d.steps.map((s: Record<string, unknown>) => ({
              description: String(s.description ?? ''),
              action: String(s.action ?? 'unknown'),
              dependencies: Array.isArray(s.dependencies) ? s.dependencies.map(Number) : [],
            }))
          : [],
      }
    }
  )

  // Rebuild steps, preserving completed ones
  const completedSteps = currentPlan.steps.filter(s => s.status === 'completed')
  const newPendingSteps: AgentPlanStep[] = response.parsed.steps.map((step, index) => ({
    id: `${planId}-adapted-step-${index}`,
    description: step.description,
    action: step.action,
    dependencies: step.dependencies.map(depIndex => `${planId}-adapted-step-${depIndex}`),
    status: 'pending' as PlanStepStatus,
    result: null,
  }))

  const adaptedSteps = [...completedSteps, ...newPendingSteps]

  await supabase
    .from('agent_plans')
    .update({
      steps: adaptedSteps as unknown as Record<string, unknown>[],
      status: 'adapted',
    })
    .eq('id', planId)

  return { ...currentPlan, steps: adaptedSteps, status: 'adapted' }
}

// ──────────────────────────────────────────────────────────────
// decomposeGoal — Break a goal into sub-goals
// ──────────────────────────────────────────────────────────────

export async function decomposeGoal(
  goal: string,
  agentContext?: AgentContext
): Promise<string[]> {
  const prompt = `Decompose the following goal into independent sub-goals that can be worked on separately or delegated to different agents:

Goal: ${goal}

Provide 2-5 sub-goals that together accomplish the main goal.
Each sub-goal should be specific, measurable, and actionable.

Respond as JSON: { "subGoals": ["sub-goal 1", "sub-goal 2", ...] }`

  const response = await executeStructuredAI<{ subGoals: string[] }>(
    {
      prompt,
      systemPrompt: 'You are a goal decomposition system. Break complex goals into independent, actionable sub-goals. Respond with valid JSON only.',
      userId: agentContext?.userId ?? 'system',
      schoolId: agentContext?.schoolId ?? null,
      temperature: 0.4,
      maxTokens: 1024,
    },
    (raw) => {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      return { subGoals: Array.isArray(d.subGoals) ? d.subGoals.map(String) : [goal] }
    }
  )

  return response.parsed.subGoals
}

// ──────────────────────────────────────────────────────────────
// estimatePlanCost — Token + USD cost estimate
// ──────────────────────────────────────────────────────────────

export function estimatePlanCost(plan: AgentPlan): CostEstimate {
  // Estimate based on step count and action types
  const baseInputTokens = 500 // Base context per step
  const baseOutputTokens = 300 // Expected output per step

  let totalInput = 0
  let totalOutput = 0

  for (const step of plan.steps) {
    if (step.status === 'completed') continue

    // AI-heavy actions cost more
    const actionLower = step.action.toLowerCase()
    if (actionLower.includes('ai') || actionLower.includes('generate') || actionLower.includes('analyze')) {
      totalInput += baseInputTokens * 3
      totalOutput += baseOutputTokens * 4
    } else if (actionLower.includes('query') || actionLower.includes('fetch') || actionLower.includes('database')) {
      totalInput += baseInputTokens
      totalOutput += baseOutputTokens
    } else if (actionLower.includes('notify') || actionLower.includes('send')) {
      totalInput += baseInputTokens * 0.5
      totalOutput += baseOutputTokens * 0.5
    } else {
      totalInput += baseInputTokens * 1.5
      totalOutput += baseOutputTokens * 2
    }
  }

  // Gemini 2.0 Flash pricing: ~$0.000075/1K input, ~$0.0003/1K output
  const estimatedCostUsd = (totalInput / 1000) * 0.000075 + (totalOutput / 1000) * 0.0003

  return {
    estimatedInputTokens: totalInput,
    estimatedOutputTokens: totalOutput,
    estimatedCostUsd,
    confidence: 0.7, // Moderate confidence for estimates
  }
}

// ──────────────────────────────────────────────────────────────
// getPlan — Retrieve a plan by ID
// ──────────────────────────────────────────────────────────────

export async function getPlan(planId: string): Promise<AgentPlan | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!data) return null
  return rowToPlan(data as AgentPlanRow)
}

// ──────────────────────────────────────────────────────────────
// Helper: Row to AgentPlan
// ──────────────────────────────────────────────────────────────

function rowToPlan(row: AgentPlanRow): AgentPlan {
  return {
    id: row.id,
    agentId: row.agent_id,
    goal: row.goal,
    steps: (row.steps as unknown as AgentPlanStep[]) ?? [],
    status: row.status as PlanStatus,
    createdAt: row.created_at,
  }
}
