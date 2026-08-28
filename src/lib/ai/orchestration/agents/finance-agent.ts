// ============================================================================
// ExamForge AI Orchestration — Finance Agent
// ============================================================================
// Autonomous finance agent for: revenue monitoring, forecasting, anomaly/fraud
// detection, fee collection optimization, financial reporting, budget allocation,
// and refund processing.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { escalateToHuman } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface RevenueSummary {
  totalRevenue: number
  pendingPayments: number
  overdueAmount: number
  collectionRate: number
  monthlyBreakdown: Array<{ month: string; revenue: number; collected: number }>
}

export interface RevenueForecast {
  forecasts: Array<{ month: string; projectedRevenue: number; lowerBound: number; upperBound: number; confidence: number }>
  trend: 'growing' | 'stable' | 'declining'
  riskFactors: string[]
}

export interface AnomalyResult {
  anomalies: Array<{ transactionId: string; type: 'fraud_risk' | 'unusual_amount' | 'duplicate_suspect' | 'timing_anomaly'; description: string; severity: 'low' | 'medium' | 'high'; amount: number }>
  totalFlagged: number
  requiresInvestigation: boolean
}

export interface CollectionStrategy {
  strategies: Array<{ segment: string; approach: string; expectedRecovery: number; timeline: string }>
  totalExpectedRecovery: number
  automatedActions: string[]
  humanActions: string[]
}

export interface FinancialReport {
  summary: string
  revenue: { total: number; byCategory: Record<string, number> }
  expenses: { total: number; byCategory: Record<string, number> }
  netIncome: number
  ratios: { collectionRate: number; overdueRate: number; revenuePerStudent: number }
  recommendations: string[]
}

export interface BudgetAllocationResult {
  allocations: Array<{ category: string; currentAmount: number; recommendedAmount: number; justification: string }>
  totalBudget: number
  surplusDeficit: number
}

export interface RefundResult {
  approved: boolean
  amount: number
  reason: string
  processingTime: string
  conditions: string[]
}

// ──────────────────────────────────────────────────────────────
// FinanceAgent Class
// ──────────────────────────────────────────────────────────────

