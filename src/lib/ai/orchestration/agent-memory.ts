// ============================================================================
// ExamForge AI Orchestration — Agent Memory System
// ============================================================================
// Persistent memory system for autonomous agents with:
// - Episodic memory (events/experiences)
// - Semantic memory (facts/knowledge)
// - Procedural memory (procedures/capabilities)
// - Auto-importance scoring, LRU access tracking, consolidation, pruning
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import type { AgentMemory, MemoryType, AgentContext } from './types'

// ──────────────────────────────────────────────────────────────
// Supabase table row shape for agent_memories
// ──────────────────────────────────────────────────────────────

interface AgentMemoryRow {
  id: string
  agent_id: string
  type: string
  content: string
  embedding: number[] | null
  importance: number
  accessed_at: string
  created_at: string
}

function rowToMemory(row: AgentMemoryRow): AgentMemory {
  return {
    id: row.id,
    agentId: row.agent_id,
    type: row.type as MemoryType,
    content: row.content,
    embedding: row.embedding,
    importance: row.importance,
    accessedAt: row.accessed_at,
    createdAt: row.created_at,
  }
}

// ──────────────────────────────────────────────────────────────
// Auto-Importance Scoring
// ──────────────────────────────────────────────────────────────

function computeAutoImportance(type: MemoryType, content: string, explicitImportance?: number): number {
  if (explicitImportance !== undefined) {
    return Math.min(Math.max(explicitImportance, 0), 1)
  }

  // Heuristic scoring based on content characteristics
  let score = 0.5 // baseline

  // Longer content tends to be more important
  const lengthFactor = Math.min(content.length / 500, 1) * 0.15
  score += lengthFactor

  // Type-based adjustments
  if (type === 'episodic') score += 0.1 // Events are important
  if (type === 'semantic') score += 0.05 // Knowledge is somewhat important

  // Keywords that indicate high importance
  const highImportanceKeywords = [
    'critical', 'urgent', 'failing', 'at-risk', 'intervention',
    'dropout', 'emergency', 'compliance', 'violation', 'anomaly',
    'fraud', 'overdue', 'declining', 'below',
  ]
  const lowerContent = content.toLowerCase()
  const keywordMatches = highImportanceKeywords.filter(kw => lowerContent.includes(kw)).length
  score += Math.min(keywordMatches * 0.08, 0.25)

  return Math.min(Math.max(score, 0), 1)
}

// ──────────────────────────────────────────────────────────────
// storeMemory — Store a new memory with auto-importance scoring
// ──────────────────────────────────────────────────────────────

export async function storeMemory(
  agentId: string,
  type: MemoryType,
  content: string,
  importance?: number,
  context?: AgentContext
): Promise<AgentMemory> {
  const supabase = await createClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const scoredImportance = computeAutoImportance(type, content, importance)

  const { data, error } = await supabase
    .from('agent_memories')
    .insert({
      id,
      agent_id: agentId,
      type,
      content,
      embedding: null, // Embedding generation would be done asynchronously
      importance: scoredImportance,
      accessed_at: now,
      created_at: now,
      organization_id: context?.organizationId ?? null,
      school_id: context?.schoolId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    // Fallback: return in-memory representation if DB insert fails
    return {
      id,
      agentId,
      type,
      content,
      embedding: null,
      importance: scoredImportance,
      accessedAt: now,
      createdAt: now,
    }
  }

  return rowToMemory(data as AgentMemoryRow)
}

// ──────────────────────────────────────────────────────────────
// retrieveMemories — Relevance-based retrieval
// ──────────────────────────────────────────────────────────────

export async function retrieveMemories(
  agentId: string,
  query: string,
  limit: number = 10
): Promise<AgentMemory[]> {
  const supabase = await createClient()

  // Fetch recent + important memories for the agent
  const { data, error } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .order('importance', { ascending: false })
    .limit(limit * 3) // Over-fetch for relevance filtering

  if (error || !data) return []

  const memories = (data as AgentMemoryRow[]).map(rowToMemory)

  // Simple keyword-based relevance scoring (production would use embeddings)
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)
  const scored = memories.map(memory => {
    const contentLower = memory.content.toLowerCase()
    const matchCount = queryTerms.filter(term => contentLower.includes(term)).length
    const relevanceScore = queryTerms.length > 0 ? matchCount / queryTerms.length : 0
    const recencyScore = Math.max(0, 1 - (Date.now() - new Date(memory.accessedAt).getTime()) / (30 * 86400000))
    const combinedScore = relevanceScore * 0.6 + memory.importance * 0.25 + recencyScore * 0.15
    return { memory, score: combinedScore }
  })

  scored.sort((a, b) => b.score - a.score)

  // Update access timestamps for returned memories (fire-and-forget)
  const topMemories = scored.slice(0, limit).map(s => s.memory)
  for (const memory of topMemories) {
    updateMemoryAccess(memory.id).catch(() => {})
  }

  return topMemories
}

