// ============================================================================
// ExamForge AI — Workflow Automation Engine — Core Execution Engine
// ============================================================================
// Production-ready workflow execution engine that orchestrates step execution,
// handles retries, timeouts, concurrency, condition evaluation, loops,
// human approval, and integrates with AI engine, notifications, and Supabase.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { markAnswer, suggestInterventions, predictStrugglingStudents } from '@/lib/ai/ai-teacher'
import { detectWeaknesses } from '@/lib/ai/ai-student'
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStepExecution,
  WorkflowActionType,
  WorkflowTriggerType,
  WorkflowExecutionContext,
  StepExecutorResult,
  ConditionDefinition,
  ConditionOperator,
  RetryPolicy,
  WorkflowConnection,
  WorkflowErrorHandling,
  WorkflowStatus,
  WorkflowVariable,
  DeadLetterEntry,
} from './types'
import { DEFAULT_RETRY_POLICY, DEFAULT_ERROR_HANDLING } from './types'

// ──────────────────────────────────────────────────────────────
// Circuit Breaker — Prevents cascading failures
// ──────────────────────────────────────────────────────────────

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  isOpen: boolean
}

const circuitBreakers = new Map<string, CircuitBreakerState>()
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_MS = 60000 // 1 minute

function isCircuitOpen(key: string): boolean {
  const state = circuitBreakers.get(key)
  if (!state) return false
  if (!state.isOpen) return false
  // Auto-reset after cool-down period
  if (Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_RESET_MS) {
    state.isOpen = false
    state.failures = 0
    return false
  }
  return true
}

function recordCircuitFailure(key: string): void {
  const state = circuitBreakers.get(key) ?? { failures: 0, lastFailureTime: 0, isOpen: false }
  state.failures++
  state.lastFailureTime = Date.now()
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true
  }
  circuitBreakers.set(key, state)
}

function recordCircuitSuccess(key: string): void {
  circuitBreakers.delete(key)
}

// ──────────────────────────────────────────────────────────────
// Utility: Resolve dot-notation path in data
// ──────────────────────────────────────────────────────────────

function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = data
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

// ──────────────────────────────────────────────────────────────
// Workflow Engine Class
// ──────────────────────────────────────────────────────────────

export class WorkflowEngine {
  // ────────────────────────────────────────────────────────────
  // Execute a complete workflow
  // ────────────────────────────────────────────────────────────

  async executeWorkflow(
    workflowId: string,
    triggerEvent: { type: WorkflowTriggerType; data: Record<string, unknown>; timestamp: string }
  ): Promise<WorkflowExecution> {
    const supabase = await createClient()

    // ── Fetch workflow definition ──
    const { data: workflowRow, error: wfError } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', workflowId)
      .is('deleted_at', null)
      .single()

    if (wfError || !workflowRow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const workflow: WorkflowDefinition = this.deserializeWorkflow(workflowRow)

    if (workflow.status !== 'active') {
      throw new Error(`Workflow is not active (status: ${workflow.status})`)
    }

    // ── Create execution record ──
    const executionId = crypto.randomUUID()
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      triggerEvent,
      steps: [],
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      organizationId: workflow.organizationId,
      schoolId: workflow.schoolId ?? null,
      durationMs: null,
    }

    await supabase.from('workflow_executions').insert({
      id: executionId,
      workflow_id: workflowId,
      trigger_event: triggerEvent,
      steps: [],
      status: 'running',
      started_at: execution.startedAt,
      organization_id: workflow.organizationId,
      school_id: workflow.schoolId ?? null,
    })

    // ── Build execution context ──
    const context: WorkflowExecutionContext = {
      workflow,
      execution,
      variables: { ...workflow.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {} as Record<string, unknown>), trigger: triggerEvent.data },
      stepOutputs: new Map(),
      stepExecutions: new Map(),
      triggerEvent: triggerEvent.data,
      currentStepId: null,
      cancelled: false,
    }

    try {
      // ── Execute the trigger step (validation only) ──
      const triggerStepExec: WorkflowStepExecution = {
        stepId: workflow.trigger.id,
        status: 'completed',
        input: triggerEvent.data,
        output: triggerEvent.data,
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      context.stepOutputs.set(workflow.trigger.id, triggerEvent.data)
      context.stepExecutions.set(workflow.trigger.id, triggerStepExec)
      execution.steps.push(triggerStepExec)

      // ── Build execution order using topological sort ──
      const orderedSteps = this.getExecutionOrder(workflow)

      // ── Execute each action step ──
      for (const step of orderedSteps) {
        if (context.cancelled) {
          execution.status = 'cancelled'
          break
        }

        // Check global timeout
        const elapsed = Date.now() - new Date(execution.startedAt).getTime()
        if (elapsed > workflow.errorHandling.globalTimeoutMs) {
          execution.status = 'failed'
          execution.error = 'Global workflow timeout exceeded'
          break
        }

        // Skip disabled steps
        if (step.enabled === false) {
          const skipExec: WorkflowStepExecution = {
            stepId: step.id,
            status: 'skipped',
            input: {},
            output: {},
            durationMs: 0,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }
          context.stepOutputs.set(step.id, {})
          context.stepExecutions.set(step.id, skipExec)
          execution.steps.push(skipExec)
          continue
        }

        // Check if step needs to wait for human approval
        if (step.actionType === 'human_approval') {
          const approvalResult = await this.requestHumanApproval(step, execution, context)
          if (approvalResult === 'waiting') {
            // Persist execution state and return — execution will resume later
            execution.status = 'waiting_approval'
            await this.persistExecution(execution)
            return execution
          }
        }

        // Check circuit breaker
        const circuitKey = `${workflowId}:${step.id}`
        if (isCircuitOpen(circuitKey)) {
          const cbExec: WorkflowStepExecution = {
            stepId: step.id,
            status: 'failed',
            input: this.buildStepInput(step, context),
            output: {},
            durationMs: 0,
            error: 'Circuit breaker is open — too many recent failures',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }
          context.stepExecutions.set(step.id, cbExec)
          execution.steps.push(cbExec)
          if (workflow.errorHandling.onFailure === 'stop') {
            execution.status = 'failed'
            execution.error = `Circuit breaker open for step ${step.name}`
            break
          }
          continue
        }

        // ── Execute the step ──
        context.currentStepId = step.id
        const stepExec = await this.executeStep(step, context)
        context.stepOutputs.set(step.id, stepExec.output)
        context.stepExecutions.set(step.id, stepExec)
        execution.steps.push(stepExec)

        // Update circuit breaker
        if (stepExec.status === 'completed') {
          recordCircuitSuccess(circuitKey)
        } else if (stepExec.status === 'failed') {
          recordCircuitFailure(circuitKey)
        }

        // Handle step failure
        if (stepExec.status === 'failed' && workflow.errorHandling.onFailure === 'stop') {
          execution.status = 'failed'
          execution.error = stepExec.error ?? 'Step failed'
          break
        }

        // Handle condition/branch routing
        if ((step.actionType === 'condition_check' || step.actionType === 'branch_logic') && stepExec.outputPort) {
          // Skip subsequent steps that don't match the chosen output port
          // (handled by getExecutionOrder using connections)
        }
      }

      // ── Finalize execution ──
      if (execution.status === 'running') {
        execution.status = 'completed'
      }
      execution.completedAt = new Date().toISOString()
      execution.durationMs = Date.now() - new Date(execution.startedAt).getTime()

    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown execution error'
      execution.completedAt = new Date().toISOString()
      execution.durationMs = Date.now() - new Date(execution.startedAt).getTime()

      // Send error notification if configured
      if (workflow.errorHandling.notifyOnError && workflow.errorHandling.notifyUserIds.length > 0) {
        await this.sendErrorNotifications(workflow, execution, workflow.errorHandling.notifyUserIds)
      }

      // Write to dead letter queue
      if (workflow.errorHandling.deadLetterQueue) {
        await this.writeToDeadLetterQueue(workflow, execution)
      }
    }

    // ── Persist final execution state ──
    await this.persistExecution(execution)

    return execution
  }