export class FinanceAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── monitorRevenue — Revenue tracking ──

  async monitorRevenue(schoolId: string): Promise<RevenueSummary> {
    const supabase = await createClient()

    const [paymentsResult, feeAssignmentsResult] = await Promise.all([
      supabase.from('transactions').select('amount, status, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('fee_assignments').select('amount_due, amount_paid, status').limit(1000),
    ])

    const payments = paymentsResult.data ?? []
    const feeAssignments = feeAssignmentsResult.data ?? []

    const totalRevenue = payments.filter(p => p.status === 'successful').reduce((sum, p) => sum + p.amount, 0)
    const pendingPayments = feeAssignments.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0)
    const overdueAmount = feeAssignments.filter(f => f.status === 'overdue').reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0)
    const totalDue = feeAssignments.reduce((sum, f) => sum + f.amount_due, 0)
    const collectionRate = totalDue > 0 ? payments.filter(p => p.status === 'successful').reduce((s, p) => s + p.amount, 0) / totalDue : 1

    // Monthly breakdown
    const monthlyBreakdown: Array<{ month: string; revenue: number; collected: number }> = []
    const monthlyMap = new Map<string, { revenue: number; collected: number }>()
    for (const payment of payments) {
      const month = payment.created_at.substring(0, 7)
      const current = monthlyMap.get(month) ?? { revenue: 0, collected: 0 }
      current.revenue += payment.amount
      if (payment.status === 'successful') current.collected += payment.amount
      monthlyMap.set(month, current)
    }
    for (const [month, data] of monthlyMap) {
      monthlyBreakdown.push({ month, ...data })
    }

    return {
      totalRevenue,
      pendingPayments,
      overdueAmount,
      collectionRate,
      monthlyBreakdown: monthlyBreakdown.slice(-12),
    }
  }

  // ── forecastRevenue — AI revenue forecast ──

  async forecastRevenue(historicalData: Array<{ month: string; revenue: number }>, months: number = 6): Promise<RevenueForecast> {
    const prompt = `Forecast school revenue for the next ${months} months:

Historical Data:
${historicalData.map(d => `${d.month}: ${d.revenue.toLocaleString()}`).join('\n')}

Provide: forecasts with projectedRevenue, lowerBound, upperBound, confidence; trend; riskFactors.
Respond as JSON.`

    const response = await executeStructuredAI<RevenueForecast>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Revenue Forecasting'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          forecasts: d.forecasts ?? [],
          trend: d.trend ?? 'stable',
          riskFactors: d.riskFactors ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── detectAnomalies — Fraud/anomaly detection ──

  async detectAnomalies(transactions: Array<{ id: string; amount: number; date: string; description: string; studentId?: string }>): Promise<AnomalyResult> {
    const avgAmount = transactions.length > 0 ? transactions.reduce((s, t) => s + t.amount, 0) / transactions.length : 0
    const stdDev = Math.sqrt(transactions.reduce((s, t) => s + Math.pow(t.amount - avgAmount, 2), 0) / Math.max(transactions.length, 1))

    const prompt = `Analyze these financial transactions for anomalies and fraud indicators:

Average Transaction: ${avgAmount.toFixed(2)}
Standard Deviation: ${stdDev.toFixed(2)}
Transactions:
${transactions.slice(0, 50).map(t => `ID: ${t.id}, Amount: ${t.amount}, Date: ${t.date}, Desc: ${t.description}`).join('\n')}

Identify: unusual amounts (>3 std dev), duplicate suspects, timing anomalies, fraud risks.
For each anomaly: transactionId, type, description, severity, amount.
Respond as JSON: { "anomalies": [...], "totalFlagged": 0, "requiresInvestigation": false }`

    const response = await executeStructuredAI<AnomalyResult>(
      {
        prompt,
        systemPrompt: 'You are a financial anomaly detection system. Identify suspicious patterns with high precision. Minimize false positives.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          anomalies: d.anomalies ?? [],
          totalFlagged: d.totalFlagged ?? 0,
          requiresInvestigation: d.requiresInvestigation ?? false,
        }
      }
    )

    if (response.parsed.requiresInvestigation) {
      await storeMemory(this.agentId, 'episodic', `Detected ${response.parsed.totalFlagged} anomalies requiring investigation`, 0.9, this.context)
      await escalateToHuman(this.agentId, `${response.parsed.totalFlagged} financial anomalies detected requiring investigation`, 'high', this.context)
    }

    return response.parsed
  }

  // ── optimizeFeeCollection — Collection strategy ──

  async optimizeFeeCollection(overdueFees: Array<{ studentId: string; amount: number; daysOverdue: number; previousAttempts: number }>): Promise<CollectionStrategy> {
    const prompt = `Optimize fee collection strategy for ${overdueFees.length} overdue accounts:

${overdueFees.slice(0, 30).map(f => `Student ${f.studentId}: ${f.amount} overdue, ${f.daysOverdue} days, ${f.previousAttempts} attempts`).join('\n')}

Segment accounts and provide: strategies per segment (approach, expectedRecovery, timeline), totalExpectedRecovery, automatedActions, humanActions.
Respond as JSON.`

    const response = await executeStructuredAI<CollectionStrategy>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Fee Collection'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          strategies: d.strategies ?? [],
          totalExpectedRecovery: d.totalExpectedRecovery ?? 0,
          automatedActions: d.automatedActions ?? [],
          humanActions: d.humanActions ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── generateFinancialReport — Financial reports ──

  async generateFinancialReport(period: string): Promise<FinancialReport> {
    const supabase = await createClient()
    const schoolId = this.context.schoolId ?? ''

    const { data: payments } = await supabase
      .from('transactions')
      .select('amount, status, created_at')
      .eq('school_id', schoolId)

    const totalRevenue = (payments ?? []).filter(p => p.status === 'successful').reduce((s, p) => s + p.amount, 0)

    const prompt = `Generate a financial report for period: ${period}
Total Revenue: ${totalRevenue.toLocaleString()}

Provide: summary, revenue (total, byCategory), expenses (total, byCategory), netIncome, ratios, recommendations.
Respond as JSON.`

    const response = await executeStructuredAI<FinancialReport>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Financial Report'),
        userId: this.context.userId,
        schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          summary: d.summary ?? '',
          revenue: d.revenue ?? { total: totalRevenue, byCategory: {} },
          expenses: d.expenses ?? { total: 0, byCategory: {} },
          netIncome: d.netIncome ?? totalRevenue,
          ratios: d.ratios ?? { collectionRate: 0, overdueRate: 0, revenuePerStudent: 0 },
          recommendations: d.recommendations ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── budgetAllocation — Budget optimization ──

  async budgetAllocation(proposals: Array<{ category: string; requested: number; justification: string }>, budget: number): Promise<BudgetAllocationResult> {
    const prompt = `Optimize budget allocation:

Total Budget: ${budget.toLocaleString()}
Proposals:
${proposals.map(p => `- ${p.category}: Requested ${p.requested.toLocaleString()} (${p.justification})`).join('\n')}

Provide optimal allocation that maximizes impact within budget. Include: allocations (category, currentAmount, recommendedAmount, justification), totalBudget, surplusDeficit.
Respond as JSON.`

    const response = await executeStructuredAI<BudgetAllocationResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Budget Allocation'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          allocations: d.allocations ?? [],
          totalBudget: d.totalBudget ?? budget,
          surplusDeficit: d.surplusDeficit ?? 0,
        }
      }
    )

    return response.parsed
  }

  // ── processRefund — Refund evaluation ──

  async processRefund(request: { amount: number; reason: string; studentId: string; paymentId: string }): Promise<RefundResult> {
    const guardrails = this.config.guardrails

    if (request.amount > guardrails.requireHumanApprovalAbove) {
      await escalateToHuman(this.agentId, `Refund request of $${request.amount.toFixed(2)} exceeds auto-approval threshold`, 'high', this.context)
      return {
        approved: false,
        amount: request.amount,
        reason: 'Requires human approval - amount exceeds threshold',
        processingTime: 'Pending manual review',
        conditions: ['Awaiting administrator approval'],
      }
    }

    const prompt = `Evaluate this refund request:

Amount: $${request.amount.toFixed(2)}
Reason: ${request.reason}
Student ID: ${request.studentId}
Payment ID: ${request.paymentId}

Determine: approved (boolean), amount, reason, processingTime, conditions.
Consider: refund policy, timing, amount reasonableness.
Respond as JSON.`

    const response = await executeStructuredAI<RefundResult>(
      {
        prompt,
        systemPrompt: 'You are a refund evaluation system. Be fair but protect against abuse.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          approved: d.approved ?? false,
          amount: d.amount ?? request.amount,
          reason: d.reason ?? '',
          processingTime: d.processingTime ?? '3-5 business days',
          conditions: d.conditions ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Processed refund: $${request.amount.toFixed(2)} for student ${request.studentId} - ${response.parsed.approved ? 'approved' : 'rejected'}`, 0.7, this.context)

    return response.parsed
  }
}