// ──────────────────────────────────────────────────────────────
// updateMemoryAccess — Update access timestamp (LRU)
// ──────────────────────────────────────────────────────────────

export async function updateMemoryAccess(memoryId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('agent_memories')
    .update({ accessed_at: new Date().toISOString() })
    .eq('id', memoryId)
}

// ──────────────────────────────────────────────────────────────
// consolidateMemories — Merge similar memories, prune old low-importance
// ──────────────────────────────────────────────────────────────

export async function consolidateMemories(agentId: string): Promise<{ merged: number; pruned: number }> {
  const supabase = await createClient()
  let merged = 0
  let pruned = 0

  // Fetch all memories for the agent
  const { data: allMemories } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (!allMemories || allMemories.length === 0) return { merged: 0, pruned: 0 }

  const memories = (allMemories as AgentMemoryRow[]).map(rowToMemory)

  // ── Prune old low-importance memories ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  for (const memory of memories) {
    if (memory.importance < 0.3 && memory.createdAt < thirtyDaysAgo) {
      const { error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('id', memory.id)
      if (!error) pruned++
    }
  }

  // ── Merge similar episodic memories ──
  const episodicMemories = memories.filter(m => m.type === 'episodic')
  const mergedIds = new Set<string>()

  for (let i = 0; i < episodicMemories.length; i++) {
    if (mergedIds.has(episodicMemories[i].id)) continue
    for (let j = i + 1; j < episodicMemories.length; j++) {
      if (mergedIds.has(episodicMemories[j].id)) continue

      const a = episodicMemories[i]
      const b = episodicMemories[j]

      // Simple similarity: shared significant words
      const wordsA = new Set(a.content.toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const wordsB = new Set(b.content.toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
      const union = new Set([...wordsA, ...wordsB])
      const similarity = union.size > 0 ? intersection.size / union.size : 0

      if (similarity > 0.6) {
        // Merge: keep the more important one, append content from the other
        const keep = a.importance >= b.importance ? a : b
        const discard = a.importance >= b.importance ? b : a

        const mergedContent = `${keep.content}\n\nRelated: ${discard.content.substring(0, 200)}`
        const mergedImportance = Math.min(Math.max((keep.importance + discard.importance) / 2 + 0.05, 0), 1)

        await supabase
          .from('agent_memories')
          .update({
            content: mergedContent,
            importance: mergedImportance,
          })
          .eq('id', keep.id)

        await supabase
          .from('agent_memories')
          .delete()
          .eq('id', discard.id)

        mergedIds.add(discard.id)
        merged++
      }
    }
  }

  return { merged, pruned }
}

// ──────────────────────────────────────────────────────────────
// getEpisodicMemory — Get events from a time range
// ──────────────────────────────────────────────────────────────

export async function getEpisodicMemory(
  agentId: string,
  timeRange: { start: string; end: string }
): Promise<AgentMemory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .eq('type', 'episodic')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as AgentMemoryRow[]).map(rowToMemory)
}

