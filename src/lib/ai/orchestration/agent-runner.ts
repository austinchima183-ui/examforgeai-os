// ============================================================================
// ExamForge AI Orchestration — Agent Execution Engine
// ============================================================================
// The core execution loop that powers autonomous agents:
// think → plan → execute → observe → adapt → repeat until goal met or limit
// Enforces guardrails, tracks token usage and cost, persists execution records.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories, consolidateMemories } from './agent-memory'
import { createPlan, getNextStep, updatePlanStep, evaluatePlanProgress, estimatePlanCost } from './agent-planner'
import { sendMessage, getMessages, requestDelegation, getPendingDelegations } from './agent-communicator'
import type {
  AgentConfig,
  AgentContext,
  AgentExecution,
  AgentExecutionResult,
  AgentPlan,
  AgentPlanStep,
  AgentState,
  AgentStats,
  AgentType,
  AgentCapability,
  GuardrailValidation,
  ExecutionStatus,
  PlanStepStatus,
} from './types'

// ──────────────────────────────────────────────────────────────
// Agent Registry — Maps agent types to their configs
// ──────────────────────────────────────────────────────────────

const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  teacher: 'You are an autonomous teaching agent. Plan and execute educational tasks including lesson planning, exam creation, student assessment, and intervention coordination.',
  principal: 'You are an autonomous school principal agent. Monitor school performance, allocate resources, coordinate interventions, and manage school operations.',
  admissions: 'You are an autonomous admissions agent. Process applications, forecast enrollment, optimize class composition, and manage the admissions pipeline.',
  finance: 'You are an autonomous finance agent. Monitor revenue, forecast finances, detect anomalies, optimize collections, and manage budget allocation.',
  government: 'You are an autonomous government/regulatory agent. Analyze district performance, monitor compliance, compare schools, and generate policy reports.',
  research: 'You are an autonomous research agent. Analyze trends, generate insights, compare performance, discover correlations, and produce research reports.',
  compliance: 'You are an autonomous compliance agent. Audit compliance, check data privacy, validate curriculum alignment, and monitor regulatory changes.',
  marketing: 'You are an autonomous marketing agent. Analyze campaigns, generate content, optimize SEO, segment audiences, and personalize messaging.',
  scheduling: 'You are an autonomous scheduling agent. Generate timetables, optimize schedules, resolve conflicts, suggest substitutes, and balance workloads.',
  support: 'You are an autonomous support agent. Classify tickets, suggest resolutions, escalate issues, generate knowledge base articles, and analyze satisfaction.',
}

// ──────────────────────────────────────────────────────────────
// AgentRunner Class
// ──────────────────────────────────────────────────────────────

export class AgentRunner {
  // ── executeAgent — Main execution loop ──

