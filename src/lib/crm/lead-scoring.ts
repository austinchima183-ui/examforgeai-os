// ============================================================================
// ExamForge AI — Lead Scoring Engine
// ============================================================================
// Scores leads based on institution type, role, engagement, and source.
// Threshold: hot (70+), warm (40-69), cold (0-39)
// Max possible score is capped at 100.
// ============================================================================

import type { Lead } from '@/lib/supabase/marketing-types'

interface ScoringInput {
  institutionType?: string
  role?: string
  source?: string
  hasDemo?: boolean
  hasSubscription?: boolean
  formFills?: number
  pageViews?: number
  emailOpens?: number
}

const SCORE_CONFIG = {
  institution: {
    tertiary: 25,
    secondary: 20,
    training: 15,
    primary: 10,
    government: 30,
    other: 5,
  },
  role: {
    'vice_chancellor': 30,
    'dean': 25,
    'director': 25,
    'principal': 25,
    'head': 20,
    'it_director': 20,
    'admin': 15,
    'teacher': 10,
    'other': 5,
  },
  source: {
    organic: 15,
    referral: 20,
    direct: 12,
    social: 8,
    email: 10,
    paid: 8,
    partner: 18,
    other: 5,
  },
  engagement: {
    formFill: 5,
    demoBooked: 15,
    demoCompleted: 20,
    pageView: 1,
    emailOpen: 2,
    subscription: 8,
  },
}

export function calculateLeadScore(input: ScoringInput): number {
  let score = 0

  // Institution type scoring
  if (input.institutionType) {
    score += SCORE_CONFIG.institution[input.institutionType as keyof typeof SCORE_CONFIG.institution] || 5
  }

  // Role scoring
  if (input.role) {
    const normalizedRole = input.role.toLowerCase().replace(/[\s_-]+/g, '_')
    let roleScored = false
    // Check for keyword matches
    for (const [key, value] of Object.entries(SCORE_CONFIG.role)) {
      if (normalizedRole.includes(key)) {
        score += value
        roleScored = true
        break
      }
    }
    if (!roleScored) score += 5 // Default role score
  }

  // Source scoring
  if (input.source) {
    score += SCORE_CONFIG.source[input.source as keyof typeof SCORE_CONFIG.source] || 5
  }

  // Engagement scoring
  if (input.formFills) score += Math.min(input.formFills * SCORE_CONFIG.engagement.formFill, 25)
  if (input.hasDemo) score += SCORE_CONFIG.engagement.demoBooked
  if (input.hasSubscription) score += SCORE_CONFIG.engagement.subscription
  if (input.pageViews) score += Math.min(input.pageViews * SCORE_CONFIG.engagement.pageView, 15)
  if (input.emailOpens) score += Math.min(input.emailOpens * SCORE_CONFIG.engagement.emailOpen, 10)

  return Math.min(Math.round(score), 100)
}

export function getScoreTier(score: number): Lead['score_tier'] {
  if (score >= 70) return 'hot'
  if (score >= 40) return 'warm'
  return 'cold'
}

export const PIPELINE_STAGES = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

export function isValidStageTransition(from: PipelineStage, to: PipelineStage): boolean {
  const transitions: Record<string, string[]> = {
    new: ['contacted', 'lost'],
    contacted: ['qualified', 'lost'],
    qualified: ['proposal', 'lost'],
    proposal: ['negotiation', 'lost'],
    negotiation: ['won', 'lost'],
    won: [],
    lost: ['new'], // Can re-activate
  }
  return transitions[from]?.includes(to) || false
}