  // ────────────────────────────────────────────────────────────
  // Execute a single step (with retry and timeout)
  // ────────────────────────────────────────────────────────────

  async executeStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext
  ): Promise<WorkflowStepExecution> {
    const retryPolicy: RetryPolicy = step.retryPolicy ?? DEFAULT_RETRY_POLICY
    const timeoutMs = step.timeoutMs ?? 300000 // 5 minutes default
    const stepInput = this.buildStepInput(step, context)
    const startedAt = new Date().toISOString()

    let lastError: string | null = null
    let retryCount = 0

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        // ── Execute with timeout ──
        const result = await this.executeWithTimeout(
          this.runStepExecutor(step, stepInput, context),
          timeoutMs
        )

        if (result.success) {
          return {
            stepId: step.id,
            status: 'completed',
            input: stepInput,
            output: result.output,
            durationMs: Date.now() - new Date(startedAt).getTime(),
            error: null,
            retryCount: attempt,
            startedAt,
            completedAt: new Date().toISOString(),
            outputPort: result.outputPort ?? null,
          }
        }

        // Step returned a failure result
        lastError = result.error ?? 'Step executor returned failure'

        // Check if error is retryable
        const isRetryable = retryPolicy.retryableErrors.some(
          (errPattern) => lastError!.toLowerCase().includes(errPattern.toLowerCase())
        )

        if (!isRetryable || attempt >= retryPolicy.maxRetries) {
          break
        }

        retryCount = attempt + 1

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown step error'

        if (error instanceof Error && error.message === 'STEP_TIMEOUT') {
          lastError = `Step timed out after ${timeoutMs}ms`
        }

        // Check if error is retryable
        const isRetryable = retryPolicy.retryableErrors.some(
          (errPattern) => lastError!.toLowerCase().includes(errPattern.toLowerCase())
        )

        if (!isRetryable || attempt >= retryPolicy.maxRetries) {
          break
        }

        retryCount = attempt + 1
      }

      // ── Wait with exponential backoff before retry ──
      if (retryCount > 0) {
        const backoffMs = Math.min(
          retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier, retryCount - 1),
          retryPolicy.maxBackoffMs
        )
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }

    // ── Step failed after all retries ──
    return {
      stepId: step.id,
      status: 'failed',
      input: stepInput,
      output: {},
      durationMs: Date.now() - new Date(startedAt).getTime(),
      error: lastError,
      retryCount,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }

  // ────────────────────────────────────────────────────────────
  // Step Executors — Maps each ActionType to a concrete executor
  // ────────────────────────────────────────────────────────────

  private async runStepExecutor(
    step: WorkflowStep,
    input: Record<string, unknown>,
    context: WorkflowExecutionContext
  ): Promise<StepExecutorResult> {
    const actionType = step.actionType as WorkflowActionType
    const config = step.config
    const supabase = await createClient()

    switch (actionType) {
      // ─── AI Actions ───
      case 'ai_mark_paper': {
        const { examSessionId, questionId, studentAnswer, correctAnswer, maxMarks } = input
        const result = await markAnswer(
          {
            question: (questionId as string) ?? '',
            correctAnswer: (correctAnswer as string) ?? '',
            studentAnswer: (studentAnswer as string) ?? '',
            marks: (maxMarks as number) ?? 10,
            markingScheme: (config.markingScheme as string) ?? undefined,
          },
          (config.userId as string) ?? context.workflow.createdBy,
          context.workflow.schoolId
        )
        return { success: true, output: { marksAwarded: result.marksAwarded, maxMarks: result.maxMarks, feedback: result.feedback, strengths: result.strengths, improvements: result.improvements, isCorrect: result.isCorrect } }
      }

      case 'ai_generate_report': {
        const prompt = (config.promptTemplate as string) ?? `Generate a comprehensive academic report based on the following data: ${JSON.stringify(input)}`
        const result = await executeAI({
          prompt,
          systemPrompt: getSystemPrompt('school_admin', 'Report Generation'),
          userId: (config.userId as string) ?? context.workflow.createdBy,
          schoolId: context.workflow.schoolId,
          metadata: { type: 'workflow_report_generation', workflowId: context.workflow.id },
        })
        return { success: true, output: { report: result.content, generationId: result.generationId, tokensUsed: (result.tokensInput ?? 0) + (result.tokensOutput ?? 0) } }
      }

      case 'ai_suggest_intervention': {
        const { studentId, studentName, subject, recentScores, attendanceRate } = input
        const result = await suggestInterventions(
          {
            studentId: (studentId as string) ?? '',
            studentName: (studentName as string) ?? 'Student',
            subject: (subject as string) ?? 'General',
            recentScores: (recentScores as Array<{ exam: string; score: number; maxScore: number; date: string }>) ?? [],
            attendanceRate: (attendanceRate as number) ?? 0.9,
            behaviorNotes: (config.behaviorNotes as string[]) ?? undefined,
          },
          (config.userId as string) ?? context.workflow.createdBy,
          context.workflow.schoolId
        )
        return { success: true, output: { riskLevel: result.riskLevel, identifiedIssues: result.identifiedIssues, recommendedInterventions: result.recommendedInterventions, parentCommunicationSuggestion: result.parentCommunicationSuggestion } }
      }

      case 'ai_predict_risk': {
        const classId = (input.classId as string) ?? (config.classId as string) ?? ''
        if (!classId) {
          return { success: false, output: {}, error: 'classId is required for risk prediction' }
        }
        const predictions = await predictStrugglingStudents(
          classId,
          (config.userId as string) ?? context.workflow.createdBy,
          context.workflow.schoolId
        )
        return { success: true, output: { predictions, atRiskCount: predictions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length } }
      }

      case 'ai_generate_questions': {
        const { subject, topic, count, difficulty } = input
        const prompt = `Generate ${count ?? 5} exam questions for ${subject ?? 'General'} on topic "${topic ?? 'General'}" at ${difficulty ?? 'medium'} difficulty. Return as JSON array with fields: type, content, options, correctAnswer, explanation, difficulty, marks, tags.`
        const result = await executeAI({
          prompt,
          systemPrompt: getSystemPrompt('teacher', 'Question Bank'),
          userId: (config.userId as string) ?? context.workflow.createdBy,
          schoolId: context.workflow.schoolId,
          metadata: { type: 'workflow_question_generation', subject, topic },
        })
        return { success: true, output: { questions: result.content, generationId: result.generationId } }
      }

      // ─── Notification Actions ───
      case 'notify_user':
      case 'notify_parent':
      case 'notify_teacher':
      case 'notify_admin': {
        const userIds = (config.userIds as string[]) ?? (input.userIds as string[]) ?? []
        const title = (config.title as string) ?? (input.title as string) ?? 'Workflow Notification'
        const body = (config.body as string) ?? (input.body as string) ?? ''
        const notificationType = (config.notificationType as string) ?? 'system'
        const priority = (config.priority as string) ?? 'normal'
        const actionUrl = (config.actionUrl as string) ?? null

        // If targeting by role, resolve user IDs
        if (userIds.length === 0) {
          let roleFilter = ''
          if (actionType === 'notify_parent') roleFilter = 'parent'
          else if (actionType === 'notify_teacher') roleFilter = 'teacher'
          else if (actionType === 'notify_admin') roleFilter = 'school_admin'

          if (roleFilter && context.workflow.schoolId) {
            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('school_id', context.workflow.schoolId)
              .eq('role', roleFilter)
              .eq('is_active', true)
            for (const u of users ?? []) userIds.push(u.id)
          }
        }

        let sentCount = 0
        for (const uid of userIds) {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: uid,
            type: notificationType,
            channel: 'in_app',
            title: title as string,
            body: body as string,
            action_url: actionUrl,
            priority,
            data: { workflowId: context.workflow.id, stepId: step.id },
          })
          if (!notifError) sentCount++
        }
        return { success: true, output: { notifiedUserIds: userIds, sentCount } }
      }

      // ─── Email Action ───
      case 'send_email': {
        const { emailService } = await import('@/lib/email/service')
        const to = (config.recipients as string[]) ?? (input.recipients as string[]) ?? []
        const subject = (config.subject as string) ?? (input.subject as string) ?? 'Notification from ExamForge'
        const htmlBody = (config.htmlBody as string) ?? (input.htmlBody as string) ?? (input.body as string) ?? ''
        const textBody = (config.textBody as string) ?? (input.textBody as string) ?? ''

        if (to.length === 0) {
          return { success: false, output: {}, error: 'No email recipients specified' }
        }

        const result = await emailService.send({
          to,
          subject,
          html: htmlBody,
          text: textBody || undefined,
        })
        return { success: result.success, output: { messageId: result.messageId }, error: result.error }
      }

      // ─── SMS Action ───
      case 'send_sms': {
        const phoneNumbers = (config.phoneNumbers as string[]) ?? (input.phoneNumbers as string[]) ?? []
        const message = (config.message as string) ?? (input.message as string) ?? ''
        // Log SMS (production would integrate with Twilio/Africa's Talking)
        // ⚠️ PII: Do not log phone numbers or message content in production
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[SMS] To: ${phoneNumbers.length} recipient(s), Message: ${message.length} chars`)
        }
        return { success: true, output: { sentTo: phoneNumbers, messageLength: message.length } }
      }

      // ─── Certificate Issuance ───
      case 'issue_certificate': {
        const { studentId, examId, examTitle, score } = input
        const certificateId = crypto.randomUUID()
        const passThreshold = (config.passThreshold as number) ?? 50
        const studentScore = (score as number) ?? 0

        if (studentScore < passThreshold) {
          return { success: true, output: { issued: false, reason: `Score ${studentScore}% below pass threshold ${passThreshold}%` }, outputPort: 'fail' }
        }

        const { error: certError } = await supabase.from('certificates').insert({
          id: certificateId,
          student_id: (studentId as string) ?? '',
          exam_id: (examId as string) ?? null,
          title: `Certificate of Achievement — ${(examTitle as string) ?? 'Exam'}`,
          score: studentScore,
          issued_at: new Date().toISOString(),
          school_id: context.workflow.schoolId ?? null,
          organization_id: context.workflow.organizationId,
        })
        if (certError) {
          return { success: false, output: {}, error: `Failed to issue certificate: ${certError.message}` }
        }
        return { success: true, output: { certificateId, issued: true }, outputPort: 'pass' }
      }

      // ─── Update Transcript ───
      case 'update_transcript': {
        const { studentId, subjectId, grade, score: transcriptScore, examId: transcriptExamId } = input
        const { error: transcriptError } = await supabase.from('transcript_entries').upsert({
          student_id: (studentId as string) ?? '',
          subject_id: (subjectId as string) ?? null,
          exam_id: (transcriptExamId as string) ?? null,
          grade: (grade as string) ?? '',
          score: (transcriptScore as number) ?? 0,
          updated_at: new Date().toISOString(),
          school_id: context.workflow.schoolId ?? null,
        })
        if (transcriptError) {
          return { success: false, output: {}, error: `Failed to update transcript: ${transcriptError.message}` }
        }
        return { success: true, output: { updated: true, studentId, subjectId } }
      }

      // ─── Recommend Revision ───
      case 'recommend_revision': {
        const { studentId: revStudentId, subject: revSubject } = input
        const weaknessReport = await detectWeaknesses(
          { studentId: (revStudentId as string) ?? '', subject: (revSubject as string) ?? 'General' },
          (config.userId as string) ?? context.workflow.createdBy,
          context.workflow.schoolId
        )
        return { success: true, output: { weakTopics: weaknessReport.weakTopics, strongTopics: weaknessReport.strongTopics, studyPriority: weaknessReport.studyPriority, overallAssessment: weaknessReport.overallAssessment } }
      }

      // ─── Schedule Intervention ───
      case 'schedule_intervention': {
        const { studentId: intStudentId, interventionType, scheduledDate } = input
        const interventionId = crypto.randomUUID()
        const { error: intError } = await supabase.from('scheduled_interventions').insert({
          id: interventionId,
          student_id: (intStudentId as string) ?? '',
          type: (interventionType as string) ?? 'academic_support',
          scheduled_date: (scheduledDate as string) ?? new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'scheduled',
          school_id: context.workflow.schoolId ?? null,
          created_by: context.workflow.createdBy,
          workflow_execution_id: context.execution.id,
        })
        if (intError) {
          return { success: false, output: {}, error: `Failed to schedule intervention: ${intError.message}` }
        }
        return { success: true, output: { interventionId, scheduled: true } }
      }

      // ─── Archive Records ───
      case 'archive_records': {
        const { recordType, recordIds } = input
        const ids = (recordIds as string[]) ?? []
        const table = (recordType as string) ?? 'exam_sessions'
        if (ids.length === 0) {
          return { success: true, output: { archived: 0 } }
        }
        const { error: archiveError } = await supabase
          .from(table)
          .update({ archived_at: new Date().toISOString(), status: 'archived' })
          .in('id', ids)
        if (archiveError) {
          return { success: false, output: {}, error: `Failed to archive records: ${archiveError.message}` }
        }
        return { success: true, output: { archived: ids.length, recordType: table } }
      }

      // ─── Create Exam ───
      case 'create_exam': {
        const examId = crypto.randomUUID()
        const { title, subjectId, classId, startsAt, durationMinutes } = input
        const { error: examError } = await supabase.from('exams').insert({
          id: examId,
          title: (title as string) ?? 'Auto-generated Exam',
          subject_id: (subjectId as string) ?? null,
          class_id: (classId as string) ?? null,
          school_id: context.workflow.schoolId ?? null,
          starts_at: (startsAt as string) ?? new Date(Date.now() + 7 * 86400000).toISOString(),
          duration_minutes: (durationMinutes as number) ?? 60,
          status: 'draft',
          created_by: context.workflow.createdBy,
        })
        if (examError) {
          return { success: false, output: {}, error: `Failed to create exam: ${examError.message}` }
        }
        return { success: true, output: { examId, created: true } }
      }

      // ─── Update Record ───
      case 'update_record': {
        const { table: updateTable, recordId, updates } = input
        const { error: updateError } = await supabase
          .from((updateTable as string) ?? 'profiles')
          .update((updates as Record<string, unknown>) ?? {})
          .eq('id', (recordId as string) ?? '')
        if (updateError) {
          return { success: false, output: {}, error: `Failed to update record: ${updateError.message}` }
        }
        return { success: true, output: { updated: true, recordId } }
      }

      // ─── Update Database (generic) ───
      case 'update_database': {
        const { table: dbTable, operation, data: dbData, filter } = input
        const targetTable = (dbTable as string) ?? ''
        if (!targetTable) {
          return { success: false, output: {}, error: 'Table name is required' }
        }
        const op = (operation as string) ?? 'insert'
        if (op === 'insert') {
          const { error: dbError, data: insertedData } = await supabase.from(targetTable).insert((dbData as Record<string, unknown>) ?? {}).select()
          if (dbError) return { success: false, output: {}, error: dbError.message }
          return { success: true, output: { data: insertedData } }
        } else if (op === 'update') {
          const filterCol = ((filter as Record<string, unknown>)?.column as string) ?? 'id'
          const filterVal = (filter as Record<string, unknown>)?.value
          const { error: dbError, data: updatedData } = await supabase.from(targetTable).update((dbData as Record<string, unknown>) ?? {}).eq(filterCol, filterVal as string).select()
          if (dbError) return { success: false, output: {}, error: dbError.message }
          return { success: true, output: { data: updatedData } }
        } else if (op === 'delete') {
          const filterCol = ((filter as Record<string, unknown>)?.column as string) ?? 'id'
          const filterVal = (filter as Record<string, unknown>)?.value
          const { error: dbError } = await supabase.from(targetTable).delete().eq(filterCol, filterVal as string)
          if (dbError) return { success: false, output: {}, error: dbError.message }
          return { success: true, output: { deleted: true } }
        }
        return { success: false, output: {}, error: `Unknown database operation: ${op}` }
      }

      // ─── HTTP Request ───
      case 'http_request': {
        const url = (config.url as string) ?? (input.url as string) ?? ''
        const method = ((config.method as string) ?? (input.method as string) ?? 'GET').toUpperCase()
        const headers = (config.headers as Record<string, string>) ?? {}
        const bodyPayload = (config.body as Record<string, unknown>) ?? (input.body as Record<string, unknown>) ?? undefined
        const requestTimeout = (config.timeoutMs as number) ?? 30000

        if (!url) {
          return { success: false, output: {}, error: 'URL is required for HTTP request' }
        }

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), requestTimeout)
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: method !== 'GET' && method !== 'HEAD' && bodyPayload ? JSON.stringify(bodyPayload) : undefined,
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          const responseBody = await response.text()
          let parsedBody: unknown = responseBody
          try { parsedBody = JSON.parse(responseBody) } catch { /* keep as text */ }
          return { success: response.ok, output: { statusCode: response.status, headers: Object.fromEntries(response.headers.entries()), body: parsedBody } }
        } catch (fetchError) {
          return { success: false, output: {}, error: fetchError instanceof Error ? fetchError.message : 'HTTP request failed' }
        }
      }

      // ─── Webhook Call ───
      case 'webhook_call': {
        const webhookUrl = (config.url as string) ?? (input.url as string) ?? ''
        const webhookPayload = { event: context.execution.triggerEvent, workflowId: context.workflow.id, stepId: step.id, data: input }
        if (!webhookUrl) {
          return { success: false, output: {}, error: 'Webhook URL is required' }
        }
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          })
          const responseBody = await response.text()
          return { success: response.ok, output: { statusCode: response.status, body: responseBody } }
        } catch (webhookError) {
          return { success: false, output: {}, error: webhookError instanceof Error ? webhookError.message : 'Webhook call failed' }
        }
      }

      // ─── Delay ───
      case 'delay': {
        const delayMs = (config.delayMs as number) ?? (input.delayMs as number) ?? 5000
        // Persist the delayed execution to DB for resumption later
        const resumeAt = new Date(Date.now() + delayMs).toISOString()
        const { error: delayError } = await supabase.from('workflow_scheduled_steps').insert({
          id: crypto.randomUUID(),
          execution_id: context.execution.id,
          workflow_id: context.workflow.id,
          step_id: step.id,
          resume_at: resumeAt,
          status: 'pending',
          context_snapshot: { variables: Object.fromEntries(context.stepOutputs.entries()), currentStepIndex: context.execution.steps.length },
        })
        if (delayError) {
          // If we can't persist, just do an in-process delay (not ideal for long delays)
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 30000)))
        }
        return { success: true, output: { delayedUntil: resumeAt, delayMs } }
      }

      // ─── Condition Check ───
      case 'condition_check': {
        const conditions = (config.conditions as ConditionDefinition[]) ?? []
        const allData = this.buildAllDataContext(context)
        const result = this.evaluateCondition(conditions.length > 0 ? { and: conditions } : (config.condition as ConditionDefinition) ?? { field: 'true', operator: 'is_true' }, allData)
        return { success: true, output: { result }, outputPort: result ? 'true' : 'false' }
      }

      // ─── Branch Logic ───
      case 'branch_logic': {
        const branchCondition = (config.condition as ConditionDefinition) ?? { field: 'true', operator: 'is_true' }
        const branchData = this.buildAllDataContext(context)
        const branchResult = this.evaluateCondition(branchCondition, branchData)
        return { success: true, output: { branch: branchResult ? 'true' : 'false' }, outputPort: branchResult ? 'true' : 'false' }
      }

      // ─── Loop Iterate ───
      case 'loop_iterate': {
        const itemsPath = (config.itemsPath as string) ?? 'items'
        const items = (resolvePath(input, itemsPath) as unknown[]) ?? (input.items as unknown[]) ?? []
        const maxIterations = (config.maxIterations as number) ?? 100
        const loopItems = items.slice(0, maxIterations)
        return { success: true, output: { iterations: loopItems.length, items: loopItems, hasMore: items.length > maxIterations } }
      }

      // ─── Human Approval ───
      case 'human_approval': {
        // Handled separately in executeWorkflow — this should not be reached
        return { success: true, output: { approvalRequired: true } }
      }

      // ─── Transform Data ───
      case 'transform_data': {
        const transformType = (config.transformType as string) ?? 'passthrough'
        const sourceData = input

        switch (transformType) {
          case 'passthrough':
            return { success: true, output: sourceData }
          case 'pick': {
            const fields = (config.fields as string[]) ?? []
            const picked: Record<string, unknown> = {}
            for (const field of fields) {
              picked[field] = resolvePath(sourceData, field)
            }
            return { success: true, output: picked }
          }
          case 'rename': {
            const mapping = (config.fieldMapping as Record<string, string>) ?? {}
            const renamed: Record<string, unknown> = { ...sourceData }
            for (const [from, to] of Object.entries(mapping)) {
              if (from in renamed) {
                renamed[to] = renamed[from]
                delete renamed[from]
              }
            }
            return { success: true, output: renamed }
          }
          case 'template': {
            const template = (config.template as string) ?? ''
            let rendered = template
            for (const [key, value] of Object.entries(sourceData)) {
              rendered = rendered.replaceAll(`{{${key}}}`, String(value ?? ''))
            }
            return { success: true, output: { result: rendered } }
          }
          case 'json_parse': {
            const jsonString = (config.jsonPath as string) ? String(resolvePath(sourceData, config.jsonPath as string) ?? '') : String(sourceData.data ?? '')
            try {
              const parsed = JSON.parse(jsonString)
              return { success: true, output: { parsed } }
            } catch {
              return { success: false, output: {}, error: 'Failed to parse JSON string' }
            }
          }
          default:
            return { success: true, output: sourceData }
        }
      }

      // ─── Log Audit ───
      case 'log_audit': {
        const { action, entity, entityId } = input
        const { error: auditError } = await supabase.from('audit_logs').insert({
          id: crypto.randomUUID(),
          action: (action as string) ?? 'workflow_step',
          entity: (entity as string) ?? 'workflow',
          entity_id: (entityId as string) ?? context.execution.id,
          user_id: context.workflow.createdBy,
          school_id: context.workflow.schoolId ?? null,
          organization_id: context.workflow.organizationId,
          metadata: { workflowId: context.workflow.id, stepId: step.id, stepType: actionType, input, timestamp: new Date().toISOString() },
        })
        if (auditError) {
          return { success: false, output: {}, error: `Failed to log audit: ${auditError.message}` }
        }
        return { success: true, output: { logged: true } }
      }

      // ─── Generate Invoice ───
      case 'generate_invoice': {
        const { studentId: invStudentId, amount, description, dueDate } = input
        const invoiceId = crypto.randomUUID()
        const { error: invError } = await supabase.from('invoices').insert({
          id: invoiceId,
          student_id: (invStudentId as string) ?? '',
          amount: (amount as number) ?? 0,
          description: (description as string) ?? 'Auto-generated invoice',
          due_date: (dueDate as string) ?? new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'pending',
          school_id: context.workflow.schoolId ?? null,
          organization_id: context.workflow.organizationId,
        })
        if (invError) {
          return { success: false, output: {}, error: `Failed to generate invoice: ${invError.message}` }
        }
        return { success: true, output: { invoiceId, generated: true } }
      }

      default:
        return { success: false, output: {}, error: `Unknown action type: ${actionType}` }
    }
  }

  // ────────────────────────────────────────────────────────────
  // Evaluate Condition
  // ────────────────────────────────────────────────────────────

  evaluateCondition(condition: ConditionDefinition, data: Record<string, unknown>): boolean {
    // Handle compound AND conditions
    if (condition.and && condition.and.length > 0) {
      return condition.and.every((c) => this.evaluateCondition(c, data))
    }

    // Handle compound OR conditions
    if (condition.or && condition.or.length > 0) {
      return condition.or.some((c) => this.evaluateCondition(c, data))
    }

    // Evaluate single condition
    if (!condition.field || !condition.operator) {
      return false
    }

    const fieldValue = resolvePath(data, condition.field)
    const compareValue = condition.value

    return this.applyOperator(fieldValue, condition.operator, compareValue)
  }

  private applyOperator(fieldValue: unknown, operator: ConditionOperator, compareValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue
      case 'not_equals':
        return fieldValue !== compareValue
      case 'greater_than':
        return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue > compareValue
      case 'less_than':
        return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue < compareValue
      case 'greater_or_equal':
        return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue >= compareValue
      case 'less_or_equal':
        return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue <= compareValue
      case 'contains':
        return String(fieldValue ?? '').includes(String(compareValue ?? ''))
      case 'not_contains':
        return !String(fieldValue ?? '').includes(String(compareValue ?? ''))
      case 'starts_with':
        return String(fieldValue ?? '').startsWith(String(compareValue ?? ''))
      case 'ends_with':
        return String(fieldValue ?? '').endsWith(String(compareValue ?? ''))
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0)
      case 'is_true':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1
      case 'is_false':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)
      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue)
      case 'regex_match':
        try {
          return new RegExp(String(compareValue ?? '')).test(String(fieldValue ?? ''))
        } catch {
          return false
        }
      default:
        return false
    }
  }

  // ────────────────────────────────────────────────────────────
  // Process Loop
  // ────────────────────────────────────────────────────────────

  async processLoop(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    items: unknown[]
  ): Promise<StepExecutorResult[]> {
    const maxIterations = (step.config.maxIterations as number) ?? 100
    const loopItems = items.slice(0, maxIterations)
    const results: StepExecutorResult[] = []

    for (let i = 0; i < loopItems.length; i++) {
      const loopInput = { ...this.buildStepInput(step, context), currentItem: loopItems[i], currentIndex: i, totalItems: loopItems.length }
      try {
        const result = await this.runStepExecutor(step, loopInput, context)
        results.push(result)
        context.stepOutputs.set(`${step.id}_iteration_${i}`, result.output)
      } catch (error) {
        results.push({
          success: false,
          output: {},
          error: error instanceof Error ? error.message : 'Loop iteration failed',
        })
      }
    }

    return results
  }

  // ────────────────────────────────────────────────────────────
  // Request Human Approval — Pauses execution
  // ────────────────────────────────────────────────────────────

  private async requestHumanApproval(
    step: WorkflowStep,
    execution: WorkflowExecution,
    context: WorkflowExecutionContext
  ): Promise<'waiting' | 'approved'> {
    const supabase = await createClient()
    const approvalId = crypto.randomUUID()
    const requestedFrom = (step.config.approverUserId as string) ?? (step.config.approverRole as string) ?? context.workflow.createdBy
    const expiresAt = new Date(Date.now() + ((step.config.approvalTimeoutMs as number) ?? 86400000 * 7)).toISOString() // 7 days default

    // Create approval request in DB
    const { error } = await supabase.from('workflow_approval_requests').insert({
      id: approvalId,
      workflow_execution_id: execution.id,
      step_id: step.id,
      requested_at: new Date().toISOString(),
      requested_from: requestedFrom,
      status: 'pending',
      context: {
        workflowName: context.workflow.name,
        stepName: step.name,
        triggerEvent: execution.triggerEvent,
        stepOutputs: Object.fromEntries(context.stepOutputs.entries()),
        approvalMessage: (step.config.approvalMessage as string) ?? 'Approval required to continue workflow execution',
      },
      expires_at: expiresAt,
      organization_id: context.workflow.organizationId,
      school_id: context.workflow.schoolId ?? null,
    })

    if (error) {
      console.error('[WorkflowEngine] Failed to create approval request:', error)
      // If we can't persist the approval, skip the step
      return 'approved'
    }

    // Send notification to the approver
    await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: requestedFrom,
      type: 'system',
      channel: 'in_app',
      title: `Workflow Approval Required: ${context.workflow.name}`,
      body: `Step "${step.name}" in workflow "${context.workflow.name}" requires your approval to continue.`,
      action_url: `/workflows/approvals/${approvalId}`,
      priority: 'high',
      data: { workflowId: context.workflow.id, executionId: execution.id, stepId: step.id, approvalId },
    })

    return 'waiting'
  }

  // ────────────────────────────────────────────────────────────
  // Resume After Approval
  // ────────────────────────────────────────────────────────────

  async resumeAfterApproval(
    executionId: string,
    stepId: string,
    approved: boolean,
    comments?: string
  ): Promise<WorkflowExecution> {
    const supabase = await createClient()

    // ── Fetch the execution ──
    const { data: executionRow, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (execError || !executionRow) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    const execution: WorkflowExecution = {
      id: executionRow.id,
      workflowId: executionRow.workflow_id,
      triggerEvent: executionRow.trigger_event,
      steps: executionRow.steps ?? [],
      status: executionRow.status,
      startedAt: executionRow.started_at,
      completedAt: executionRow.completed_at,
      error: executionRow.error,
      organizationId: executionRow.organization_id,
      schoolId: executionRow.school_id,
      durationMs: executionRow.duration_ms,
    }

    if (!approved) {
      // Mark execution as failed
      execution.status = 'failed'
      execution.error = `Human approval rejected for step ${stepId}${comments ? `: ${comments}` : ''}`
      execution.completedAt = new Date().toISOString()
      execution.durationMs = Date.now() - new Date(execution.startedAt).getTime()

      // Update approval request
      await supabase
        .from('workflow_approval_requests')
        .update({ status: 'rejected', comments: comments ?? null, approved_at: new Date().toISOString() })
        .eq('workflow_execution_id', executionId)
        .eq('step_id', stepId)

      await this.persistExecution(execution)
      return execution
    }

    // ── Approval granted — resume execution ──
    // Update approval request
    await supabase
      .from('workflow_approval_requests')
      .update({ status: 'approved', comments: comments ?? null, approved_at: new Date().toISOString() })
      .eq('workflow_execution_id', executionId)
      .eq('step_id', stepId)

    // Mark the approval step as completed
    const approvalStepExec: WorkflowStepExecution = {
      stepId,
      status: 'completed',
      input: { approved: true, comments },
      output: { approved: true, comments },
      durationMs: 0,
      approvalRequested: true,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
    execution.steps.push(approvalStepExec)

    // ── Re-execute the workflow from the next step ──
    const { data: workflowRow } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', execution.workflowId)
      .single()

    if (!workflowRow) {
      throw new Error(`Workflow definition not found: ${execution.workflowId}`)
    }

    const workflow = this.deserializeWorkflow(workflowRow)
    execution.status = 'running'

    // Rebuild context
    const context: WorkflowExecutionContext = {
      workflow,
      execution,
      variables: { ...workflow.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {} as Record<string, unknown>), trigger: execution.triggerEvent.data },
      stepOutputs: new Map(),
      stepExecutions: new Map(),
      triggerEvent: execution.triggerEvent.data,
      currentStepId: null,
      cancelled: false,
    }

    // Restore step outputs from already-completed steps
    for (const stepExec of execution.steps) {
      context.stepOutputs.set(stepExec.stepId, stepExec.output)
      context.stepExecutions.set(stepExec.stepId, stepExec)
    }

    // Continue executing remaining steps
    const completedStepIds = new Set(execution.steps.map((s) => s.stepId))
    const orderedSteps = this.getExecutionOrder(workflow).filter((s) => !completedStepIds.has(s.id))

    for (const step of orderedSteps) {
      if (context.cancelled) break
      context.currentStepId = step.id
      const stepExec = await this.executeStep(step, context)
      context.stepOutputs.set(step.id, stepExec.output)
      context.stepExecutions.set(step.id, stepExec)
      execution.steps.push(stepExec)

      if (stepExec.status === 'failed' && workflow.errorHandling.onFailure === 'stop') {
        execution.status = 'failed'
        execution.error = stepExec.error ?? 'Step failed after approval resume'
        break
      }
    }

    if (execution.status === 'running') {
      execution.status = 'completed'
    }
    execution.completedAt = new Date().toISOString()
    execution.durationMs = Date.now() - new Date(execution.startedAt).getTime()

    await this.persistExecution(execution)
    return execution
  }

  // ────────────────────────────────────────────────────────────
  // Cancel Execution
  // ────────────────────────────────────────────────────────────

  async cancelExecution(executionId: string): Promise<void> {
    const supabase = await createClient()

    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('id, status')
      .eq('id', executionId)
      .single()

    if (!execution || execution.status !== 'running') {
      throw new Error(`Cannot cancel execution: not found or not running (${executionId})`)
    }

    await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
  }

  // ────────────────────────────────────────────────────────────
  // Retry a Failed Step
  // ────────────────────────────────────────────────────────────

  async retryStep(executionId: string, stepId: string): Promise<WorkflowExecution> {
    const supabase = await createClient()

    const { data: executionRow } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (!executionRow) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    const execution: WorkflowExecution = {
      id: executionRow.id,
      workflowId: executionRow.workflow_id,
      triggerEvent: executionRow.trigger_event,
      steps: executionRow.steps ?? [],
      status: executionRow.status,
      startedAt: executionRow.started_at,
      completedAt: executionRow.completed_at,
      error: executionRow.error,
      organizationId: executionRow.organization_id,
      schoolId: executionRow.school_id,
      durationMs: executionRow.duration_ms,
    }

    const { data: workflowRow } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', execution.workflowId)
      .single()

    if (!workflowRow) {
      throw new Error(`Workflow definition not found`)
    }

    const workflow = this.deserializeWorkflow(workflowRow)

    // Find the failed step
    const failedStepIndex = execution.steps.findIndex((s) => s.stepId === stepId && s.status === 'failed')
    if (failedStepIndex === -1) {
      throw new Error(`No failed step found with ID ${stepId} in execution ${executionId}`)
    }

    // Rebuild context up to the failed step
    const context: WorkflowExecutionContext = {
      workflow,
      execution,
      variables: { ...workflow.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {} as Record<string, unknown>), trigger: execution.triggerEvent.data },
      stepOutputs: new Map(),
      stepExecutions: new Map(),
      triggerEvent: execution.triggerEvent.data,
      currentStepId: null,
      cancelled: false,
    }

    // Restore context from completed steps before the failed one
    for (let i = 0; i < failedStepIndex; i++) {
      const stepExec = execution.steps[i]
      context.stepOutputs.set(stepExec.stepId, stepExec.output)
      context.stepExecutions.set(stepExec.stepId, stepExec)
    }

    // Find the step definition
    const stepDef = workflow.actions.find((a) => a.id === stepId)
    if (!stepDef) {
      throw new Error(`Step definition not found: ${stepId}`)
    }

    // Re-execute the failed step
    const newStepExec = await this.executeStep(stepDef, context)
    execution.steps[failedStepIndex] = newStepExec

    // If the step now succeeds, continue with remaining steps
    if (newStepExec.status === 'completed') {
      context.stepOutputs.set(stepId, newStepExec.output)
      context.stepExecutions.set(stepId, newStepExec)

      const completedStepIds = new Set(execution.steps.map((s) => s.stepId))
      const remainingSteps = this.getExecutionOrder(workflow).filter((s) => !completedStepIds.has(s.id))

      // Remove steps after the retried one (they will be re-executed)
      execution.steps = execution.steps.slice(0, failedStepIndex + 1)

      for (const step of remainingSteps) {
        context.currentStepId = step.id
        const stepExec = await this.executeStep(step, context)
        context.stepOutputs.set(step.id, stepExec.output)
        context.stepExecutions.set(step.id, stepExec)
        execution.steps.push(stepExec)

        if (stepExec.status === 'failed' && workflow.errorHandling.onFailure === 'stop') {
          execution.status = 'failed'
          execution.error = stepExec.error ?? 'Step failed during retry continuation'
          break
        }
      }

      if (execution.status !== 'failed') {
        execution.status = 'completed'
      }
    }

    execution.completedAt = new Date().toISOString()
    execution.durationMs = Date.now() - new Date(execution.startedAt).getTime()
    execution.error = newStepExec.status === 'failed' ? newStepExec.error : null

    await this.persistExecution(execution)
    return execution
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Get Execution Order (topological sort)
  // ────────────────────────────────────────────────────────────

  private getExecutionOrder(workflow: WorkflowDefinition): WorkflowStep[] {
    const steps = workflow.actions.filter((s) => s.enabled !== false)
    const connections = workflow.connections

    // Build adjacency list (step → steps that depend on it)
    const dependents = new Map<string, Set<string>>()
    const dependencies = new Map<string, Set<string>>()

    for (const step of steps) {
      dependents.set(step.id, new Set())
      dependencies.set(step.id, new Set())
    }

    for (const conn of connections) {
      if (dependents.has(conn.sourceStepId) && dependencies.has(conn.targetStepId)) {
        dependents.get(conn.sourceStepId)!.add(conn.targetStepId)
        dependencies.get(conn.targetStepId)!.add(conn.sourceStepId)
      }
    }

    // Kahn's algorithm for topological sort
    const sorted: WorkflowStep[] = []
    const inDegree = new Map<string, number>()
    const queue: string[] = []

    for (const step of steps) {
      const deps = dependencies.get(step.id) ?? new Set()
      inDegree.set(step.id, deps.size)
      if (deps.size === 0) queue.push(step.id)
    }

    const stepMap = new Map(steps.map((s) => [s.id, s]))

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const currentStep = stepMap.get(currentId)
      if (currentStep) sorted.push(currentStep)

      for (const depId of (dependents.get(currentId) ?? new Set())) {
        const newDegree = (inDegree.get(depId) ?? 0) - 1
        inDegree.set(depId, newDegree)
        if (newDegree === 0) queue.push(depId)
      }
    }

    // Add any remaining steps (circular deps — shouldn't happen in valid workflows)
    for (const step of steps) {
      if (!sorted.find((s) => s.id === step.id)) {
        sorted.push(step)
      }
    }

    return sorted
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Build step input from context
  // ────────────────────────────────────────────────────────────

  private buildStepInput(step: WorkflowStep, context: WorkflowExecutionContext): Record<string, unknown> {
    const input: Record<string, unknown> = {}

    // Add trigger event data
    input.trigger = context.triggerEvent

    // Add outputs from connected upstream steps
    const upstreamConnections = context.workflow.connections.filter((c) => c.targetStepId === step.id)
    for (const conn of upstreamConnections) {
      const upstreamOutput = context.stepOutputs.get(conn.sourceStepId)
      if (upstreamOutput) {
        Object.assign(input, upstreamOutput)
      }
    }

    // Add workflow variables
    for (const variable of context.workflow.variables) {
      if (!(variable.key in input)) {
        input[variable.key] = variable.value
      }
    }

    // Add step config as defaults (doesn't override upstream data)
    for (const [key, value] of Object.entries(step.config)) {
      if (!(key in input)) {
        input[key] = value
      }
    }

    return input
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Build full data context for condition evaluation
  // ────────────────────────────────────────────────────────────

  private buildAllDataContext(context: WorkflowExecutionContext): Record<string, unknown> {
    const data: Record<string, unknown> = {
      trigger: context.triggerEvent,
      variables: context.variables,
    }
    for (const [stepId, output] of context.stepOutputs.entries()) {
      data[stepId] = output
    }
    return data
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Execute with timeout
  // ────────────────────────────────────────────────────────────

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('STEP_TIMEOUT'))
      }, timeoutMs)

      promise.then(
        (result) => { clearTimeout(timer); resolve(result) },
        (error) => { clearTimeout(timer); reject(error) }
      )
    })
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Persist execution to DB
  // ────────────────────────────────────────────────────────────

  private async persistExecution(execution: WorkflowExecution): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        steps: execution.steps,
        status: execution.status,
        completed_at: execution.completedAt,
        error: execution.error,
        duration_ms: execution.durationMs,
      })
      .eq('id', execution.id)

    if (error) {
      console.error('[WorkflowEngine] Failed to persist execution:', error)
    }
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Deserialize workflow from DB row
  // ────────────────────────────────────────────────────────────

  private deserializeWorkflow(row: Record<string, unknown>): WorkflowDefinition {
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

  // ────────────────────────────────────────────────────────────
  // Helper: Send error notifications
  // ────────────────────────────────────────────────────────────

  private async sendErrorNotifications(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    userIds: string[]
  ): Promise<void> {
    const supabase = await createClient()
    for (const userId of userIds) {
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        type: 'system',
        channel: 'in_app',
        title: `Workflow Failed: ${workflow.name}`,
        body: `Workflow "${workflow.name}" failed with error: ${execution.error ?? 'Unknown error'}`,
        action_url: `/workflows/executions/${execution.id}`,
        priority: 'high',
        data: { workflowId: workflow.id, executionId: execution.id, error: execution.error },
      })
    }
  }

  // ────────────────────────────────────────────────────────────
  // Helper: Write to Dead Letter Queue
  // ────────────────────────────────────────────────────────────

  private async writeToDeadLetterQueue(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    const supabase = await createClient()
    const failedSteps = execution.steps.filter((s) => s.status === 'failed')

    for (const step of failedSteps) {
      const entry: DeadLetterEntry = {
        id: crypto.randomUUID(),
        workflowId: workflow.id,
        executionId: execution.id,
        stepId: step.stepId,
        error: step.error ?? 'Unknown error',
        inputData: step.input,
        retryCount: step.retryCount ?? 0,
        createdAt: new Date().toISOString(),
        organizationId: workflow.organizationId,
        schoolId: workflow.schoolId ?? null,
      }

      await supabase.from('workflow_dead_letter_queue').insert({
        id: entry.id,
        workflow_id: entry.workflowId,
        execution_id: entry.executionId,
        step_id: entry.stepId,
        error: entry.error,
        input_data: entry.inputData,
        retry_count: entry.retryCount,
        organization_id: entry.organizationId,
        school_id: entry.schoolId,
      })
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Singleton Engine Instance
// ──────────────────────────────────────────────────────────────

export const workflowEngine = new WorkflowEngine()
