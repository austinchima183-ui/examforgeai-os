// ============================================================================
// ExamForge AI Orchestration — Support Agent
// ============================================================================
// Autonomous support agent for: ticket classification, resolution suggestion,
// smart escalation, knowledge base generation, and satisfaction analysis.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { escalateToHuman } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface TicketInput {
  id: string
  subject: string
  description: string
  userId: string
  userRole: string
  createdAt: string
  attachments?: string[]
}

export interface ClassificationResult {
  category: string
  subcategory: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
  estimatedResolutionTime: string
  tags: string[]
  confidence: number
}

export interface ResolutionSuggestion {
  suggestedResolution: string
  steps: string[]
  relatedArticles: string[]
  similarTickets: string[]
  automatedFixAvailable: boolean
  automatedFixDescription: string | null
  confidence: number
}

export interface EscalationResult {
  escalated: boolean
  reason: string
  targetTeam: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  context: string
  suggestedResponse: string
}

export interface KnowledgeBaseArticle {
  title: string
  category: string
  content: string
  tags: string[]
  relatedIssues: string[]
  viewCount: number
}

export interface SatisfactionResult {
  overallScore: number // 0-100
  distribution: Array<{ range: string; count: number; percent: number }>
  trends: Array<{ period: string; score: number }>
  commonComplaints: string[]
  topPraise: string[]
  improvementAreas: Array<{ area: string; impact: 'low' | 'medium' | 'high'; suggestion: string }>
}

// ──────────────────────────────────────────────────────────────
// SupportAgent Class
// ──────────────────────────────────────────────────────────────

