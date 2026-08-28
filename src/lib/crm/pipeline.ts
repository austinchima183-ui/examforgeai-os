// ============================================================================
// ExamForge AI — Pipeline Stages and Transitions
// ============================================================================

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface PipelineStage {
  id: LeadStage
  label: string
  description: string
  color: string
  order: number
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'new',
    label: 'New',
    description: 'Fresh lead, not yet contacted',
    color: 'bg-blue-500',
    order: 0,
  },
  {
    id: 'contacted',
    label: 'Contacted',
    description: 'Initial outreach has been made',
    color: 'bg-sky-500',
    order: 1,
  },
  {
    id: 'qualified',
    label: 'Qualified',
    description: 'Lead meets qualification criteria',
    color: 'bg-teal-500',
    order: 2,
  },
  {
    id: 'proposal',
    label: 'Proposal',
    description: 'Proposal or quote sent',
    color: 'bg-amber-500',
    order: 3,
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    description: 'Active negotiation in progress',
    color: 'bg-orange-500',
    order: 4,
  },
  {
    id: 'won',
    label: 'Won',
    description: 'Deal closed successfully',
    color: 'bg-green-500',
    order: 5,
  },
  {
    id: 'lost',
    label: 'Lost',
    description: 'Deal lost or lead disqualified',
    color: 'bg-red-500',
    order: 6,
  },
]

// Valid forward transitions for each stage
export const VALID_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ['contacted', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['negotiation', 'won', 'lost'],
  negotiation: ['won', 'lost'],
  won: [], // Terminal
  lost: ['new'], // Can re-activate
}

/**
 * Check if a transition from one stage to another is valid.
 */
export function isValidTransition(from: LeadStage, to: LeadStage): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

/**
 * Get the next valid stages from a given stage.
 */
export function getNextStages(currentStage: LeadStage): PipelineStage[] {
  const validNext = VALID_TRANSITIONS[currentStage]
  return PIPELINE_STAGES.filter((stage) => validNext.includes(stage.id))
}

/**
 * Get pipeline stage by ID.
 */
export function getStageById(id: LeadStage): PipelineStage | undefined {
  return PIPELINE_STAGES.find((stage) => stage.id === id)
}
