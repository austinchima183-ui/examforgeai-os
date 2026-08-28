// ============================================================================
// ExamForge AI Orchestration — Compliance Agent
// ============================================================================
// Autonomous compliance agent for: compliance auditing, data privacy checks,
// curriculum alignment validation, regulatory change monitoring,
// and compliance reporting.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { escalateToHuman } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AuditResult {
  compliant: boolean
  overallScore: number // 0-100
  categories: Array<{
    category: string
    score: number
    status: 'compliant' | 'partial' | 'non_compliant'
    findings: string[]
    remediationActions: string[]
  }>
  criticalFindings: string[]
  auditDate: string
}

export interface PrivacyCheckResult {
  compliant: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  findings: Array<{
    area: string
    issue: string
    regulation: string
    severity: 'low' | 'medium' | 'high'
    remediation: string
  }>
  dataInventory: Array<{ dataType: string; classification: string; retention: string; accessControl: string }>
}

export interface CurriculumAlignmentResult {
  aligned: boolean
  alignmentScore: number // 0-100
  subjects: Array<{
    subject: string
    coveragePercent: number
    missingStandards: string[]
    extraContent: string[]
    recommendations: string[]
  }>
  overallGaps: string[]
}

export interface RegulatoryChangeResult {
  changes: Array<{
    regulation: string
    description: string
    effectiveDate: string
    impactLevel: 'low' | 'medium' | 'high'
    requiredActions: string[]
    deadline: string
  }>
  newRegulations: number
  updatedRegulations: number
  urgentActions: string[]
}

export interface ComplianceReportResult {
  organizationId: string
  overallScore: number
  summary: string
  areasOfConcern: string[]
  areasOfCompliance: string[]
  actionItems: Array<{ action: string; priority: 'low' | 'medium' | 'high'; deadline: string; owner: string }>
  nextAuditDate: string
}

// ──────────────────────────────────────────────────────────────
// ComplianceAgent Class
// ──────────────────────────────────────────────────────────────

