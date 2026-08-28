// ============================================================================
// ExamForge AI Orchestration — Scheduling Agent
// ============================================================================
// Autonomous scheduling agent for: timetable generation, schedule optimization,
// conflict resolution, substitute teacher suggestions, and workload balancing.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { sendMessage } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface TimetableConstraint {
  teachers: Array<{ id: string; name: string; subjects: string[]; maxHoursPerWeek: number; unavailableSlots: string[] }>
  classes: Array<{ id: string; name: string; subjectRequirements: Array<{ subject: string; hoursPerWeek: number }> }>
  rooms: Array<{ id: string; name: string; capacity: number; type: string }>
  timeSlots: Array<{ day: string; period: number; startTime: string; endTime: string }>
  fixedAssignments?: Array<{ teacherId: string; classId: string; subject: string; slot: string }>
}

export interface TimetableResult {
  assignments: Array<{ teacherId: string; teacherName: string; classId: string; className: string; subject: string; day: string; period: number; roomId: string }>
  qualityScore: number // 0-100
  conflicts: string[]
  unassigned: Array<{ classId: string; subject: string; hoursRemaining: number }>
}

export interface ScheduleOptimizationResult {
  originalScore: number
  optimizedScore: number
  changes: Array<{ type: 'move' | 'swap'; description: string; reason: string }>
  preferencesMet: number
  preferencesTotal: number
}

export interface ConflictResolutionResult {
  resolved: boolean
  resolutions: Array<{ conflict: string; resolution: string; affectedParties: string[] }>
  unresolvedConflicts: string[]
  requiresHumanDecision: boolean
}

export interface SubstituteResult {
  substitutes: Array<{ teacherId: string; teacherName: string; qualificationMatch: number; availability: string; preferences: string[] }>
  bestMatch: string | null
  coveragePlan: string
}

export interface WorkloadBalanceResult {
  currentWorkload: Array<{ teacherId: string; teacherName: string; hoursPerWeek: number; classCount: number; utilizationPercent: number }>
  imbalances: Array<{ teacherId: string; issue: string; severity: 'low' | 'medium' | 'high' }>
  recommendations: string[]
  balancedWorkload: Array<{ teacherId: string; suggestedHours: number; suggestedClasses: number }>
}

// ──────────────────────────────────────────────────────────────
// SchedulingAgent Class
// ──────────────────────────────────────────────────────────────

