// ============================================================================
// ExamForge AI Ω-15 — AI tracking visibility unit tests
// ============================================================================
// Regression lock for the checkpoint defect: every tracking write to
// ai_generation_requests (insert + completion/failure updates) used to fail
// SILENTLY when the live schema lacked the engine's columns (pre-migration
// 008). The contract now: tracking failures are logged, never swallowed.
// These tests mock the Supabase client so the DB paths fail deterministically
// and assert the engine still completes its primary mission (or reports its
// error) while emitting the visibility warnings.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the server Supabase client before importing the engine ──
// Chain shape used by the engine:
//   insert(...)  → awaited directly → { error }
//   update(...)  → .eq('id', ...) → awaited → { error }
let insertError: { message: string; code?: string } | null = null
let updateError: { message: string; code?: string } | null = null
const mockFrom = vi.fn(() => ({
  insert: vi.fn(async () => ({ error: insertError })),
  update: vi.fn(() => ({
    eq: vi.fn(async () => ({ error: updateError })),
  })),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}))

// ── Mock the SDK so no network is made ──
const mockCreate = vi.fn()
vi.mock('z-ai-web-dev-sdk', () => ({
  default: { create: mockCreate },
}))

import { executeAI } from '../ai-engine'

describe('AI tracking visibility (Ω-15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertError = null
    updateError = null
  })

  it('logs a warning when the tracking INSERT fails (missing columns) instead of swallowing it', async () => {
    // Insert fails with the exact PostgREST error class seen on the live DB
    insertError = { message: 'column ai_generation_requests.user_id does not exist', code: '42703' }
    updateError = null
    mockCreate.mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn(async () => ({
            choices: [{ message: { content: 'mocked AI content' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          })),
        },
      },
    })

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const response = await executeAI({
      prompt: 'test prompt',
      userId: 'user-1',
      schoolId: 'school-1',
    })

    // Primary mission unaffected: content returned, cost computed
    expect(response.content).toBe('mocked AI content')
    expect(response.tokensInput).toBe(10)
    expect(response.costUsd).toBeGreaterThan(0)

    // Visibility contract: the insert failure was logged
    const insertWarnings = warn.mock.calls.filter(c =>
      String(c[0]).includes('generation tracking insert failed')
    )
    expect(insertWarnings.length).toBe(1)
    expect(String(insertWarnings[0][1])).toContain('user_id')

    warn.mockRestore()
  })

  it('logs a warning when the tracking COMPLETION update fails', async () => {
    insertError = null
    updateError = { message: 'column ai_generation_requests.cost_usd does not exist', code: '42703' }
    mockCreate.mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn(async () => ({
            choices: [{ message: { content: 'ok' } }],
            usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
          })),
        },
      },
    })

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const response = await executeAI({ prompt: 'p', userId: 'u' })
    expect(response.content).toBe('ok')

    const completionWarnings = warn.mock.calls.filter(c =>
      String(c[0]).includes('generation completion update failed')
    )
    expect(completionWarnings.length).toBe(1)

    warn.mockRestore()
  })

  it('still reports the AI error (throw) when the SDK call itself fails', async () => {
    insertError = null
    updateError = null
    mockCreate.mockResolvedValue({
      chat: { completions: { create: vi.fn(async () => { throw new Error('boom') }) } },
    })

    await expect(
      executeAI({ prompt: 'p', userId: 'u' })
    ).rejects.toThrow('AI generation failed: boom')
  })
})