export class ComplianceAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── auditCompliance — Compliance audit ──

  async auditCompliance(orgId: string): Promise<AuditResult> {
    const supabase = await createClient()

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    const orgName = org?.name ?? orgId

    const memories = await retrieveMemories(this.agentId, 'compliance audit', 5)
    const memoryContext = memories.length > 0 ? `\n\nPrevious audit context:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Perform a comprehensive compliance audit for: ${orgName}

Areas to audit:
1. Data protection and privacy (GDPR, local data laws)
2. Curriculum standards alignment
3. Teacher certification and qualifications
4. Student safety and safeguarding
5. Financial reporting and transparency
6. Assessment integrity
7. Accessibility compliance
8. Record retention policies
${memoryContext}

For each category provide: score (0-100), status (compliant/partial/non_compliant), findings, remediationActions.
Also provide overall score and critical findings.
Respond as JSON.`

    const response = await executeStructuredAI<AuditResult>(
      {
        prompt,
        systemPrompt: 'You are a compliance auditor specializing in educational institutions. Be thorough but fair.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          compliant: d.compliant ?? false,
          overallScore: Math.min(Math.max(d.overallScore ?? 0, 0), 100),
          categories: d.categories ?? [],
          criticalFindings: d.criticalFindings ?? [],
          auditDate: new Date().toISOString().split('T')[0],
        }
      }
    )

    if (response.parsed.criticalFindings.length > 0) {
      await storeMemory(this.agentId, 'episodic', `Compliance audit: ${response.parsed.criticalFindings.length} critical findings for ${orgName}`, 0.95, this.context)
      await escalateToHuman(this.agentId, `Critical compliance findings for ${orgName}: ${response.parsed.criticalFindings.join('; ')}`, 'critical', this.context)
    } else {
      await storeMemory(this.agentId, 'episodic', `Compliance audit completed for ${orgName}: score=${response.parsed.overallScore}`, 0.7, this.context)
    }

    return response.parsed
  }

  // ── checkDataPrivacy — GDPR/privacy check ──

  async checkDataPrivacy(orgId: string): Promise<PrivacyCheckResult> {
    const prompt = `Perform a data privacy assessment for organization ${orgId}.

Check these areas:
1. Consent management — Are proper consent mechanisms in place?
2. Data minimization — Is only necessary data collected?
3. Right to erasure — Can data be deleted upon request?
4. Data portability — Can users export their data?
5. Breach notification — Is there a breach notification procedure?
6. Cross-border data transfer — Are transfers compliant?
7. Data retention — Are retention policies defined and followed?
8. Access controls — Are role-based access controls adequate?

For each finding provide: area, issue, regulation reference, severity, remediation.
Also provide data inventory with: dataType, classification (public/internal/confidential/restricted), retention policy, access control.
Respond as JSON.`

    const response = await executeStructuredAI<PrivacyCheckResult>(
      {
        prompt,
        systemPrompt: 'You are a data privacy specialist with expertise in GDPR, CCPA, and Nigerian NDPR. Assess compliance rigorously.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          compliant: d.compliant ?? true,
          riskLevel: d.riskLevel ?? 'low',
          findings: d.findings ?? [],
          dataInventory: d.dataInventory ?? [],
        }
      }
    )

    if (response.parsed.riskLevel === 'critical' || response.parsed.riskLevel === 'high') {
      await escalateToHuman(this.agentId, `Data privacy risk: ${response.parsed.riskLevel} — ${response.parsed.findings.filter(f => f.severity === 'high').map(f => f.issue).join('; ')}`, response.parsed.riskLevel === 'critical' ? 'critical' : 'high', this.context)
    }

    return response.parsed
  }

  // ── validateCurriculumAlignment — Curriculum compliance ──

  async validateCurriculumAlignment(schoolId: string): Promise<CurriculumAlignmentResult> {
    const supabase = await createClient()

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', schoolId)

    const prompt = `Validate curriculum alignment for school ${schoolId}:

Subjects: ${subjects?.map(s => s.name).join(', ') ?? 'None found'}

For each subject, assess:
1. Coverage of national curriculum standards (percentage)
2. Missing standards or topics
3. Extra content beyond requirements
4. Alignment recommendations

Provide: aligned (boolean), alignmentScore (0-100), subjects analysis, overallGaps.
Respond as JSON.`

    const response = await executeStructuredAI<CurriculumAlignmentResult>(
      {
        prompt,
        systemPrompt: 'You are a curriculum alignment specialist for Nigerian/WAEC/NECO/JAMB standards. Ensure thorough alignment checking.',
        userId: this.context.userId,
        schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          aligned: d.aligned ?? false,
          alignmentScore: Math.min(Math.max(d.alignmentScore ?? 0, 0), 100),
          subjects: d.subjects ?? [],
          overallGaps: d.overallGaps ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── monitorRegulatoryChanges — Regulatory change tracking ──

  async monitorRegulatoryChanges(region: string): Promise<RegulatoryChangeResult> {
    const memories = await retrieveMemories(this.agentId, `regulatory changes ${region}`, 5)
    const lastChecked = memories.length > 0 ? memories[0].content : 'No previous check'

    const prompt = `Monitor regulatory changes for region: ${region}

Last checked: ${lastChecked}

Identify any new or updated regulations affecting:
1. Education policy
2. Data privacy
3. Assessment requirements
4. Teacher certification
5. School accreditation
6. Financial reporting

For each change: regulation, description, effectiveDate, impactLevel, requiredActions, deadline.
Respond as JSON.`

    const response = await executeStructuredAI<RegulatoryChangeResult>(
      {
        prompt,
        systemPrompt: 'You are a regulatory monitoring system for educational institutions. Track policy changes and assess their impact.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          changes: d.changes ?? [],
          newRegulations: d.newRegulations ?? 0,
          updatedRegulations: d.updatedRegulations ?? 0,
          urgentActions: d.urgentActions ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'semantic', `Regulatory changes for ${region}: ${response.parsed.newRegulations} new, ${response.parsed.updatedRegulations} updated`, 0.8, this.context)

    if (response.parsed.urgentActions.length > 0) {
      await escalateToHuman(this.agentId, `Urgent regulatory actions required: ${response.parsed.urgentActions.join('; ')}`, 'high', this.context)
    }

    return response.parsed
  }

  // ── generateComplianceReport — Compliance report ──

  async generateComplianceReport(orgId: string): Promise<ComplianceReportResult> {
    const prompt = `Generate a comprehensive compliance report for organization ${orgId}.

Cover: data privacy, curriculum alignment, teacher certification, safety standards, financial compliance, accessibility, record retention.

Provide: overallScore (0-100), summary, areasOfConcern, areasOfCompliance, actionItems (with priority and deadline), nextAuditDate.
Respond as JSON.`

    const response = await executeStructuredAI<ComplianceReportResult>(
      {
        prompt,
        systemPrompt: 'You are a compliance reporting specialist. Produce clear, actionable compliance reports.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          organizationId: orgId,
          overallScore: Math.min(Math.max(d.overallScore ?? 0, 0), 100),
          summary: d.summary ?? '',
          areasOfConcern: d.areasOfConcern ?? [],
          areasOfCompliance: d.areasOfCompliance ?? [],
          actionItems: d.actionItems ?? [],
          nextAuditDate: d.nextAuditDate ?? new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated compliance report for ${orgId}: score=${response.parsed.overallScore}`, 0.7, this.context)

    return response.parsed
  }
}