export class SchedulingAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── generateTimetable — AI timetable generation ──

  async generateTimetable(constraints: TimetableConstraint): Promise<TimetableResult> {
    const memories = await retrieveMemories(this.agentId, 'timetable generation', 3)
    const memoryContext = memories.length > 0 ? `\n\nPrevious scheduling experience:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Generate an optimal school timetable with these constraints:

Teachers: ${constraints.teachers.map(t => `${t.name} (${t.subjects.join('/')}, max ${t.maxHoursPerWeek}h/week, unavailable: ${t.unavailableSlots.join(', ') || 'none'})`).join('\n')}

Classes: ${constraints.classes.map(c => `${c.name}: ${c.subjectRequirements.map(s => `${s.subject}(${s.hoursPerWeek}h)`).join(', ')}`).join('\n')}

Rooms: ${constraints.rooms.map(r => `${r.name} (cap:${r.capacity}, type:${r.type})`).join(', ')}

Time Slots: ${constraints.timeSlots.map(s => `${s.day} P${s.period} (${s.startTime}-${s.endTime})`).join(', ')}

${constraints.fixedAssignments?.length ? `Fixed Assignments: ${constraints.fixedAssignments.map(a => `${a.teacherId}→${a.classId} ${a.subject} @${a.slot}`).join(', ')}` : ''}
${memoryContext}

Generate assignments maximizing: no teacher double-booking, no class double-booking, teacher preferences, room suitability.
Provide: assignments (teacherId, teacherName, classId, className, subject, day, period, roomId), qualityScore, conflicts, unassigned.
Respond as JSON.`

    const response = await executeStructuredAI<TimetableResult>(
      {
        prompt,
        systemPrompt: 'You are a school scheduling optimization system. Generate conflict-free timetables that maximize resource utilization and respect all constraints.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          assignments: d.assignments ?? [],
          qualityScore: Math.min(Math.max(d.qualityScore ?? 50, 0), 100),
          conflicts: d.conflicts ?? [],
          unassigned: d.unassigned ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated timetable: ${response.parsed.assignments.length} assignments, quality=${response.parsed.qualityScore}, conflicts=${response.parsed.conflicts.length}`, 0.7, this.context)

    return response.parsed
  }

  // ── optimizeSchedule — Schedule optimization ──

  async optimizeSchedule(
    currentSchedule: Array<{ teacherId: string; classId: string; subject: string; day: string; period: number }>,
    preferences: Array<{ teacherId: string; preferredSlots: string[]; avoidSlots: string[] }>
  ): Promise<ScheduleOptimizationResult> {
    const prompt = `Optimize this school schedule:

Current assignments: ${currentSchedule.length}
Teacher preferences:
${preferences.map(p => `Teacher ${p.teacherId}: prefers ${p.preferredSlots.join(',')}, avoids ${p.avoidSlots.join(',')}`).join('\n')}

Optimize for: teacher preferences, balanced daily loads, minimal room changes, adequate breaks.
Provide: originalScore, optimizedScore, changes (type, description, reason), preferencesMet, preferencesTotal.
Respond as JSON.`

    const response = await executeStructuredAI<ScheduleOptimizationResult>(
      {
        prompt,
        systemPrompt: 'You are a schedule optimization specialist. Improve timetables while respecting constraints and preferences.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          originalScore: d.originalScore ?? 50,
          optimizedScore: d.optimizedScore ?? 50,
          changes: d.changes ?? [],
          preferencesMet: d.preferencesMet ?? 0,
          preferencesTotal: d.preferencesTotal ?? preferences.length,
        }
      }
    )

    return response.parsed
  }

  // ── resolveConflicts — Conflict resolution ──

  async resolveConflicts(timetable: Array<{ teacherId: string; classId: string; subject: string; day: string; period: number; roomId?: string }>): Promise<ConflictResolutionResult> {
    // Detect conflicts: same teacher same slot, same class same slot, same room same slot
    const slotMap = new Map<string, Array<{ teacherId: string; classId: string; subject: string; roomId?: string }>>()

    for (const entry of timetable) {
      const key = `${entry.day}-${entry.period}`
      const entries = slotMap.get(key) ?? []
      entries.push({ teacherId: entry.teacherId, classId: entry.classId, subject: entry.subject, roomId: entry.roomId })
      slotMap.set(key, entries)
    }

    const detectedConflicts: string[] = []
    for (const [slot, entries] of slotMap) {
      const teacherIds = entries.map(e => e.teacherId)
      if (new Set(teacherIds).size < teacherIds.length) {
        detectedConflicts.push(`Teacher double-booking at ${slot}`)
      }
      const classIds = entries.map(e => e.classId)
      if (new Set(classIds).size < classIds.length) {
        detectedConflicts.push(`Class double-booking at ${slot}`)
      }
      const roomIds = entries.filter(e => e.roomId).map(e => e.roomId!)
      if (new Set(roomIds).size < roomIds.length) {
        detectedConflicts.push(`Room double-booking at ${slot}`)
      }
    }

    if (detectedConflicts.length === 0) {
      return { resolved: true, resolutions: [], unresolvedConflicts: [], requiresHumanDecision: false }
    }

    const prompt = `Resolve these scheduling conflicts:

${detectedConflicts.map(c => `- ${c}`).join('\n')}

Current timetable has ${timetable.length} assignments.
Provide resolutions that maintain coverage while eliminating conflicts.
For each: conflict, resolution, affectedParties.
Respond as JSON: { "resolved": true/false, "resolutions": [...], "unresolvedConflicts": [...], "requiresHumanDecision": true/false }`

    const response = await executeStructuredAI<ConflictResolutionResult>(
      {
        prompt,
        systemPrompt: 'You are a scheduling conflict resolution specialist. Find optimal resolutions that minimize disruption.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          resolved: d.resolved ?? false,
          resolutions: d.resolutions ?? [],
          unresolvedConflicts: d.unresolvedConflicts ?? [],
          requiresHumanDecision: d.requiresHumanDecision ?? false,
        }
      }
    )

    return response.parsed
  }

  // ── suggestSubstitutes — Substitute teacher suggestions ──

  async suggestSubstitutes(teacher: { id: string; name: string; subjects: string[]; classes: Array<{ classId: string; subject: string; day: string; period: number }> }, date: string): Promise<SubstituteResult> {
    const supabase = await createClient()

    const { data: availableTeachers } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('school_id', this.context.schoolId ?? '')
      .eq('role', 'teacher')
      .eq('is_active', true)
      .neq('id', teacher.id)

    const prompt = `Find substitute teachers for ${teacher.name} on ${date}:

Absent teacher subjects: ${teacher.subjects.join(', ')}
Classes needing coverage:
${teacher.classes.map(c => `- Class ${c.classId}: ${c.subject} on ${c.day} Period ${c.period}`).join('\n')}

Available teachers: ${availableTeachers?.map(t => t.full_name ?? t.id).join(', ') ?? 'None'}

For each substitute: teacherId, teacherName, qualificationMatch (0-1), availability, preferences.
Also provide bestMatch and overall coveragePlan.
Respond as JSON.`

    const response = await executeStructuredAI<SubstituteResult>(
      {
        prompt,
        systemPrompt: 'You are a substitute scheduling specialist. Find the best coverage options minimizing educational disruption.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          substitutes: d.substitutes ?? [],
          bestMatch: d.bestMatch ?? null,
          coveragePlan: d.coveragePlan ?? '',
        }
      }
    )

    return response.parsed
  }

  // ── balanceWorkload — Workload balancing ──

  async balanceWorkload(teachers: Array<{ id: string; name: string; hoursPerWeek: number; classCount: number; maxHours: number }>): Promise<WorkloadBalanceResult> {
    const avgHours = teachers.length > 0 ? teachers.reduce((s, t) => s + t.hoursPerWeek, 0) / teachers.length : 0

    const prompt = `Analyze and balance teacher workload:

${teachers.map(t => `${t.name}: ${t.hoursPerWeek}h/week (${t.classCount} classes), max ${t.maxHours}h`).join('\n')}

Average hours: ${avgHours.toFixed(1)}

Identify imbalances and provide: currentWorkload (with utilizationPercent), imbalances, recommendations, balancedWorkload (suggestedHours, suggestedClasses).
Respond as JSON.`

    const response = await executeStructuredAI<WorkloadBalanceResult>(
      {
        prompt,
        systemPrompt: 'You are a workload balancing specialist. Ensure fair distribution while respecting contractual limits.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          currentWorkload: d.currentWorkload ?? teachers.map(t => ({ teacherId: t.id, teacherName: t.name, hoursPerWeek: t.hoursPerWeek, classCount: t.classCount, utilizationPercent: t.maxHours > 0 ? (t.hoursPerWeek / t.maxHours) * 100 : 0 })),
          imbalances: d.imbalances ?? [],
          recommendations: d.recommendations ?? [],
          balancedWorkload: d.balancedWorkload ?? [],
        }
      }
    )

    return response.parsed
  }
}