// ──────────────────────────────────────────────────────────────
// getSemanticMemory — Get knowledge about a topic
// ──────────────────────────────────────────────────────────────

export async function getSemanticMemory(
  agentId: string,
  topic: string
): Promise<AgentMemory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .eq('type', 'semantic')
    .order('importance', { ascending: false })
    .limit(20)

  if (error || !data) return []

  const memories = (data as AgentMemoryRow[]).map(rowToMemory)

  // Filter by topic relevance
  const topicLower = topic.toLowerCase()
  return memories.filter(m =>
    m.content.toLowerCase().includes(topicLower) ||
    m.importance >= 0.7
  )
}

// ──────────────────────────────────────────────────────────────
// getProceduralMemory — Get procedures for a capability
// ──────────────────────────────────────────────────────────────

export async function getProceduralMemory(
  agentId: string,
  capability: string
): Promise<AgentMemory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .eq('type', 'procedural')
    .order('importance', { ascending: false })
    .limit(10)

  if (error || !data) return []

  const memories = (data as AgentMemoryRow[]).map(rowToMemory)

  const capabilityLower = capability.toLowerCase()
  return memories.filter(m =>
    m.content.toLowerCase().includes(capabilityLower) ||
    m.importance >= 0.6
  )
}

// ──────────────────────────────────────────────────────────────
// summarizeMemories — AI-generated summary of all memory
// ──────────────────────────────────────────────────────────────

export async function summarizeMemories(
  agentId: string,
  context?: AgentContext
): Promise<string> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .order('importance', { ascending: false })
    .limit(50)

  const memories = (data as AgentMemoryRow[] | null)?.map(rowToMemory) ?? []

  if (memories.length === 0) return 'No memories stored.'

  const memorySummary = memories.map(m =>
    `[${m.type}][importance:${m.importance.toFixed(2)}] ${m.content.substring(0, 200)}`
  ).join('\n')

  const prompt = `Summarize the following agent memories into a concise overview:

${memorySummary}

Provide a brief summary covering:
1. Key facts learned (semantic)
2. Recent significant events (episodic)
3. Known procedures and skills (procedural)
4. Current concerns or priorities

Keep the summary under 500 words.`

  const response = await executeStructuredAI<{ summary: string }>(
    {
      prompt,
      systemPrompt: 'You are a memory summarization system. Produce concise, structured summaries.',
      userId: context?.userId ?? 'system',
      schoolId: context?.schoolId ?? null,
      temperature: 0.3,
      maxTokens: 1024,
    },
    (raw) => {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      return { summary: d.summary ?? '' }
    }
  )

  return response.parsed.summary || memorySummary.substring(0, 1000)
}

// ──────────────────────────────────────────────────────────────
// pruneExpiredMemories — Remove old memories beyond max age
// ──────────────────────────────────────────────────────────────

export async function pruneExpiredMemories(
  agentId: string,
  maxAge: number // in days
): Promise<number> {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - maxAge * 86400000).toISOString()

  // Only prune low-importance memories beyond max age
  const { data, error } = await supabase
    .from('agent_memories')
    .delete()
    .eq('agent_id', agentId)
    .lt('created_at', cutoff)
    .lt('importance', 0.5)
    .select('id')

  if (error) return 0
  return data?.length ?? 0
}

// ──────────────────────────────────────────────────────────────
// getMemoryCount — Count of memories for an agent
// ──────────────────────────────────────────────────────────────

export async function getMemoryCount(agentId: string): Promise<{ total: number; byType: Record<MemoryType, number> }> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_memories')
    .select('type')
    .eq('agent_id', agentId)

  const rows = data ?? []
  const byType: Record<MemoryType, number> = { episodic: 0, semantic: 0, procedural: 0 }
  for (const row of rows) {
    const t = row.type as MemoryType
    if (t in byType) byType[t]++
  }

  return { total: rows.length, byType }
}