  async executeAgent(
    config: AgentConfig,
    goal: string,
    context: Record<string, unknown>,
    agentContext: AgentContext
  ): Promise<AgentExecutionResult> {
    const executionId = crypto.randomUUID()
    const startTime = Date.now()
    const errors: string[] = []
    let actionsTaken = 0
    let messagesSent = 0
    let delegationsCreated = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCostUsd = 0
    let currentState: AgentState = 'thinking'

    // Create execution record
    await this.createAgentExecutionRecord({
      id: executionId,
      agentId: agentContext.agentId,
      configId: config.id,
      goal,
      plan: null,
      memory: [],
      messages: [],
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      tokenUsage: { input: 0, output: 0 },
      costUsd: 0,
    })

    try {
      // ── PHASE 1: THINK — Retrieve memories and understand context ──
      currentState = 'thinking'
      const memories = await retrieveMemories(agentContext.agentId, goal, 10)
      const pendingMessages = await getMessages(agentContext.agentId, undefined, true)
      const pendingDelegations = await getPendingDelegations(agentContext.agentId)

      const thinkResult = await executeAI({
        prompt: `Analyze this goal and current context:

Goal: ${goal}
Agent Type: ${config.type}
Capabilities: ${config.capabilities.join(', ')}
Recent Memories: ${memories.slice(0, 5).map(m => m.content.substring(0, 100)).join('\n')}
Pending Messages: ${pendingMessages.length}
Pending Delegations: ${pendingDelegations.length}
Context: ${JSON.stringify(context).substring(0, 500)}

What should be the approach to achieve this goal? Be specific and actionable.`,
        systemPrompt: AGENT_SYSTEM_PROMPTS[config.type],
        userId: agentContext.userId,
        schoolId: agentContext.schoolId,
        model: config.model,
        maxTokens: Math.min(config.maxTokens, 2048),
        temperature: 0.5,
      })

      totalInputTokens += thinkResult.tokensInput ?? 0
      totalOutputTokens += thinkResult.tokensOutput ?? 0
      totalCostUsd += thinkResult.costUsd ?? 0
      actionsTaken++

      // Store the thinking as episodic memory
      await storeMemory(agentContext.agentId, 'episodic', `Thinking about: ${goal} — Approach: ${thinkResult.content.substring(0, 200)}`, 0.5, agentContext)

      // ── Validate guardrails after thinking ──
      const guardrailCheck = this.validateGuardrails(
        { actionsTaken, totalCostUsd, tokenUsage: { input: totalInputTokens, output: totalOutputTokens } },
        config.guardrails
      )
      if (!guardrailCheck.valid) {
        errors.push(`Guardrail violation: ${guardrailCheck.violations.join(', ')}`)
        if (guardrailCheck.requiresHumanApproval) {
          await this.createAgentExecutionRecord({
            id: executionId,
            agentId: agentContext.agentId,
            configId: config.id,
            goal,
            plan: null,
            memory: [],
            messages: [],
            status: 'paused',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            result: { status: 'paused', reason: 'Guardrail violation requires human approval', violations: guardrailCheck.violations },
            tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
            costUsd: totalCostUsd,
          })
          return {
            executionId,
            agentId: agentContext.agentId,
            success: false,
            goal,
            summary: `Execution paused: ${guardrailCheck.violations.join(', ')}`,
            actionsTaken,
            messagesSent,
            delegationsCreated,
            tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
            costUsd: totalCostUsd,
            durationMs: Date.now() - startTime,
            errors,
          }
        }
      }

      // ── PHASE 2: PLAN — Generate execution plan ──
      currentState = 'planning'
      const plan = await createPlan(agentContext.agentId, goal, context, agentContext)

      // ── PHASE 3: EXECUTE — Execute plan steps ──
      currentState = 'executing'
      let maxIterations = config.guardrails.maxActionsPerExecution
      let iteration = 0

      while (iteration < maxIterations) {
        const nextStep = await getNextStep(plan.id)
        if (!nextStep) break

        // Update step to in_progress
        await updatePlanStep(plan.id, nextStep.id, 'in_progress', null)

        try {
          const stepResult = await this.executeStep(nextStep, config, agentContext, context)
          await updatePlanStep(plan.id, nextStep.id, 'completed' as PlanStepStatus, stepResult)

          totalInputTokens += stepResult.tokensInput ?? 0
          totalOutputTokens += stepResult.tokensOutput ?? 0
          totalCostUsd += stepResult.costUsd ?? 0
          actionsTaken++
          messagesSent += stepResult.messagesSent ?? 0
          delegationsCreated += stepResult.delegationsCreated ?? 0
        } catch (stepError) {
          const errorMsg = stepError instanceof Error ? stepError.message : 'Step execution failed'
          errors.push(`Step ${nextStep.id}: ${errorMsg}`)
          await updatePlanStep(plan.id, nextStep.id, 'failed' as PlanStepStatus, { error: errorMsg })
        }

        iteration++

        // Check guardrails each iteration
        const iterationGuardrailCheck = this.validateGuardrails(
          { actionsTaken, totalCostUsd, tokenUsage: { input: totalInputTokens, output: totalOutputTokens } },
          config.guardrails
        )
        if (!iterationGuardrailCheck.valid) {
          errors.push(`Guardrail violation at iteration ${iteration}: ${iterationGuardrailCheck.violations.join(', ')}`)
          break
        }
      }

      // ── PHASE 4: OBSERVE — Evaluate progress ──
      const progress = await evaluatePlanProgress(plan.id)

      // ── PHASE 5: ADAPT — Adapt plan if not complete ──
      if (progress.progressPercent < 100 && progress.blockers.length > 0 && iteration < maxIterations) {
        currentState = 'thinking'
        const adaptObservation = `Plan is ${progress.progressPercent.toFixed(0)}% complete. Blockers: ${progress.blockers.map(b => b.reason).join(', ')}. Unexecuted steps: ${progress.nextExecutableSteps.length}`

        // Import adaptPlan dynamically to avoid circular dependency
        const { adaptPlan } = await import('./agent-planner')
        await adaptPlan(plan.id, adaptObservation, agentContext)
      }

      // ── Consolidate memories ──
      await consolidateMemories(agentContext.agentId)

      // ── Determine final status ──
      const finalProgress = await evaluatePlanProgress(plan.id)
      const success = finalProgress.progressPercent >= 80 && errors.length === 0

      // Update execution record
      await this.createAgentExecutionRecord({
        id: executionId,
        agentId: agentContext.agentId,
        configId: config.id,
        goal,
        plan,
        memory: [],
        messages: [],
        status: success ? 'completed' : 'failed',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        result: {
          progress: finalProgress.progressPercent,
          completedSteps: finalProgress.completedSteps,
          totalSteps: finalProgress.totalSteps,
        },
        tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
        costUsd: totalCostUsd,
      })

      return {
        executionId,
        agentId: agentContext.agentId,
        success,
        goal,
        summary: `${success ? 'Completed' : 'Partially completed'}: ${finalProgress.completedSteps}/${finalProgress.totalSteps} steps (${finalProgress.progressPercent.toFixed(0)}%). ${errors.length} error(s).`,
        actionsTaken,
        messagesSent,
        delegationsCreated,
        tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
        costUsd: totalCostUsd,
        durationMs: Date.now() - startTime,
        errors,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown execution error'
      errors.push(errorMsg)

      await this.createAgentExecutionRecord({
        id: executionId,
        agentId: agentContext.agentId,
        configId: config.id,
        goal,
        plan: null,
        memory: [],
        messages: [],
        status: 'failed',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        result: { error: errorMsg },
        tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
        costUsd: totalCostUsd,
      })

      return {
        executionId,
        agentId: agentContext.agentId,
        success: false,
        goal,
        summary: `Execution failed: ${errorMsg}`,
        actionsTaken,
        messagesSent,
        delegationsCreated,
        tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
        costUsd: totalCostUsd,
        durationMs: Date.now() - startTime,
        errors,
      }
    }
  }

  // ── executeStep — Execute a single plan step ──

  private async executeStep(
    step: AgentPlanStep,
    config: AgentConfig,
    agentContext: AgentContext,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown> & { tokensInput?: number; tokensOutput?: number; costUsd?: number; messagesSent?: number; delegationsCreated?: number }> {
    const action = step.action.toLowerCase()
    let messagesSent = 0
    let delegationsCreated = 0

    // Check if action is restricted
    if (config.guardrails.restrictedActions.includes(step.action)) {
      return { error: `Action "${step.action}" is restricted`, tokensInput: 0, tokensOutput: 0, costUsd: 0, messagesSent: 0, delegationsCreated: 0 }
    }

    // Delegate action
    if (action.includes('delegate')) {
      const delegation = await requestDelegation(
        agentContext.agentId,
        (context.targetAgentId as string) ?? 'unknown',
        step.description,
        undefined,
        agentContext
      )
      delegationsCreated = 1
      return { delegationId: delegation.id, status: delegation.status, tokensInput: 0, tokensOutput: 0, costUsd: 0, messagesSent: 0, delegationsCreated }
    }

    // Notify action
    if (action.includes('notify') || action.includes('send')) {
      const targetId = (context.targetAgentId as string) ?? (context.userId as string)
      await sendMessage(agentContext.agentId, targetId, 'notification', step.description, 'normal', agentContext)
      messagesSent = 1
      return { notified: targetId, tokensInput: 0, tokensOutput: 0, costUsd: 0, messagesSent, delegationsCreated: 0 }
    }

    // AI-based actions (generate, analyze, predict, assess, etc.)
    if (action.includes('ai') || action.includes('generate') || action.includes('analyze') || action.includes('predict') || action.includes('assess') || action.includes('create')) {
      const result = await executeAI({
        prompt: `Execute the following action as a ${config.type} agent:\n\n${step.description}\n\nContext: ${JSON.stringify(context).substring(0, 1000)}`,
        systemPrompt: AGENT_SYSTEM_PROMPTS[config.type],
        userId: agentContext.userId,
        schoolId: agentContext.schoolId,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      })

      await storeMemory(agentContext.agentId, 'episodic', `Executed: ${step.description.substring(0, 100)} — Result: ${result.content.substring(0, 100)}`, 0.5, agentContext)

      return {
        content: result.content,
        generationId: result.generationId,
        tokensInput: result.tokensInput ?? 0,
        tokensOutput: result.tokensOutput ?? 0,
        costUsd: result.costUsd ?? 0,
        messagesSent: 0,
        delegationsCreated: 0,
      }
    }

    // Database query actions
    if (action.includes('query') || action.includes('fetch') || action.includes('database')) {
      const supabase = await createClient()
      const table = (context.table as string) ?? 'profiles'
      const { data, error } = await supabase.from(table).select('*').limit(100)

      return {
        data: data ?? [],
        error: error?.message ?? null,
        tokensInput: 0,
        tokensOutput: 0,
        costUsd: 0,
        messagesSent: 0,
        delegationsCreated: 0,
      }
    }

    // Default: execute as AI instruction
    const result = await executeAI({
      prompt: `Execute step: ${step.description}\nAction: ${step.action}\nContext: ${JSON.stringify(context).substring(0, 500)}`,
      systemPrompt: AGENT_SYSTEM_PROMPTS[config.type],
      userId: agentContext.userId,
      schoolId: agentContext.schoolId,
      model: config.model,
      maxTokens: Math.min(config.maxTokens, 1024),
      temperature: config.temperature,
    })

    return {
      content: result.content,
      tokensInput: result.tokensInput ?? 0,
      tokensOutput: result.tokensOutput ?? 0,
      costUsd: result.costUsd ?? 0,
      messagesSent: 0,
      delegationsCreated: 0,
    }
  }

  // ── validateGuardrails — Enforce limits ──

  validateGuardrails(
    execution: { actionsTaken: number; totalCostUsd: number; tokenUsage: { input: number; output: number } },
    guardrails: AgentConfig['guardrails']
  ): GuardrailValidation {
    const violations: string[] = []

    if (execution.actionsTaken >= guardrails.maxActionsPerExecution) {
      violations.push(`Max actions exceeded: ${execution.actionsTaken}/${guardrails.maxActionsPerExecution}`)
    }

    if (execution.totalCostUsd >= guardrails.maxCostPerExecution) {
      violations.push(`Max cost exceeded: $${execution.totalCostUsd.toFixed(4)}/$${guardrails.maxCostPerExecution.toFixed(2)}`)
    }

    const requiresHumanApproval = execution.totalCostUsd >= guardrails.requireHumanApprovalAbove

    return {
      valid: violations.length === 0,
      violations,
      actionsRemaining: Math.max(0, guardrails.maxActionsPerExecution - execution.actionsTaken),
      costRemaining: Math.max(0, guardrails.maxCostPerExecution - execution.totalCostUsd),
      requiresHumanApproval,
    }
  }

  // ── selectAgentForTask — Agent selection ──

  async selectAgentForTask(
    task: string,
    availableAgents: AgentConfig[]
  ): Promise<AgentConfig | null> {
    if (availableAgents.length === 0) return null
    if (availableAgents.length === 1) return availableAgents[0]

    const response = await executeStructuredAI<{ selectedAgentIndex: number }>(
      {
        prompt: `Select the best agent for this task:

Task: ${task}

Available Agents:
${availableAgents.map((a, i) => `${i}. ${a.name} (${a.type}) — Capabilities: ${a.capabilities.join(', ')}`).join('\n')}

Select the agent index (0-based) that is best suited for this task.
Respond as JSON: { "selectedAgentIndex": 0 }`,
        systemPrompt: 'You are an agent routing system. Select the most appropriate agent based on capabilities and task requirements.',
        userId: 'system',
        temperature: 0.2,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return { selectedAgentIndex: Math.min(Math.max(d.selectedAgentIndex ?? 0, 0), availableAgents.length - 1) }
      }
    )

    return availableAgents[response.parsed.selectedAgentIndex] ?? availableAgents[0]
  }

  // ── createAgentExecutionRecord — Persist to DB ──

  async createAgentExecutionRecord(execution: AgentExecution): Promise<void> {
    const supabase = await createClient()

    await supabase.from('agent_executions').upsert({
      id: execution.id,
      agent_id: execution.agentId,
      config_id: execution.configId,
      goal: execution.goal,
      plan_id: execution.plan?.id ?? null,
      status: execution.status,
      started_at: execution.startedAt,
      completed_at: execution.completedAt,
      result: execution.result,
      tokens_input: execution.tokenUsage.input,
      tokens_output: execution.tokenUsage.output,
      cost_usd: execution.costUsd,
    }, { onConflict: 'id' })
  }

  // ── getAgentExecutionHistory — Execution history ──

  async getAgentExecutionHistory(agentId: string, limit: number = 20): Promise<AgentExecution[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_executions')
      .select('*')
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      configId: row.config_id,
      goal: row.goal,
      plan: null,
      memory: [],
      messages: [],
      status: row.status as ExecutionStatus,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      result: row.result,
      tokenUsage: { input: row.tokens_input ?? 0, output: row.tokens_output ?? 0 },
      costUsd: row.cost_usd ?? 0,
    }))
  }

  // ── getAgentStats — Performance statistics ──

  async getAgentStats(agentId: string): Promise<AgentStats> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_executions')
      .select('status, tokens_input, tokens_output, cost_usd, duration_ms, started_at')
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false })
      .limit(1000)

    if (error || !data || data.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        avgCostUsd: 0,
        totalCostUsd: 0,
        totalTokenUsage: { input: 0, output: 0 },
        lastExecutedAt: null,
        avgActionsPerExecution: 0,
        errorRate: 0,
      }
    }

    const rows = data
    const totalExecutions = rows.length
    const successfulExecutions = rows.filter(r => r.status === 'completed').length
    const failedExecutions = rows.filter(r => r.status === 'failed').length
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0
    const totalCostUsd = rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
    const avgCostUsd = totalCostUsd / totalExecutions
    const totalInput = rows.reduce((s, r) => s + (r.tokens_input ?? 0), 0)
    const totalOutput = rows.reduce((s, r) => s + (r.tokens_output ?? 0), 0)

    const durationsWithValues = rows.filter(r => r.duration_ms != null)
    const avgDurationMs = durationsWithValues.length > 0
      ? durationsWithValues.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / durationsWithValues.length
      : 0

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      avgDurationMs,
      avgCostUsd,
      totalCostUsd,
      totalTokenUsage: { input: totalInput, output: totalOutput },
      lastExecutedAt: rows[0]?.started_at ?? null,
      avgActionsPerExecution: 0, // Would need action count from execution records
      errorRate: totalExecutions > 0 ? failedExecutions / totalExecutions : 0,
    }
  }
}