export class SupportAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── classifyTicket — Auto-classification ──

  async classifyTicket(ticket: TicketInput): Promise<ClassificationResult> {
    const memories = await retrieveMemories(this.agentId, 'ticket classification patterns', 5)
    const memoryContext = memories.length > 0 ? `\n\nKnown classification patterns:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Classify this support ticket:

Subject: ${ticket.subject}
Description: ${ticket.description}
User Role: ${ticket.userRole}
Created: ${ticket.createdAt}
${memoryContext}

Categories to consider: technical, billing, account, academic, access, feature_request, bug_report, general
Subcategories are specific within each category.

Provide: category, subcategory, priority (low/medium/high/critical), sentiment (positive/neutral/negative/frustrated), estimatedResolutionTime, tags, confidence (0-1).
Respond as JSON.`

    const response = await executeStructuredAI<ClassificationResult>(
      {
        prompt,
        systemPrompt: 'You are a support ticket classification system. Accurately categorize tickets for efficient routing and resolution.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          category: d.category ?? 'general',
          subcategory: d.subcategory ?? 'unclassified',
          priority: d.priority ?? 'medium',
          sentiment: d.sentiment ?? 'neutral',
          estimatedResolutionTime: d.estimatedResolutionTime ?? '24 hours',
          tags: d.tags ?? [],
          confidence: Math.min(Math.max(d.confidence ?? 0.5, 0), 1),
        }
      }
    )

    await storeMemory(this.agentId, 'semantic', `Classification pattern: "${ticket.subject}" → ${response.parsed.category}/${response.parsed.subcategory} (${response.parsed.priority})`, 0.5, this.context)

    return response.parsed
  }

  // ── suggestResolution — AI resolution suggestion ──

  async suggestResolution(ticket: TicketInput): Promise<ResolutionSuggestion> {
    const supabase = await createClient()

    // Find similar resolved tickets
    const { data: similarTickets } = await supabase
      .from('support_tickets')
      .select('id, subject, resolution, category')
      .eq('status', 'resolved')
      .ilike('subject', `%${ticket.subject.substring(0, 30)}%`)
      .limit(5)

    const memories = await retrieveMemories(this.agentId, `resolution ${ticket.subject.substring(0, 30)}`, 5)
    const memoryContext = memories.length > 0 ? `\n\nPrevious resolution approaches:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Suggest a resolution for this support ticket:

Subject: ${ticket.subject}
Description: ${ticket.description}
User Role: ${ticket.userRole}
${similarTickets?.length ? `Similar resolved tickets:\n${similarTickets.map(t => `- "${t.subject}": ${t.resolution ?? 'No resolution recorded'}`).join('\n')}` : ''}
${memoryContext}

Provide: suggestedResolution, steps, relatedArticles, similarTickets, automatedFixAvailable (boolean), automatedFixDescription (if available), confidence (0-1).
Respond as JSON.`

    const response = await executeStructuredAI<ResolutionSuggestion>(
      {
        prompt,
        systemPrompt: 'You are a technical support resolution system. Provide clear, step-by-step solutions. Only suggest automated fixes when confident.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          suggestedResolution: d.suggestedResolution ?? '',
          steps: d.steps ?? [],
          relatedArticles: d.relatedArticles ?? [],
          similarTickets: d.similarTickets ?? [],
          automatedFixAvailable: d.automatedFixAvailable ?? false,
          automatedFixDescription: d.automatedFixDescription ?? null,
          confidence: Math.min(Math.max(d.confidence ?? 0.5, 0), 1),
        }
      }
    )

    return response.parsed
  }

  // ── escalateIfNeeded — Smart escalation ──

  async escalateIfNeeded(ticket: TicketInput & { classification?: ClassificationResult }): Promise<EscalationResult> {
    const classification = ticket.classification ?? await this.classifyTicket(ticket)

    // Determine if escalation is needed
    const shouldEscalate =
      classification.priority === 'critical' ||
      classification.sentiment === 'frustrated' ||
      classification.confidence < 0.4

    if (!shouldEscalate) {
      return {
        escalated: false,
        reason: 'Ticket can be handled at current support level',
        targetTeam: '',
        priority: classification.priority,
        context: '',
        suggestedResponse: '',
      }
    }

    let targetTeam = 'general_support'
    if (classification.category === 'billing' || classification.category === 'account') {
      targetTeam = 'billing_support'
    } else if (classification.category === 'technical' || classification.category === 'bug_report') {
      targetTeam = 'technical_support'
    } else if (classification.priority === 'critical') {
      targetTeam = 'management'
    }

    const prompt = `Determine escalation details for this ticket:

Subject: ${ticket.subject}
Description: ${ticket.description}
Classification: ${classification.category}/${classification.subcategory} (${classification.priority})
Sentiment: ${classification.sentiment}
User Role: ${ticket.userRole}

Provide: reason, context (for the escalation team), suggestedResponse (for the user while waiting).
Respond as JSON: { "reason": "...", "context": "...", "suggestedResponse": "..." }`

    const response = await executeStructuredAI<{ reason: string; context: string; suggestedResponse: string }>(
      {
        prompt,
        systemPrompt: 'You are a support escalation specialist. Provide clear context for the receiving team and a compassionate response for the user.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          reason: d.reason ?? 'Ticket requires escalation',
          context: d.context ?? ticket.description.substring(0, 200),
          suggestedResponse: d.suggestedResponse ?? 'Your ticket has been escalated to our specialist team. We will respond shortly.',
        }
      }
    )

    // Perform the escalation
    await escalateToHuman(
      this.agentId,
      `Support ticket escalation: ${ticket.subject} — ${response.parsed.reason}`,
      classification.priority === 'critical' ? 'critical' : 'high',
      this.context
    )

    await storeMemory(this.agentId, 'episodic', `Escalated ticket ${ticket.id}: ${response.parsed.reason}`, 0.8, this.context)

    return {
      escalated: true,
      reason: response.parsed.reason,
      targetTeam,
      priority: classification.priority,
      context: response.parsed.context,
      suggestedResponse: response.parsed.suggestedResponse,
    }
  }

  // ── generateKnowledgeBase — KB article generation ──

  async generateKnowledgeBase(issues: Array<{ subject: string; description: string; resolution: string; category: string }>): Promise<KnowledgeBaseArticle[]> {
    // Group by category
    const byCategory = new Map<string, typeof issues>()
    for (const issue of issues) {
      const cat = issue.category || 'general'
      const list = byCategory.get(cat) ?? []
      list.push(issue)
      byCategory.set(cat, list)
    }

    const articles: KnowledgeBaseArticle[] = []

    for (const [category, categoryIssues] of byCategory) {
      const prompt = `Generate a knowledge base article from these resolved support issues:

Category: ${category}
Issues:
${categoryIssues.slice(0, 10).map(i => `Q: ${i.subject}\nA: ${i.resolution}`).join('\n\n')}

Create a comprehensive, well-structured KB article with: title, category, content (with headings and steps), tags, relatedIssues.
Respond as JSON.`

      const response = await executeStructuredAI<KnowledgeBaseArticle>(
        {
          prompt,
          systemPrompt: 'You are a technical writer creating knowledge base articles. Make them clear, comprehensive, and easy to follow.',
          userId: this.context.userId,
          schoolId: this.context.schoolId,
          temperature: 0.4,
          maxTokens: 2048,
        },
        (raw) => {
          const d = typeof raw === 'string' ? JSON.parse(raw) : raw
          return {
            title: d.title ?? `KB: ${category}`,
            category: d.category ?? category,
            content: d.content ?? '',
            tags: d.tags ?? [category],
            relatedIssues: d.relatedIssues ?? [],
            viewCount: 0,
          }
        }
      )

      articles.push(response.parsed)
    }

    await storeMemory(this.agentId, 'episodic', `Generated ${articles.length} KB articles from ${issues.length} issues`, 0.5, this.context)

    return articles
  }

  // ── analyzeSatisfaction — CSAT analysis ──

  async analyzeSatisfaction(data: Array<{ ticketId: string; rating: number; feedback?: string; category: string; resolvedAt: string }>): Promise<SatisfactionResult> {
    const avgScore = data.length > 0 ? data.reduce((s, d) => s + d.rating, 0) / data.length * 20 : 50 // Convert 1-5 to 0-100

    const prompt = `Analyze customer satisfaction data:

Total Ratings: ${data.length}
Average Score: ${avgScore.toFixed(1)}/100
Category Distribution: ${Object.entries(data.reduce((acc, d) => { acc[d.category] = (acc[d.category] ?? 0) + 1; return acc }, {} as Record<string, number>)).map(([k, v]) => `${k}: ${v}`).join(', ')}

Sample Feedback:
${data.filter(d => d.feedback).slice(0, 10).map(d => `[${d.rating}/5] ${d.feedback}`).join('\n')}

Provide: overallScore (0-100), distribution, trends, commonComplaints, topPraise, improvementAreas (area, impact, suggestion).
Respond as JSON.`

    const response = await executeStructuredAI<SatisfactionResult>(
      {
        prompt,
        systemPrompt: 'You are a customer satisfaction analyst. Identify patterns and provide actionable improvement suggestions.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          overallScore: Math.min(Math.max(d.overallScore ?? avgScore, 0), 100),
          distribution: d.distribution ?? [],
          trends: d.trends ?? [],
          commonComplaints: d.commonComplaints ?? [],
          topPraise: d.topPraise ?? [],
          improvementAreas: d.improvementAreas ?? [],
        }
      }
    )

    return response.parsed
  }
}
